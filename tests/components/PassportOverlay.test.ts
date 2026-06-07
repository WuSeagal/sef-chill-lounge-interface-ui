import { describe, it, expect, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import PassportOverlay from '@/components/PassportOverlay.vue'
import { TagType, type Tag } from '@/types/user'

const exportSpy = vi.fn(() => Promise.resolve())
vi.mock('@/utils/exportPassport', () => ({
    exportPassportToPng: (...a: unknown[]) => exportSpy(...a),
    buildPassportFileName: () => 'passport-foo.png',
}))

const tags: Tag[] = [
    { tagId: 'l1', type: TagType.LANGUAGE, content: 'Java', isCustom: false },
]
const baseProps = {
    open: true,
    furName: 'Foxy',
    avatarSrc: '/a.png',
    tags,
    socials: [{ platform: 'X', links: 'https://x.com/a' }],
    stickers: ['/s1.png', '/s2.png'],
}

function mountOverlay(props = {}) {
    return mount(PassportOverlay, { props: { ...baseProps, ...props }, attachTo: document.body })
}

afterEach(() => {
    document.body.style.overflow = ''
})

describe('PassportOverlay', () => {
    it('teleports a full passport to body when open', () => {
        const wrapper = mountOverlay()
        expect(document.body.querySelector('.passport-overlay')).not.toBeNull()
        expect(document.body.querySelector('.passport')).not.toBeNull()
        wrapper.unmount()
    })

    it('renders nothing when open=false', () => {
        const wrapper = mountOverlay({ open: false })
        expect(document.body.querySelector('.passport-overlay')).toBeNull()
        wrapper.unmount()
    })

    it('locks body scroll while open and restores on unmount', () => {
        const wrapper = mountOverlay()
        expect(document.body.style.overflow).toBe('hidden')
        wrapper.unmount()
        expect(document.body.style.overflow).toBe('')
    })

    it('emits close on close button click', async () => {
        const wrapper = mountOverlay()
        const btn = document.body.querySelector('.passport-overlay__close') as HTMLElement
        btn.click()
        await wrapper.vm.$nextTick()
        expect(wrapper.emitted('close')).toBeTruthy()
        wrapper.unmount()
    })

    it('emits close on Escape', async () => {
        const wrapper = mountOverlay()
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
        await wrapper.vm.$nextTick()
        expect(wrapper.emitted('close')).toBeTruthy()
        wrapper.unmount()
    })

    it('opens an ImageLightbox when a sticker is clicked', async () => {
        const wrapper = mountOverlay()
        const sticker = document.body.querySelector('.ps-sticker') as HTMLElement
        sticker.click()
        await wrapper.vm.$nextTick()
        await wrapper.vm.$nextTick()
        expect(document.body.querySelector('.image-lightbox')).not.toBeNull()
        wrapper.unmount()
    })

    it('does NOT emit close on Escape while the inner sticker lightbox is open', async () => {
        const wrapper = mountOverlay()
        ;(document.body.querySelector('.ps-sticker') as HTMLElement).click()
        await wrapper.vm.$nextTick()
        await wrapper.vm.$nextTick()
        expect(document.body.querySelector('.image-lightbox')).not.toBeNull()
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
        await wrapper.vm.$nextTick()
        // 內層 lightbox 開著時，Escape 應由 lightbox 處理，不關整個放大護照
        expect(wrapper.emitted('close')).toBeFalsy()
        wrapper.unmount()
    })

    it('opens an ImageLightbox when the avatar is clicked', async () => {
        const wrapper = mountOverlay()
        const avatar = document.body.querySelector('.ps-photo') as HTMLElement
        expect(avatar.getAttribute('role')).toBe('button')
        avatar.click()
        await wrapper.vm.$nextTick()
        await wrapper.vm.$nextTick()
        expect(document.body.querySelector('.image-lightbox')).not.toBeNull()
        wrapper.unmount()
    })

    it('does NOT emit close on Escape while the avatar lightbox is open', async () => {
        const wrapper = mountOverlay()
        ;(document.body.querySelector('.ps-photo') as HTMLElement).click()
        await wrapper.vm.$nextTick()
        await wrapper.vm.$nextTick()
        expect(document.body.querySelector('.image-lightbox')).not.toBeNull()
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
        await wrapper.vm.$nextTick()
        expect(wrapper.emitted('close')).toBeFalsy()
        wrapper.unmount()
    })

    it('restores focus to the element focused before open, when closed via prop', async () => {
        const trigger = document.createElement('button')
        document.body.appendChild(trigger)
        const wrapper = mountOverlay({ open: false })
        trigger.focus()
        expect(document.activeElement).toBe(trigger)
        await wrapper.setProps({ open: true })
        await wrapper.vm.$nextTick()
        await wrapper.setProps({ open: false })
        await wrapper.vm.$nextTick()
        expect(document.activeElement).toBe(trigger)
        wrapper.unmount()
        trigger.remove()
    })

    it('restores focus on unmount (the /chat path where the overlay is v-if removed)', async () => {
        const trigger = document.createElement('button')
        document.body.appendChild(trigger)
        trigger.focus()
        const wrapper = mountOverlay({ open: true })
        await wrapper.vm.$nextTick()
        wrapper.unmount()
        expect(document.activeElement).toBe(trigger)
        trigger.remove()
    })

    it('does NOT show the save button by default', () => {
        const wrapper = mountOverlay()
        expect(document.body.querySelector('.passport-overlay__save')).toBeNull()
        wrapper.unmount()
    })

    it('shows the save button when exportable and triggers export on click', async () => {
        exportSpy.mockClear()
        const wrapper = mountOverlay({ exportable: true })
        const btn = document.body.querySelector('.passport-overlay__save') as HTMLElement
        expect(btn).not.toBeNull()
        btn.click()
        await wrapper.vm.$nextTick()
        expect(exportSpy).toHaveBeenCalledTimes(1)
        wrapper.unmount()
    })
})
