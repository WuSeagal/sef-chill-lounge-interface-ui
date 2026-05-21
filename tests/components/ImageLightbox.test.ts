import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ImageLightbox from '@/components/ImageLightbox.vue'

describe('ImageLightbox', () => {
    it('renders nothing when open is false', () => {
        const wrapper = mount(ImageLightbox, {
            props: { open: false, imageUrl: '/mock-images/chat-image-1.jpg' },
        })
        expect(wrapper.find('.image-lightbox').exists()).toBe(false)
    })

    it('renders backdrop and img when open is true', () => {
        const wrapper = mount(ImageLightbox, {
            props: { open: true, imageUrl: '/mock-images/chat-image-1.jpg' },
        })
        expect(wrapper.find('.image-lightbox').exists()).toBe(true)
        const img = wrapper.find('.image-lightbox__img')
        expect(img.exists()).toBe(true)
        expect(img.attributes('src')).toBe('/mock-images/chat-image-1.jpg')
    })

    it('renders nothing when open is true but imageUrl is null', () => {
        const wrapper = mount(ImageLightbox, {
            props: { open: true, imageUrl: null },
        })
        expect(wrapper.find('.image-lightbox').exists()).toBe(false)
    })

    it('emits close when backdrop is clicked', async () => {
        const wrapper = mount(ImageLightbox, {
            props: { open: true, imageUrl: '/mock-images/chat-image-1.jpg' },
        })
        await wrapper.find('.image-lightbox').trigger('click')
        expect(wrapper.emitted('close')).toBeTruthy()
        expect(wrapper.emitted('close')!.length).toBe(1)
    })

    it('does NOT emit close when the image itself is clicked (event stops at the img)', async () => {
        const wrapper = mount(ImageLightbox, {
            props: { open: true, imageUrl: '/mock-images/chat-image-1.jpg' },
        })
        await wrapper.find('.image-lightbox__img').trigger('click')
        expect(wrapper.emitted('close')).toBeFalsy()
    })

    it('emits close on ESC keydown (when open)', async () => {
        const wrapper = mount(ImageLightbox, {
            props: { open: true, imageUrl: '/mock-images/chat-image-1.jpg' },
            attachTo: document.body,
        })
        const event = new KeyboardEvent('keydown', { key: 'Escape' })
        window.dispatchEvent(event)
        await wrapper.vm.$nextTick()
        expect(wrapper.emitted('close')).toBeTruthy()
        wrapper.unmount()
    })
})
