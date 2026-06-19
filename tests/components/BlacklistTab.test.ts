import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import type { Member } from '@/types/user'
import type { BlacklistEntry } from '@/types/blacklist'
import { HOST_PROVIDER_USER_ID } from '@/utils/host'

// --- mocks ---
const fetchBlacklistMock = vi.fn()
const banUserMock = vi.fn()
const removeFromBlacklistMock = vi.fn()
vi.mock('@/api/blacklistApi', () => ({
    fetchBlacklist: (...a: unknown[]) => fetchBlacklistMock(...a),
    banUser: (...a: unknown[]) => banUserMock(...a),
    removeFromBlacklist: (...a: unknown[]) => removeFromBlacklistMock(...a),
}))

const membersRef = ref<Member[]>([])
const refetchMembersSpy = vi.fn(async () => {})
vi.mock('@/composables/useMembers', () => ({
    useMembers: () => ({
        members: membersRef,
        loading: ref(false),
        error: ref<string | null>(null),
        refetch: refetchMembersSpy,
    }),
}))

vi.mock('notivue', () => ({ push: { error: vi.fn(), success: vi.fn() } }))

import BlacklistTab from '@/components/BlacklistTab.vue'

const MEMBERS: Member[] = [
    { userId: 'u-1', username: 'foxdev', furName: '小狐狸', avatar: null, avatarColor: null },
    { userId: 'u-2', username: 'capy', furName: '水豚君', avatar: null, avatarColor: null },
]

const BLACKLIST: BlacklistEntry[] = [
    { userId: 'u-9', furName: '壞蛋', username: 'baddie' },
]

describe('BlacklistTab', () => {
    beforeEach(() => {
        membersRef.value = [...MEMBERS]
        refetchMembersSpy.mockReset().mockResolvedValue(undefined)
        fetchBlacklistMock.mockReset().mockResolvedValue([...BLACKLIST])
        banUserMock.mockReset().mockResolvedValue(undefined)
        removeFromBlacklistMock.mockReset().mockResolvedValue(undefined)
    })

    it('mount 時載入目前黑名單並渲染（furName + username）', async () => {
        const wrapper = mount(BlacklistTab)
        await flushPromises()
        expect(fetchBlacklistMock).toHaveBeenCalled()
        const text = wrapper.text()
        expect(text).toContain('壞蛋')
        expect(text).toContain('baddie')
    })

    it('輸入觸發候選清單，每筆顯示 furName + 小字 username', async () => {
        const wrapper = mount(BlacklistTab)
        await flushPromises()

        await wrapper.find('[data-test="blacklist-input"]').setValue('狐')
        await nextTick()

        const options = wrapper.findAll('[data-test^="blacklist-candidate-"]')
        expect(options.length).toBe(1)
        expect(options[0].text()).toContain('小狐狸')
        // username 以較小字體呈現於候選 item 內
        expect(options[0].find('.blacklist-tab__candidate-username').text()).toContain('foxdev')
    })

    it('未從候選選定（純文字對不到 member）時送出鈕停用', async () => {
        const wrapper = mount(BlacklistTab)
        await flushPromises()

        await wrapper.find('[data-test="blacklist-input"]').setValue('不存在的人')
        await nextTick()

        expect(wrapper.find('[data-test="blacklist-submit"]').attributes('disabled')).toBeDefined()
    })

    it('從候選選定後以該 member 的 userId 送出封禁，並刷新清單', async () => {
        const wrapper = mount(BlacklistTab)
        await flushPromises()

        await wrapper.find('[data-test="blacklist-input"]').setValue('狐')
        await nextTick()
        await wrapper.find('[data-test="blacklist-candidate-u-1"]').trigger('mousedown')
        await nextTick()

        expect(wrapper.find('[data-test="blacklist-submit"]').attributes('disabled')).toBeUndefined()

        // 送出前讓刷新回傳含新封禁者的清單
        fetchBlacklistMock.mockResolvedValue([
            ...BLACKLIST,
            { userId: 'u-1', furName: '小狐狸', username: 'foxdev' },
        ])

        await wrapper.find('[data-test="blacklist-submit"]').trigger('click')
        await flushPromises()

        expect(banUserMock).toHaveBeenCalledWith('u-1')
        expect(fetchBlacklistMock).toHaveBeenCalledTimes(2) // mount + 封禁後刷新
        expect(wrapper.text()).toContain('小狐狸')
    })

    it('逐一解封：點解封呼叫 removeFromBlacklist 並刷新後移除該筆', async () => {
        const wrapper = mount(BlacklistTab)
        await flushPromises()
        expect(wrapper.text()).toContain('壞蛋')

        // 解封後刷新回傳空清單
        fetchBlacklistMock.mockResolvedValue([])

        await wrapper.find('[data-test="blacklist-unban-u-9"]').trigger('click')
        await flushPromises()

        expect(removeFromBlacklistMock).toHaveBeenCalledWith('u-9')
        expect(wrapper.text()).not.toContain('壞蛋')
    })

    it('host 不應出現在候選（究極保護：host 不能自 ban）', async () => {
        membersRef.value = [
            ...MEMBERS,
            { userId: HOST_PROVIDER_USER_ID, username: 'hostguy', furName: '主持人', avatar: null, avatarColor: null },
        ]
        const wrapper = mount(BlacklistTab)
        await flushPromises()

        await wrapper.find('[data-test="blacklist-input"]').setValue('主持')
        await nextTick()

        expect(wrapper.find(`[data-test="blacklist-candidate-${HOST_PROVIDER_USER_ID}"]`).exists()).toBe(false)
    })

    it('已在黑名單的 member 不應出現在候選（避免重複封禁）', async () => {
        // u-2 已被封禁
        fetchBlacklistMock.mockResolvedValue([{ userId: 'u-2', furName: '水豚君', username: 'capy' }])
        const wrapper = mount(BlacklistTab)
        await flushPromises()

        await wrapper.find('[data-test="blacklist-input"]').setValue('豚')
        await nextTick()

        expect(wrapper.find('[data-test="blacklist-candidate-u-2"]').exists()).toBe(false)
    })
})
