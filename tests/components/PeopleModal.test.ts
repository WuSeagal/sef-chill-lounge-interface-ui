import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import PeopleModal from '@/components/PeopleModal.vue'
import type { Member } from '@/types/user'

// 受控的 useMembers mock：以可變 refs 模擬名單/載入/錯誤狀態。
vi.mock('@/composables/useMembers', async () => {
    const { ref } = await import('vue')
    const members = ref<Member[]>([])
    const loading = ref(false)
    const error = ref<string | null>(null)
    const refetch = vi.fn()
    return {
        useMembers: () => ({ members, loading, error, refetch }),
        __state: { members, loading, error, refetch },
    }
})

import * as useMembersMod from '@/composables/useMembers'
const state = (useMembersMod as unknown as { __state: {
    members: { value: Member[] }
    loading: { value: boolean }
    error: { value: string | null }
    refetch: ReturnType<typeof vi.fn>
} }).__state

function member(id: string, furName: string, tags: Member['tags'] = []): Member {
    return { userId: id, username: id, furName, avatar: null, avatarColor: null, tags }
}

beforeEach(() => {
    state.members.value = []
    state.loading.value = false
    state.error.value = null
    state.refetch.mockReset()
})

afterEach(() => {
    document.body.innerHTML = ''
})

describe('PeopleModal', () => {
    it('open=false 不渲染 modal', () => {
        mount(PeopleModal, { props: { open: false } })
        expect(document.querySelector('[data-test="people-modal"]')).toBeNull()
    })

    it('open 時 refetch 並渲染成員的頭像名稱與 TAG', async () => {
        state.members.value = [member('u1', '小蜥蜴', [{ tagId: 't1', type: 'ROLE', content: '後端', isCustom: false }])]
        const wrapper = mount(PeopleModal, { props: { open: true } })
        await flushPromises()

        expect(state.refetch).toHaveBeenCalled()
        const text = document.body.textContent ?? ''
        expect(text).toContain('小蜥蜴')
        expect(text).toContain('後端')
        wrapper.unmount()
    })

    it('在線成員優先排序、離線成員淡化', async () => {
        state.members.value = [
            member('off1', 'Off1'),
            member('on1', 'On1'),
            member('off2', 'Off2'),
            member('on2', 'On2'),
        ]
        const wrapper = mount(PeopleModal, { props: { open: true, onlineIds: ['on1', 'on2'] } })
        await flushPromises()

        const names = Array.from(document.querySelectorAll('.people-row__name')).map((n) => n.textContent)
        expect(names.slice(0, 2)).toEqual(['On1', 'On2']) // 在線優先（保留原順序）
        expect(document.querySelectorAll('.people-row--offline').length).toBe(2) // 離線淡化（不用綠點，純淡色區別）
        wrapper.unmount()
    })

    it('每頁 50 人、可換頁', async () => {
        state.members.value = Array.from({ length: 60 }, (_, i) => member(`u${i}`, `name${i}`))
        const wrapper = mount(PeopleModal, { props: { open: true } })
        await flushPromises()

        expect(document.querySelectorAll('.people-row').length).toBe(50)
        // 換到下一頁 → 剩 10
        const nextBtn = document.querySelector('[aria-label="下一頁"]') as HTMLButtonElement
        nextBtn.click()
        await flushPromises()
        expect(document.querySelectorAll('.people-row').length).toBe(10)
        wrapper.unmount()
    })

    it('依顯示名稱搜尋並回到第 1 頁', async () => {
        state.members.value = [
            member('u1', 'Alice'),
            member('u2', 'Bob'),
            member('u3', 'alicia'),
        ]
        const wrapper = mount(PeopleModal, { props: { open: true } })
        await flushPromises()

        const input = document.querySelector('.people-modal__search') as HTMLInputElement
        input.value = 'ali'
        input.dispatchEvent(new Event('input'))
        await flushPromises()

        const names = Array.from(document.querySelectorAll('.people-row__name')).map(n => n.textContent)
        expect(names).toEqual(['Alice', 'alicia']) // case-insensitive、Bob 被濾掉
        wrapper.unmount()
    })

    it('無命中顯示空狀態', async () => {
        state.members.value = [member('u1', 'Alice')]
        const wrapper = mount(PeopleModal, { props: { open: true } })
        await flushPromises()
        const input = document.querySelector('.people-modal__search') as HTMLInputElement
        input.value = 'zzz'
        input.dispatchEvent(new Event('input'))
        await flushPromises()
        expect(document.body.textContent).toContain('找不到符合的成員')
        wrapper.unmount()
    })

    it('載入失敗顯示錯誤', async () => {
        state.error.value = '載入成員列表失敗'
        const wrapper = mount(PeopleModal, { props: { open: true } })
        await flushPromises()
        expect(document.body.textContent).toContain('載入成員列表失敗')
        wrapper.unmount()
    })

    it('點成員 emit select(userId)', async () => {
        state.members.value = [member('u-x', 'X')]
        const wrapper = mount(PeopleModal, { props: { open: true } })
        await flushPromises()
        ;(document.querySelector('.people-row') as HTMLButtonElement).click()
        await flushPromises()
        expect(wrapper.emitted('select')?.[0]).toEqual(['u-x'])
        wrapper.unmount()
    })

    it('X / 點遮罩外 / Esc 皆 emit close', async () => {
        state.members.value = [member('u1', 'A')]
        const wrapper = mount(PeopleModal, { props: { open: true } })
        await flushPromises()

        ;(document.querySelector('.people-modal__close') as HTMLButtonElement).click()
        expect(wrapper.emitted('close')?.length).toBe(1)

        ;(document.querySelector('[data-test="people-modal"]') as HTMLElement).click() // backdrop (self)
        expect(wrapper.emitted('close')?.length).toBe(2)

        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
        expect(wrapper.emitted('close')?.length).toBe(3)
        wrapper.unmount()
    })

    it('具 role=dialog / aria-modal 無障礙屬性', async () => {
        state.members.value = [member('u1', 'A')]
        const wrapper = mount(PeopleModal, { props: { open: true } })
        await flushPromises()
        const dialog = document.querySelector('.people-modal__panel') as HTMLElement
        expect(dialog.getAttribute('role')).toBe('dialog')
        expect(dialog.getAttribute('aria-modal')).toBe('true')
        wrapper.unmount()
    })
})
