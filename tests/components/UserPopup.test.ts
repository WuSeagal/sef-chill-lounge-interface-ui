import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
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
    socials: [
        { id: 1, platform: 'X', links: 'https://x.com/foxy' },
        { id: 2, platform: 'legacyfoo', links: 'https://legacyfoo.example.com/foxy' },
    ],
    stickers: [{ id: 1, sticker: '/image/sticker-a.png' }],
}

describe('UserPopup (passport overlay)', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        ;(fetchProfileDetail as any).mockResolvedValue(sampleProfile)
    })
    afterEach(() => {
        document.body.style.overflow = ''
    })

    it('renders nothing when open=false', () => {
        const wrapper = mount(UserPopup, { props: { open: false, userId: 'u-102' }, attachTo: document.body })
        expect(document.body.querySelector('.passport-overlay')).toBeNull()
        wrapper.unmount()
    })

    it('renders nothing when userId is null', () => {
        const wrapper = mount(UserPopup, { props: { open: true, userId: null }, attachTo: document.body })
        expect(document.body.querySelector('.passport-overlay')).toBeNull()
        wrapper.unmount()
    })

    it('fetches and renders the passport overlay with furName, grouped tags, social link, sticker', async () => {
        const wrapper = mount(UserPopup, { props: { open: true, userId: 'u-102' }, attachTo: document.body })
        await flushPromises()
        await wrapper.vm.$nextTick()
        expect(fetchProfileDetail).toHaveBeenCalledWith('u-102')
        const overlay = document.body.querySelector('.passport-overlay')
        expect(overlay).not.toBeNull()
        expect(overlay!.textContent).toContain('FoxyFur')
        expect(overlay!.textContent).toContain('Java')
        expect(overlay!.textContent).toContain('露營')
        // 我寫 prefix row for LANGUAGE
        expect(overlay!.textContent).toContain('我寫')
        // social link present and clickable
        expect(document.body.querySelector('a.ps-social-link[href="https://x.com/foxy"]')).not.toBeNull()
        // sticker rendered
        expect(document.body.querySelector('.ps-sticker')).not.toBeNull()
        wrapper.unmount()
    })

    it('shows error message when fetch fails', async () => {
        ;(fetchProfileDetail as any).mockRejectedValue({
            response: { data: { message: 'profile_not_found' } },
        })
        const wrapper = mount(UserPopup, { props: { open: true, userId: 'u-x' }, attachTo: document.body })
        await flushPromises()
        expect(document.body.textContent).toContain('profile_not_found')
        wrapper.unmount()
    })

    it('forwards close from the overlay (e.g. Escape) to the parent', async () => {
        const wrapper = mount(UserPopup, { props: { open: true, userId: 'u-102' }, attachTo: document.body })
        await flushPromises()
        await wrapper.vm.$nextTick()
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
        await wrapper.vm.$nextTick()
        expect(wrapper.emitted('close')).toBeTruthy()
        wrapper.unmount()
    })

    it('clicking a sticker opens the ImageLightbox', async () => {
        const wrapper = mount(UserPopup, { props: { open: true, userId: 'u-102' }, attachTo: document.body })
        await flushPromises()
        await wrapper.vm.$nextTick()
        ;(document.body.querySelector('.ps-sticker') as HTMLElement).click()
        await wrapper.vm.$nextTick()
        await wrapper.vm.$nextTick()
        expect(document.body.querySelector('.image-lightbox')).not.toBeNull()
        wrapper.unmount()
    })
})
