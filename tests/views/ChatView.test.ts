import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import ChatView from '@/views/ChatView.vue'
import { resetMockMessagesForTest } from '@/composables/useMockMessages'

describe('ChatView', () => {
    beforeEach(() => {
        resetMockMessagesForTest()
    })

    it('renders the mock messages list (>= 20 items)', () => {
        const wrapper = mount(ChatView)
        const items = wrapper.findAll('.message-item')
        expect(items.length).toBeGreaterThanOrEqual(20)
    })

    it('renders no UserPopup or ImageLightbox by default', () => {
        const wrapper = mount(ChatView)
        expect(wrapper.find('.user-popup').exists()).toBe(false)
        expect(wrapper.find('.image-lightbox').exists()).toBe(false)
    })

    it('opens UserPopup with the correct member when an avatar is clicked', async () => {
        const wrapper = mount(ChatView, { attachTo: document.body })
        // First message is from u-101 小毛
        const firstAvatar = wrapper.findAll('.message-item__avatar')[0]
        await firstAvatar.trigger('click')
        await nextTick()
        expect(wrapper.find('.user-popup').exists()).toBe(true)
        expect(wrapper.find('.user-popup').text()).toContain('小毛')
        wrapper.unmount()
    })

    it('toggles UserPopup off when the same avatar is re-clicked', async () => {
        const wrapper = mount(ChatView, { attachTo: document.body })
        const firstAvatar = wrapper.findAll('.message-item__avatar')[0]
        await firstAvatar.trigger('click')
        await nextTick()
        expect(wrapper.find('.user-popup').exists()).toBe(true)

        // Re-click same avatar should close
        await firstAvatar.trigger('click')
        await nextTick()
        expect(wrapper.find('.user-popup').exists()).toBe(false)
        wrapper.unmount()
    })

    it('same-avatar re-click toggles off even when a full mousedown+click sequence is dispatched', async () => {
        // This test exercises the real browser event order. The earlier
        // toggle test only fires a single 'click' which is not enough to
        // catch the "outside-detector races with toggle" bug. Here we
        // dispatch the same sequence the browser would, twice.
        const wrapper = mount(ChatView, { attachTo: document.body })
        const av = wrapper.findAll('.message-item__avatar')[0].element as HTMLElement

        av.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
        av.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        await nextTick()
        expect(wrapper.find('.user-popup').exists()).toBe(true)

        av.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
        av.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        await nextTick()
        expect(wrapper.find('.user-popup').exists()).toBe(false)

        wrapper.unmount()
    })

    it('appending via BottomBar send adds a new message to the list', async () => {
        const wrapper = mount(ChatView)
        const before = wrapper.findAll('.message-item').length

        const input = wrapper.find('.bottom-bar__input')
        await input.setValue('hi from test')

        const sendBtn = wrapper.find('[data-btn="send"]')
        await sendBtn.trigger('click')
        await flushPromises()

        const after = wrapper.findAll('.message-item').length
        expect(after).toBe(before + 1)
        expect(wrapper.text()).toContain('hi from test')
    })
})
