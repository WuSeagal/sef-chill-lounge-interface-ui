import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import UserPopup from '@/components/UserPopup.vue'

vi.mock('@/api/userApi', () => ({
    fetchProfileDetail: vi.fn(),
}))

import { fetchProfileDetail } from '@/api/userApi'

const sampleProfile = {
    userId: 'u-102',
    username: 'Foxy',
    furName: 'FoxyFur',
    avatar: '/mock-images/avatar-default.png',
    avatarColor: '#b56b3c',
    avatarBorder: true,
    topicId: 't-1',
    topic: { topicId: 't-1', content: 'topic' },
    tags: [
        { tagId: 'tg-x', type: 'LANGUAGE', content: 'Java', isCustom: false },
        { tagId: 'tg-y', type: 'CUSTOM', content: '露營', isCustom: true },
    ],
    socials: [{ id: 1, platform: 'twitter', links: 'https://twitter.com/foxy' }],
    stickers: [],
}

describe('UserPopup', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        ;(fetchProfileDetail as any).mockResolvedValue(sampleProfile)
    })

    it('renders nothing when open=false', () => {
        const wrapper = mount(UserPopup, { props: { open: false, userId: 'u-102' } })
        expect(wrapper.find('.user-popup').exists()).toBe(false)
    })

    it('renders nothing when userId is null', () => {
        const wrapper = mount(UserPopup, { props: { open: true, userId: null } })
        expect(wrapper.find('.user-popup').exists()).toBe(false)
    })

    it('fetches and renders furName, tags, social links when open with userId', async () => {
        const wrapper = mount(UserPopup, { props: { open: true, userId: 'u-102' } })
        await flushPromises()
        expect(fetchProfileDetail).toHaveBeenCalledWith('u-102')
        expect(wrapper.find('.user-popup').exists()).toBe(true)
        expect(wrapper.text()).toContain('FoxyFur')
        expect(wrapper.text()).toContain('Java')
        expect(wrapper.text()).toContain('露營')
        expect(wrapper.find('a[href="https://twitter.com/foxy"]').exists()).toBe(true)
    })

    it('renders avatar with color ring to the left of nickname', async () => {
        const wrapper = mount(UserPopup, { props: { open: true, userId: 'u-102' } })
        await flushPromises()
        const header = wrapper.find('.user-popup__header')
        expect(header.exists()).toBe(true)
        const children = header.element.children
        expect(children[0].classList.contains('user-popup__avatar')).toBe(true)
        expect(children[1].classList.contains('user-popup__nickname')).toBe(true)
        const style = wrapper.find('.user-popup__avatar').attributes('style') ?? ''
        expect(style).toContain('box-shadow')
        expect(style).toContain('#b56b3c')
    })

    it('renders no ring on popup avatar when avatarBorder is off', async () => {
        ;(fetchProfileDetail as any).mockResolvedValue({ ...sampleProfile, avatarBorder: false })
        const wrapper = mount(UserPopup, { props: { open: true, userId: 'u-102' } })
        await flushPromises()
        const style = wrapper.find('.user-popup__avatar').attributes('style') ?? ''
        expect(style).not.toContain('box-shadow')
    })

    it('renders TAG block with only non-empty grouped rows', async () => {
        const wrapper = mount(UserPopup, { props: { open: true, userId: 'u-102' } })
        await flushPromises()
        // sample profile 有 LANGUAGE + CUSTOM 共 2 個 tag,所以只渲染 2 行
        const rows = wrapper.findAll('.user-popup__tag-row')
        expect(rows).toHaveLength(2)
        const labels = wrapper.findAll('.user-popup__tag-row-label')
        expect(labels).toHaveLength(1)   // LANGUAGE 有 label「我寫」,CUSTOM 沒 label
        expect(labels[0].text()).toBe('我寫')
    })

    it('hides TAG block when user has no tags', async () => {
        ;(fetchProfileDetail as any).mockResolvedValue({ ...sampleProfile, tags: [] })
        const wrapper = mount(UserPopup, { props: { open: true, userId: 'u-102' } })
        await flushPromises()
        expect(wrapper.find('.user-popup__tag-block').exists()).toBe(false)
    })

    it('shows error message when fetch fails', async () => {
        ;(fetchProfileDetail as any).mockRejectedValue({
            response: { data: { message: 'profile_not_found' } },
        })
        const wrapper = mount(UserPopup, { props: { open: true, userId: 'u-x' } })
        await flushPromises()
        expect(wrapper.text()).toContain('profile_not_found')
    })

    it('emits close on ESC keydown', async () => {
        const wrapper = mount(UserPopup, {
            props: { open: true, userId: 'u-102' },
            attachTo: document.body,
        })
        await flushPromises()
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
        await wrapper.vm.$nextTick()
        expect(wrapper.emitted('close')).toBeTruthy()
        wrapper.unmount()
    })

    it('emits close when an outside click occurs', async () => {
        const wrapper = mount(UserPopup, {
            props: { open: true, userId: 'u-102' },
            attachTo: document.body,
        })
        await flushPromises()
        const outside = document.createElement('div')
        document.body.appendChild(outside)
        outside.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        await wrapper.vm.$nextTick()
        expect(wrapper.emitted('close')).toBeTruthy()
        outside.remove()
        wrapper.unmount()
    })

    it('does NOT emit close when the popup itself is clicked', async () => {
        const wrapper = mount(UserPopup, {
            props: { open: true, userId: 'u-102' },
            attachTo: document.body,
        })
        await flushPromises()
        await wrapper.find('.user-popup').trigger('click')
        expect(wrapper.emitted('close')).toBeFalsy()
        wrapper.unmount()
    })
})
