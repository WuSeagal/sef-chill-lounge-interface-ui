import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BottomBar from '@/components/BottomBar.vue'

describe('BottomBar', () => {
    it('renders five icon buttons and one input', () => {
        const wrapper = mount(BottomBar, { props: { inputValue: '' } })
        expect(wrapper.findAll('.bottom-bar__btn').length).toBe(5)
        expect(wrapper.find('.bottom-bar__input').exists()).toBe(true)
    })

    it('renders the buttons in spec order: gear, attach, emoji, sticker, send', () => {
        const wrapper = mount(BottomBar, { props: { inputValue: '' } })
        const btns = wrapper.findAll('.bottom-bar__btn')
        expect(btns[0].attributes('data-btn')).toBe('gear')
        expect(btns[1].attributes('data-btn')).toBe('attach')
        expect(btns[2].attributes('data-btn')).toBe('emoji')
        expect(btns[3].attributes('data-btn')).toBe('sticker')
        expect(btns[4].attributes('data-btn')).toBe('send')
    })

    it('emits gear-click when gear button is clicked', async () => {
        const wrapper = mount(BottomBar, { props: { inputValue: '' } })
        await wrapper.find('[data-btn="gear"]').trigger('click')
        expect(wrapper.emitted('gear-click')).toBeTruthy()
        expect(wrapper.emitted('gear-click')!.length).toBe(1)
    })

    it('emits send with the current input value when send is clicked', async () => {
        const wrapper = mount(BottomBar, { props: { inputValue: 'hello' } })
        await wrapper.find('[data-btn="send"]').trigger('click')
        const sent = wrapper.emitted('send')
        expect(sent).toBeTruthy()
        expect(sent![0]).toEqual(['hello'])
    })

    it('emits update:inputValue when the user types', async () => {
        const wrapper = mount(BottomBar, { props: { inputValue: '' } })
        const input = wrapper.find('.bottom-bar__input')
        await input.setValue('typed')
        const updates = wrapper.emitted('update:inputValue')
        expect(updates).toBeTruthy()
        expect(updates![0]).toEqual(['typed'])
    })

    it('emits send with the current input value when Enter is pressed (keydown)', async () => {
        const wrapper = mount(BottomBar, { props: { inputValue: 'enter-typed' } })
        await wrapper.find('.bottom-bar__input').trigger('keydown', { key: 'Enter' })
        const sent = wrapper.emitted('send')
        expect(sent).toBeTruthy()
        expect(sent![0]).toEqual(['enter-typed'])
    })

    it('does NOT emit send on Shift+Enter (newline insertion path)', async () => {
        const wrapper = mount(BottomBar, { props: { inputValue: 'shift-enter' } })
        await wrapper.find('.bottom-bar__input').trigger('keydown', { key: 'Enter', shiftKey: true })
        expect(wrapper.emitted('send')).toBeFalsy()
    })

    it('renders the input as a <textarea> for multi-line support', () => {
        const wrapper = mount(BottomBar, { props: { inputValue: '' } })
        const ta = wrapper.find('.bottom-bar__input')
        expect(ta.element.tagName).toBe('TEXTAREA')
    })

    it('clicking the emoji button opens the picker', async () => {
        const wrapper = mount(BottomBar, { props: { inputValue: '' } })
        expect(wrapper.find('.emoji-picker').exists()).toBe(false)
        await wrapper.find('[data-btn="emoji"]').trigger('click')
        expect(wrapper.find('.emoji-picker').exists()).toBe(true)
    })

    it('clicking the emoji button a second time closes the picker', async () => {
        const wrapper = mount(BottomBar, { props: { inputValue: '' } })
        const btn = wrapper.find('[data-btn="emoji"]')
        await btn.trigger('click')
        expect(wrapper.find('.emoji-picker').exists()).toBe(true)
        await btn.trigger('click')
        expect(wrapper.find('.emoji-picker').exists()).toBe(false)
    })

    it('selecting an emoji emits update:inputValue with the emoji appended', async () => {
        const wrapper = mount(BottomBar, { props: { inputValue: 'hi ' } })
        await wrapper.find('[data-btn="emoji"]').trigger('click')
        const firstEmoji = wrapper.find('.emoji-picker__item')
        const emojiText = firstEmoji.text()
        await firstEmoji.trigger('click')
        const updates = wrapper.emitted('update:inputValue')
        expect(updates).toBeTruthy()
        expect(updates![0]).toEqual([`hi ${emojiText}`])
    })

    it('disables attach button when attachDisabled is true', () => {
        const wrapper = mount(BottomBar, {
            props: { inputValue: '', attachDisabled: true },
        })
        const btn = wrapper.find('[data-btn="attach"]')
        expect(btn.attributes('disabled')).toBeDefined()
    })

    it('emits attach-click when attach button is clicked', async () => {
        const wrapper = mount(BottomBar, { props: { inputValue: '' } })
        await wrapper.find('[data-btn="attach"]').trigger('click')
        expect(wrapper.emitted('attach-click')).toBeTruthy()
    })

    it('emits image-paste with files when image data is pasted into textarea', async () => {
        const wrapper = mount(BottomBar, { props: { inputValue: '' } })
        const file = new File(['x'], 'pasted.png', { type: 'image/png' })

        const event = new Event('paste', { bubbles: true, cancelable: true })
        Object.defineProperty(event, 'clipboardData', {
            value: {
                items: [{
                    kind: 'file',
                    type: 'image/png',
                    getAsFile: () => file,
                }],
            },
        })
        wrapper.find('.bottom-bar__input').element.dispatchEvent(event)
        await wrapper.vm.$nextTick()

        const pastes = wrapper.emitted('image-paste')
        expect(pastes).toBeTruthy()
        expect(pastes![0]).toEqual([[file]])
    })

    it('does not emit image-paste when clipboard has no image item', async () => {
        const wrapper = mount(BottomBar, { props: { inputValue: '' } })

        const event = new Event('paste', { bubbles: true, cancelable: true })
        Object.defineProperty(event, 'clipboardData', {
            value: {
                items: [{ kind: 'string', type: 'text/plain', getAsFile: () => null }],
            },
        })
        wrapper.find('.bottom-bar__input').element.dispatchEvent(event)
        await wrapper.vm.$nextTick()

        expect(wrapper.emitted('image-paste')).toBeUndefined()
    })
})
