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

describe('SpeechBubble — left tail path', () => {
    it('left direction produces path starting with M18 0', () => {
        const wrapper = mount(SpeechBubble, {
            props: { width: 200, height: 80, direction: 'left' },
        })
        const d = wrapper.find('path').attributes('d')
        expect(d).toMatch(/^M18\s+0/)
    })

    it('left direction includes a notch around vertical center', () => {
        // For W=200, H=80: tail tip at (0, 40), shoulders at (12, 30) and (12, 50)
        const wrapper = mount(SpeechBubble, {
            props: { width: 200, height: 80, direction: 'left' },
        })
        const d = wrapper.find('path').attributes('d')!
        expect(d).toContain('L12 30')
        expect(d).toContain('L0 40')
        expect(d).toContain('L12 50')
    })

    it('left direction path closes with Z', () => {
        const wrapper = mount(SpeechBubble, {
            props: { width: 200, height: 80, direction: 'left' },
        })
        const d = wrapper.find('path').attributes('d')!
        expect(d.trim().endsWith('Z')).toBe(true)
    })
})

describe('SpeechBubble — right tail path', () => {
    it('right direction produces path starting with M6 0', () => {
        const wrapper = mount(SpeechBubble, {
            props: { width: 200, height: 80, direction: 'right' },
        })
        const d = wrapper.find('path').attributes('d')
        expect(d).toMatch(/^M6\s+0/)
    })

    it('right direction includes a notch on the right around vertical center', () => {
        // For W=200, H=80: tail tip at (200, 40), shoulders at (188, 30) and (188, 50)
        const wrapper = mount(SpeechBubble, {
            props: { width: 200, height: 80, direction: 'right' },
        })
        const d = wrapper.find('path').attributes('d')!
        expect(d).toContain('L188 30')
        expect(d).toContain('L200 40')
        expect(d).toContain('L188 50')
    })

    it('right direction path closes with Z', () => {
        const wrapper = mount(SpeechBubble, {
            props: { width: 200, height: 80, direction: 'right' },
        })
        const d = wrapper.find('path').attributes('d')!
        expect(d.trim().endsWith('Z')).toBe(true)
    })
})
