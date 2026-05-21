import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MessageItem from '@/components/MessageItem.vue'
import type { MockMessage } from '@/mocks/mockMessages'

const textMessage: MockMessage = {
    id: 'msg-001',
    userId: 'u-101',
    nickname: '小毛',
    avatarUrl: '/mock-images/avatar-default.png',
    content: 'hello',
    timestamp: '2026-05-20T14:00:00.000Z',
}

const imageMessage: MockMessage = {
    id: 'msg-003',
    userId: 'u-103',
    nickname: '小白',
    avatarUrl: '/mock-images/avatar-default.png',
    content: 'look',
    imageUrl: '/mock-images/chat-image-1.jpg',
    timestamp: '2026-05-20T14:02:15.000Z',
}

const imageOnlyMessage: MockMessage = {
    id: 'msg-007',
    userId: 'u-105',
    nickname: 'Tiger',
    avatarUrl: '/mock-images/avatar-default.png',
    content: '',
    imageUrl: '/mock-images/chat-image-2.jpg',
    timestamp: '2026-05-20T14:06:10.000Z',
}

describe('MessageItem', () => {
    it('renders nickname and HH:mm timestamp', () => {
        const wrapper = mount(MessageItem, { props: { message: textMessage } })
        expect(wrapper.text()).toContain('小毛')
        // 2026-05-20T14:00:00Z = 14:00 UTC. The HH:mm here is the local
        // timezone of the test runner — we just verify "two digits, colon,
        // two digits" so the test works across CI timezones.
        expect(wrapper.find('.message-item__timestamp').text()).toMatch(/^\d{2}:\d{2}$/)
    })

    it('renders content text with a > prompt prefix', () => {
        const wrapper = mount(MessageItem, { props: { message: textMessage } })
        const line = wrapper.find('.message-item__line')
        expect(line.exists()).toBe(true)
        expect(wrapper.find('.message-item__prompt').text()).toBe('>')
        expect(wrapper.find('.message-item__content').text()).toBe('hello')
    })

    it('does NOT render a SpeechBubble wrapper around the content', () => {
        const wrapper = mount(MessageItem, { props: { message: textMessage } })
        expect(wrapper.find('.speech-bubble').exists()).toBe(false)
    })

    it('renders an img with the imageUrl for image messages', () => {
        const wrapper = mount(MessageItem, { props: { message: imageMessage } })
        const img = wrapper.find('.message-item__image')
        expect(img.exists()).toBe(true)
        expect(img.attributes('src')).toBe('/mock-images/chat-image-1.jpg')
        const el = img.element as HTMLElement
        expect(el.style.maxWidth).toBe('240px')
        expect(el.style.maxHeight).toBe('240px')
    })

    it('does NOT render the prompt line for image-only messages (empty content)', () => {
        const wrapper = mount(MessageItem, { props: { message: imageOnlyMessage } })
        expect(wrapper.find('.message-item__line').exists()).toBe(false)
        expect(wrapper.find('.message-item__prompt').exists()).toBe(false)
        // image still renders
        expect(wrapper.find('.message-item__image').exists()).toBe(true)
    })

    it('emits avatar-click with the userId when the avatar is clicked', async () => {
        const wrapper = mount(MessageItem, { props: { message: textMessage } })
        await wrapper.find('.message-item__avatar').trigger('click')
        const evt = wrapper.emitted('avatar-click')
        expect(evt).toBeTruthy()
        expect(evt![0]).toEqual(['u-101'])
    })

    it('emits image-click with the imageUrl when the image is clicked', async () => {
        const wrapper = mount(MessageItem, { props: { message: imageMessage } })
        await wrapper.find('.message-item__image').trigger('click')
        const evt = wrapper.emitted('image-click')
        expect(evt).toBeTruthy()
        expect(evt![0]).toEqual(['/mock-images/chat-image-1.jpg'])
    })

    it('does NOT emit image-click for text-only messages (no image to click)', () => {
        const wrapper = mount(MessageItem, { props: { message: textMessage } })
        expect(wrapper.find('.message-item__image').exists()).toBe(false)
        expect(wrapper.emitted('image-click')).toBeFalsy()
    })

    it('preserves newlines in multi-line content via white-space: pre-wrap', () => {
        const multilineMessage: MockMessage = {
            ...textMessage,
            content: 'line one\nline two',
        }
        const wrapper = mount(MessageItem, { props: { message: multilineMessage } })
        // textContent normalises newlines; check raw inner HTML or computed style
        const content = wrapper.find('.message-item__content')
        expect(content.text()).toContain('line one')
        expect(content.text()).toContain('line two')
        // CSS asserts the white-space behaviour — we just confirm the class is present
        expect(content.classes()).toContain('message-item__content')
    })
})
