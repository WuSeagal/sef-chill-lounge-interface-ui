import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import UserPopup from '@/components/UserPopup.vue'
import type { MockUser } from '@/mocks/mockUser'

const sampleMember: MockUser = {
    id: 'u-102',
    nickname: 'Foxy',
    avatarUrl: '/mock-images/avatar-default.png',
    avatarBgColor: '#b56b3c',
    tags: ['fox', '高雄'],
    socialLinks: [{ platform: 'twitter', url: 'https://twitter.com/foxy' }],
    stickers: [],
    topicCard: { id: 'c', topicId: 't', content: 'x' },
    donateUrl: '',
}

describe('UserPopup', () => {
    it('renders nothing when open=false', () => {
        const wrapper = mount(UserPopup, {
            props: { open: false, member: sampleMember },
        })
        expect(wrapper.find('.user-popup').exists()).toBe(false)
    })

    it('renders nothing when member is null', () => {
        const wrapper = mount(UserPopup, {
            props: { open: true, member: null },
        })
        expect(wrapper.find('.user-popup').exists()).toBe(false)
    })

    it('renders nickname, tags, and social links when open with a member', () => {
        const wrapper = mount(UserPopup, {
            props: { open: true, member: sampleMember },
        })
        expect(wrapper.find('.user-popup').exists()).toBe(true)
        expect(wrapper.text()).toContain('Foxy')
        expect(wrapper.text()).toContain('fox')
        expect(wrapper.text()).toContain('高雄')
        const link = wrapper.find('a[href="https://twitter.com/foxy"]')
        expect(link.exists()).toBe(true)
    })

    it('emits close on ESC keydown', async () => {
        const wrapper = mount(UserPopup, {
            props: { open: true, member: sampleMember },
            attachTo: document.body,
        })
        const event = new KeyboardEvent('keydown', { key: 'Escape' })
        window.dispatchEvent(event)
        await wrapper.vm.$nextTick()
        expect(wrapper.emitted('close')).toBeTruthy()
        wrapper.unmount()
    })

    it('emits close when an outside click occurs', async () => {
        const wrapper = mount(UserPopup, {
            props: { open: true, member: sampleMember },
            attachTo: document.body,
        })

        // Click directly on a node outside the popup root
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
            props: { open: true, member: sampleMember },
            attachTo: document.body,
        })
        await wrapper.find('.user-popup').trigger('click')
        expect(wrapper.emitted('close')).toBeFalsy()
        wrapper.unmount()
    })
})
