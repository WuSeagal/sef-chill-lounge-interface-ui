import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import EmojiPicker from '@/components/EmojiPicker.vue'
import { EMOJI_CATEGORIES } from '@/components/emojiCategories'

describe('EmojiPicker', () => {
    it('renders nothing when open=false', () => {
        const wrapper = mount(EmojiPicker, { props: { open: false } })
        expect(wrapper.find('.emoji-picker').exists()).toBe(false)
    })

    it('renders one tab per category when open=true', () => {
        const wrapper = mount(EmojiPicker, { props: { open: true } })
        const tabs = wrapper.findAll('.emoji-picker__tab')
        expect(tabs.length).toBe(EMOJI_CATEGORIES.length)
    })

    it('starts on the first category and renders its emojis', () => {
        const wrapper = mount(EmojiPicker, { props: { open: true } })
        const first = EMOJI_CATEGORIES[0]
        expect(wrapper.find('.emoji-picker__title').text()).toBe(first.label)
        const items = wrapper.findAll('.emoji-picker__item')
        expect(items.length).toBe(first.emojis.length)
        expect(items[0].text()).toBe(first.emojis[0])
    })

    it('clicking a different tab switches the active category', async () => {
        const wrapper = mount(EmojiPicker, { props: { open: true } })
        const tabs = wrapper.findAll('.emoji-picker__tab')
        const second = EMOJI_CATEGORIES[1]
        await tabs[1].trigger('click')
        expect(wrapper.find('.emoji-picker__title').text()).toBe(second.label)
        const items = wrapper.findAll('.emoji-picker__item')
        expect(items[0].text()).toBe(second.emojis[0])
    })

    it('marks the active tab with emoji-picker__tab--active', async () => {
        const wrapper = mount(EmojiPicker, { props: { open: true } })
        const tabs = wrapper.findAll('.emoji-picker__tab')
        expect(tabs[0].classes()).toContain('emoji-picker__tab--active')
        expect(tabs[1].classes()).not.toContain('emoji-picker__tab--active')
        await tabs[1].trigger('click')
        expect(tabs[0].classes()).not.toContain('emoji-picker__tab--active')
        expect(tabs[1].classes()).toContain('emoji-picker__tab--active')
    })

    it('clicking an emoji emits "select" with the character', async () => {
        const wrapper = mount(EmojiPicker, { props: { open: true } })
        const items = wrapper.findAll('.emoji-picker__item')
        await items[0].trigger('click')
        const sel = wrapper.emitted('select')
        expect(sel).toBeTruthy()
        expect(sel![0]).toEqual([EMOJI_CATEGORIES[0].emojis[0]])
    })

    it('emits "close" on ESC keydown when open', async () => {
        const wrapper = mount(EmojiPicker, {
            props: { open: true },
            attachTo: document.body,
        })
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
        await nextTick()
        expect(wrapper.emitted('close')).toBeTruthy()
        wrapper.unmount()
    })

    it('emits "close" on outside click', async () => {
        const wrapper = mount(EmojiPicker, {
            props: { open: true },
            attachTo: document.body,
        })
        const outside = document.createElement('div')
        document.body.appendChild(outside)
        outside.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        await nextTick()
        expect(wrapper.emitted('close')).toBeTruthy()
        outside.remove()
        wrapper.unmount()
    })

    it('does NOT emit close when clicking inside the picker', async () => {
        const wrapper = mount(EmojiPicker, {
            props: { open: true },
            attachTo: document.body,
        })
        await wrapper.find('.emoji-picker').trigger('click')
        expect(wrapper.emitted('close')).toBeFalsy()
        wrapper.unmount()
    })
})
