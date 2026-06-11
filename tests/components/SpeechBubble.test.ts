import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SpeechBubble from '@/components/SpeechBubble.vue'

// SpeechBubble 是內容自適應元件：尺寸由 slot 內容經 ResizeObserver 量測得出。
// 測試環境（happy-dom）無 layout，clientWidth/Height 為 0 → 量測退回最小尺寸 80×40（確定值）。

describe('SpeechBubble — structure', () => {
    it('renders an svg containing a path', () => {
        const wrapper = mount(SpeechBubble, {
            props: { direction: 'left' },
            slots: { default: '<span class="t">hi</span>' },
        })
        expect(wrapper.find('svg').exists()).toBe(true)
        expect(wrapper.find('path').exists()).toBe(true)
    })

    it('renders the default slot content', () => {
        const wrapper = mount(SpeechBubble, {
            props: { direction: 'left' },
            slots: { default: '<span class="t">hello</span>' },
        })
        expect(wrapper.find('.t').text()).toBe('hello')
    })

    it('falls back to the minimum 80×40 when content has no measured size', () => {
        const wrapper = mount(SpeechBubble, { props: { direction: 'right' } })
        const svg = wrapper.find('svg')
        expect(svg.attributes('width')).toBe('80')
        expect(svg.attributes('height')).toBe('40')
    })
})

describe('SpeechBubble — left tail path', () => {
    it('left direction produces path starting with M18 0', () => {
        const wrapper = mount(SpeechBubble, { props: { direction: 'left' } })
        const d = wrapper.find('path').attributes('d')
        expect(d).toMatch(/^M18\s+0/)
    })

    it('left direction includes a notch around vertical center', () => {
        // At min size W=80, H=40: tail tip at (0, 20), shoulders at (12, 10) and (12, 30)
        const wrapper = mount(SpeechBubble, { props: { direction: 'left' } })
        const d = wrapper.find('path').attributes('d')!
        expect(d).toContain('L12 30')
        expect(d).toContain('L0 20')
        expect(d).toContain('L12 10')
    })

    it('left direction path closes with Z', () => {
        const wrapper = mount(SpeechBubble, { props: { direction: 'left' } })
        const d = wrapper.find('path').attributes('d')!
        expect(d.trim().endsWith('Z')).toBe(true)
    })
})

describe('SpeechBubble — right tail path', () => {
    it('right direction produces path starting with M6 0', () => {
        const wrapper = mount(SpeechBubble, { props: { direction: 'right' } })
        const d = wrapper.find('path').attributes('d')
        expect(d).toMatch(/^M6\s+0/)
    })

    it('right direction includes a notch on the right around vertical center', () => {
        // At min size W=80, H=40: tail tip at (80, 20), shoulders at (68, 10) and (68, 30)
        const wrapper = mount(SpeechBubble, { props: { direction: 'right' } })
        const d = wrapper.find('path').attributes('d')!
        expect(d).toContain('L68 10')
        expect(d).toContain('L80 20')
        expect(d).toContain('L68 30')
    })

    it('right direction path closes with Z', () => {
        const wrapper = mount(SpeechBubble, { props: { direction: 'right' } })
        const d = wrapper.find('path').attributes('d')!
        expect(d.trim().endsWith('Z')).toBe(true)
    })
})

describe('SpeechBubble — content padding', () => {
    it('left tail: content has padding-left 24px, other sides 12px', () => {
        const wrapper = mount(SpeechBubble, { props: { direction: 'left' } })
        const el = wrapper.find('.content').element as HTMLElement
        expect(el.style.paddingLeft).toBe('24px')
        expect(el.style.paddingRight).toBe('12px')
        expect(el.style.paddingTop).toBe('12px')
        expect(el.style.paddingBottom).toBe('12px')
    })

    it('right tail: content has padding-right 24px, other sides 12px', () => {
        const wrapper = mount(SpeechBubble, { props: { direction: 'right' } })
        const el = wrapper.find('.content').element as HTMLElement
        expect(el.style.paddingRight).toBe('24px')
        expect(el.style.paddingLeft).toBe('12px')
        expect(el.style.paddingTop).toBe('12px')
        expect(el.style.paddingBottom).toBe('12px')
    })
})

describe('SpeechBubble — max size props', () => {
    it('applies maxWidth/maxHeight to the root container style', () => {
        const wrapper = mount(SpeechBubble, {
            props: { direction: 'left', maxWidth: 260, maxHeight: 520 },
        })
        const el = wrapper.find('.speech-bubble').element as HTMLElement
        expect(el.style.maxWidth).toBe('260px')
        expect(el.style.maxHeight).toBe('520px')
    })

    it('omits max constraints when props are not provided', () => {
        const wrapper = mount(SpeechBubble, { props: { direction: 'left' } })
        const el = wrapper.find('.speech-bubble').element as HTMLElement
        expect(el.style.maxWidth).toBe('')
        expect(el.style.maxHeight).toBe('')
    })
})
