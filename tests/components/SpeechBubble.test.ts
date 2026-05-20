import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SpeechBubble from '@/components/SpeechBubble.vue'

describe('SpeechBubble — skeleton', () => {
    it('renders an svg containing a path', () => {
        const wrapper = mount(SpeechBubble, {
            props: { width: 200, height: 80, direction: 'left' },
            slots: { default: '<span class="t">hi</span>' },
        })
        expect(wrapper.find('svg').exists()).toBe(true)
        expect(wrapper.find('path').exists()).toBe(true)
    })

    it('renders the default slot content', () => {
        const wrapper = mount(SpeechBubble, {
            props: { width: 200, height: 80, direction: 'left' },
            slots: { default: '<span class="t">hello</span>' },
        })
        expect(wrapper.find('.t').text()).toBe('hello')
    })

    it('svg has width and height matching props', () => {
        const wrapper = mount(SpeechBubble, {
            props: { width: 220, height: 90, direction: 'right' },
        })
        const svg = wrapper.find('svg')
        expect(svg.attributes('width')).toBe('220')
        expect(svg.attributes('height')).toBe('90')
    })
})
