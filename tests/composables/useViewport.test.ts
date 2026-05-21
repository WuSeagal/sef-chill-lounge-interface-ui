import { describe, it, expect } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { useViewport } from '@/composables/useViewport'

const Probe = defineComponent({
    setup() {
        const vp = useViewport()
        return () => h('div', { 'data-w': vp.width.value, 'data-h': vp.height.value })
    },
})

describe('useViewport', () => {
    it('exposes reactive width and height initialized from window', () => {
        const wrapper = mount(Probe, { attachTo: document.body })
        const div = wrapper.find('div')
        expect(Number(div.attributes('data-w'))).toBe(window.innerWidth)
        expect(Number(div.attributes('data-h'))).toBe(window.innerHeight)
        wrapper.unmount()
    })

    it('updates when the window dispatches a resize event', async () => {
        const wrapper = mount(Probe, { attachTo: document.body })
        // happy-dom lets us assign window.innerWidth/innerHeight in tests
        Object.defineProperty(window, 'innerWidth', { value: 360, configurable: true, writable: true })
        Object.defineProperty(window, 'innerHeight', { value: 640, configurable: true, writable: true })
        window.dispatchEvent(new Event('resize'))
        await nextTick()
        const div = wrapper.find('div')
        expect(Number(div.attributes('data-w'))).toBe(360)
        expect(Number(div.attributes('data-h'))).toBe(640)
        wrapper.unmount()
    })
})
