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
    topicId: 't-1',
    topic: { topicId: 't-1', content: 'topic' },
    tags: [
        { tagId: 'tg-x', type: 'species', content: 'fox' },
        { tagId: 'tg-y', type: 'hobby', content: '高雄' },
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
        expect(wrapper.text()).toContain('fox')
        expect(wrapper.text()).toContain('高雄')
        expect(wrapper.find('a[href="https://twitter.com/foxy"]').exists()).toBe(true)
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
