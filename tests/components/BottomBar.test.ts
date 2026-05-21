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

    it('emits send with the current input value when Enter is pressed', async () => {
        const wrapper = mount(BottomBar, { props: { inputValue: 'enter-typed' } })
        await wrapper.find('.bottom-bar__input').trigger('keyup', { key: 'Enter' })
        const sent = wrapper.emitted('send')
        expect(sent).toBeTruthy()
        expect(sent![0]).toEqual(['enter-typed'])
    })

    it('does NOT emit send on Shift+Enter (reserved for multi-line in future)', async () => {
        const wrapper = mount(BottomBar, { props: { inputValue: 'shift-enter' } })
        await wrapper.find('.bottom-bar__input').trigger('keyup', { key: 'Enter', shiftKey: true })
        expect(wrapper.emitted('send')).toBeFalsy()
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
})
