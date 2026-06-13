import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import FloatingBubble from '@/components/FloatingBubble.vue'
import type { DashboardBubble } from '@/composables/useDashboardBubbles'
import type { MockMessage } from '@/mocks/mockMessages'

function makeBubble(overrides: Partial<DashboardBubble> = {}): DashboardBubble {
    const msg: MockMessage = {
        id: 'msg-001',
        userId: 'u-101',
        nickname: 'Test',
        avatarUrl: '/mock-images/avatar-default.png',
        content: 'hello world',
        timestamp: '2026-05-21T00:00:00.000Z',
    }
    return {
        id: 'bubble-msg-001',
        message: msg,
        direction: 'left',
        x: 100,
        y: 200,
        dx: 40,
        dy: -35,
        zIndex: 1,
        isExiting: false,
        animateEntrance: true,
        ...overrides,
    }
}

describe('FloatingBubble — structure', () => {
    it('renders a SpeechBubble with the correct direction prop', () => {
        const wrapper = mount(FloatingBubble, {
            props: { bubble: makeBubble({ direction: 'right' }) },
        })
        const sb = wrapper.findComponent({ name: 'SpeechBubble' })
        expect(sb.exists()).toBe(true)
        expect(sb.props('direction')).toBe('right')
    })

    it('renders an avatar img with the message avatarUrl', () => {
        const wrapper = mount(FloatingBubble, {
            props: { bubble: makeBubble() },
        })
        const img = wrapper.find('.floating-bubble__avatar')
        expect(img.exists()).toBe(true)
        expect(img.attributes('src')).toBe('/mock-images/avatar-default.png')
    })

    it('renders default avatar when avatarUrl is empty', () => {
        const wrapper = mount(FloatingBubble, {
            props: {
                bubble: makeBubble({
                    message: { ...makeBubble().message, avatarUrl: '' },
                }),
            },
        })
        const img = wrapper.find('.floating-bubble__avatar')
        expect(img.attributes('src')).toContain('default-avatar.png')
    })

    it('renders the message content text', () => {
        const wrapper = mount(FloatingBubble, {
            props: { bubble: makeBubble() },
        })
        expect(wrapper.text()).toContain('hello world')
    })

    it('shows an image thumbnail when message has imageUrl', () => {
        const msg: MockMessage = {
            id: 'msg-img',
            userId: 'u-101',
            nickname: 'Test',
            avatarUrl: '/mock-images/avatar-default.png',
            content: '',
            imageUrl: '/mock-images/chat-image-1.jpg',
            timestamp: '2026-05-21T00:00:00.000Z',
        }
        const wrapper = mount(FloatingBubble, {
            props: {
                bubble: makeBubble({
                    id: 'bubble-msg-img',
                    message: msg,
                }),
            },
        })
        const img = wrapper.find('.floating-bubble__image')
        expect(img.exists()).toBe(true)
        expect(img.attributes('src')).toBe('/mock-images/chat-image-1.jpg')
    })

    it('shows caption text below image when both content and imageUrl exist', () => {
        const msg: MockMessage = {
            id: 'msg-both',
            userId: 'u-101',
            nickname: 'Test',
            avatarUrl: '/mock-images/avatar-default.png',
            content: '看看這張',
            imageUrl: '/mock-images/chat-image-1.jpg',
            timestamp: '2026-05-21T00:00:00.000Z',
        }
        const wrapper = mount(FloatingBubble, {
            props: {
                bubble: makeBubble({
                    id: 'bubble-msg-both',
                    message: msg,
                }),
            },
        })
        expect(wrapper.find('.floating-bubble__image').exists()).toBe(true)
        expect(wrapper.find('.floating-bubble__caption').text()).toBe('看看這張')
    })
})

describe('FloatingBubble — avatar ring', () => {
    it('applies avatarColor ring when avatarBorder is on', () => {
        const wrapper = mount(FloatingBubble, {
            props: {
                bubble: makeBubble({
                    message: { ...makeBubble().message, avatarColor: '#7b9b8f', avatarBorder: true },
                }),
            },
        })
        const style = wrapper.find('.floating-bubble__avatar').attributes('style') ?? ''
        expect(style).toContain('box-shadow')
        expect(style).toContain('#7b9b8f')
    })

    it('renders no ring when avatarBorder is off', () => {
        const wrapper = mount(FloatingBubble, {
            props: {
                bubble: makeBubble({
                    message: { ...makeBubble().message, avatarColor: '#7b9b8f', avatarBorder: false },
                }),
            },
        })
        const style = wrapper.find('.floating-bubble__avatar').attributes('style') ?? ''
        expect(style).not.toContain('box-shadow')
    })
})

describe('FloatingBubble — speaker-colored bubble stroke', () => {
    it('passes avatarColor as SpeechBubble strokeColor when avatarBorder on with color', () => {
        const wrapper = mount(FloatingBubble, {
            props: {
                bubble: makeBubble({
                    message: { ...makeBubble().message, avatarColor: '#3b82c4', avatarBorder: true },
                }),
            },
        })
        const sb = wrapper.findComponent({ name: 'SpeechBubble' })
        expect(sb.props('strokeColor')).toBe('#3b82c4')
    })

    it('falls back to #9c8f68 when avatarBorder is off', () => {
        const wrapper = mount(FloatingBubble, {
            props: {
                bubble: makeBubble({
                    message: { ...makeBubble().message, avatarColor: '#3b82c4', avatarBorder: false },
                }),
            },
        })
        const sb = wrapper.findComponent({ name: 'SpeechBubble' })
        expect(sb.props('strokeColor')).toBe('#9c8f68')
    })

    it('falls back to #9c8f68 when avatarColor is null even if avatarBorder on', () => {
        const wrapper = mount(FloatingBubble, {
            props: {
                bubble: makeBubble({
                    message: { ...makeBubble().message, avatarColor: null, avatarBorder: true },
                }),
            },
        })
        const sb = wrapper.findComponent({ name: 'SpeechBubble' })
        expect(sb.props('strokeColor')).toBe('#9c8f68')
    })
})

describe('FloatingBubble — avatar position', () => {
    it('direction "left": avatar comes before SpeechBubble in DOM', () => {
        const wrapper = mount(FloatingBubble, {
            props: { bubble: makeBubble({ direction: 'left' }) },
        })
        const inner = wrapper.find('.floating-bubble__inner')
        const children = inner.element.children
        expect(children[0].classList.contains('floating-bubble__avatar')).toBe(true)
        expect(children[1].classList.contains('speech-bubble')).toBe(true)
    })

    it('direction "right": avatar has order class for right placement', () => {
        const wrapper = mount(FloatingBubble, {
            props: { bubble: makeBubble({ direction: 'right' }) },
        })
        const avatar = wrapper.find('.floating-bubble__avatar')
        expect(avatar.classes()).toContain('floating-bubble__avatar--right')
    })
})

describe('FloatingBubble — position and animation classes', () => {
    it('outer element uses transform: translate for positioning', () => {
        const wrapper = mount(FloatingBubble, {
            props: { bubble: makeBubble({ x: 150, y: 300 }) },
        })
        const el = wrapper.element as HTMLElement
        expect(el.style.transform).toBe('translate(150px, 300px)')
    })

    it('outer element has z-index from bubble', () => {
        const wrapper = mount(FloatingBubble, {
            props: { bubble: makeBubble({ zIndex: 7 }) },
        })
        const el = wrapper.element as HTMLElement
        expect(el.style.zIndex).toBe('7')
    })

    it('inner element has entering class when not exiting', () => {
        const wrapper = mount(FloatingBubble, {
            props: { bubble: makeBubble({ isExiting: false }) },
        })
        const inner = wrapper.find('.floating-bubble__inner')
        expect(inner.classes()).toContain('floating-bubble__inner--entering')
        expect(inner.classes()).not.toContain('floating-bubble__inner--exiting')
    })

    it('animateEntrance 為 false 時不套入場動畫 class（進頁面已存在/重掛載的泡泡不後空翻）', () => {
        const wrapper = mount(FloatingBubble, {
            props: { bubble: makeBubble({ isExiting: false, animateEntrance: false }) },
        })
        const inner = wrapper.find('.floating-bubble__inner')
        expect(inner.classes()).not.toContain('floating-bubble__inner--entering')
        expect(inner.classes()).not.toContain('floating-bubble__inner--exiting')
    })

    it('inner element has exiting class when isExiting is true', () => {
        const wrapper = mount(FloatingBubble, {
            props: { bubble: makeBubble({ isExiting: true }) },
        })
        const inner = wrapper.find('.floating-bubble__inner')
        expect(inner.classes()).toContain('floating-bubble__inner--exiting')
        expect(inner.classes()).not.toContain('floating-bubble__inner--entering')
    })

    // 方案 1「全體後空翻」結構契約：入場動畫掛在整個 __inner（頭像＋泡泡同層一起翻），
    // 頭像不單獨帶入場動畫 class（防止未來誤改成 avatar-only/方案 2）。
    it('方案1：入場時頭像與泡泡同在 __inner--entering 之下，頭像不單獨帶入場動畫 class', () => {
        const wrapper = mount(FloatingBubble, {
            props: { bubble: makeBubble({ isExiting: false }) },
        })
        const inner = wrapper.find('.floating-bubble__inner')
        expect(inner.classes()).toContain('floating-bubble__inner--entering')

        const avatar = wrapper.find('.floating-bubble__avatar')
        const speech = wrapper.findComponent({ name: 'SpeechBubble' })
        // 頭像與泡泡都是 __inner 的後代（會一起被翻）
        expect(inner.element.contains(avatar.element)).toBe(true)
        expect(inner.element.contains(speech.element)).toBe(true)
        // 頭像不帶自己的入場動畫 class（避免變成只翻頭像）
        expect(avatar.classes()).not.toContain('floating-bubble__avatar--entering')
    })
})
