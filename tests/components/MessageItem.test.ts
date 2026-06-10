import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MessageItem from '@/components/MessageItem.vue'
import type { MessageResponse } from '@/types/message'

function makeMessage(overrides: Partial<MessageResponse>): MessageResponse {
    return {
        cursorId: 11,
        messageId: 'msg-001',
        userId: 'u-101',
        messageType: 'TEXT',
        furName: '小毛',
        avatar: '/mock-images/avatar-default.png',
        avatarColor: null,
        avatarBorder: false,
        content: 'hello',
        imageUrls: [],
        stickerImageUrl: null,
        createdDate: '2026-05-20T14:00:00',
        ...overrides,
    }
}

describe('MessageItem', () => {
    it('renders furName and HH:mm timestamp', () => {
        const wrapper = mount(MessageItem, {
            props: {
                message: makeMessage({}),
            },
        })

        expect(wrapper.text()).toContain('小毛')
        expect(wrapper.find('.message-item__timestamp').text()).toMatch(/^\d{2}:\d{2}$/)
    })

    it('renders text content with a > prompt prefix', () => {
        const wrapper = mount(MessageItem, {
            props: {
                message: makeMessage({ content: 'hello world' }),
            },
        })

        expect(wrapper.find('.message-item__line').exists()).toBe(true)
        expect(wrapper.find('.message-item__prompt').text()).toBe('>')
        expect(wrapper.find('.message-item__content').text()).toBe('hello world')
    })

    it('renders multiple images inside one TEXT bubble', () => {
        const wrapper = mount(MessageItem, {
            props: {
                message: makeMessage({
                    content: 'look',
                    imageUrls: ['/mock-images/chat-image-1.jpg', '/mock-images/chat-image-2.jpg'],
                }),
            },
        })

        const images = wrapper.findAll('.message-item__image')
        expect(images).toHaveLength(2)
        expect(images[0].attributes('src')).toBe('/mock-images/chat-image-1.jpg')
        expect(images[1].attributes('src')).toBe('/mock-images/chat-image-2.jpg')
    })

    it('does not render the prompt line for image-only TEXT messages', () => {
        const wrapper = mount(MessageItem, {
            props: {
                message: makeMessage({
                    content: null,
                    imageUrls: ['/mock-images/chat-image-1.jpg'],
                }),
            },
        })

        expect(wrapper.find('.message-item__line').exists()).toBe(false)
        expect(wrapper.findAll('.message-item__image')).toHaveLength(1)
    })

    it('renders sticker image for STICKER message', () => {
        const wrapper = mount(MessageItem, {
            props: {
                message: makeMessage({
                    messageType: 'STICKER',
                    content: null,
                    imageUrls: [],
                    stickerImageUrl: '/mock-images/sticker-1.png',
                }),
            },
        })

        const sticker = wrapper.find('.message-item__sticker')
        expect(sticker.exists()).toBe(true)
        expect(sticker.attributes('src')).toBe('/mock-images/sticker-1.png')
    })

    it('applies avatarColor ring on avatar when avatarBorder is on', () => {
        const wrapper = mount(MessageItem, {
            props: {
                message: makeMessage({ avatarColor: '#7b9b8f', avatarBorder: true }),
            },
        })

        const style = wrapper.find('.message-item__avatar').attributes('style') ?? ''
        expect(style).toContain('box-shadow')
        expect(style).toContain('#7b9b8f')
    })

    it('renders no ring when avatarBorder is off', () => {
        const wrapper = mount(MessageItem, {
            props: {
                message: makeMessage({ avatarColor: '#7b9b8f', avatarBorder: false }),
            },
        })

        const style = wrapper.find('.message-item__avatar').attributes('style') ?? ''
        expect(style).not.toContain('box-shadow')
    })

    it('renders default avatar when avatar is null', () => {
        const wrapper = mount(MessageItem, {
            props: {
                message: makeMessage({ avatar: null }),
            },
        })

        const style = wrapper.find('.message-item__avatar').attributes('style') ?? ''
        expect(style).toContain('default-avatar.png')
    })

    it('emits avatar-click with the userId when the avatar is clicked', async () => {
        const wrapper = mount(MessageItem, {
            props: {
                message: makeMessage({}),
            },
        })

        await wrapper.find('.message-item__avatar').trigger('click')
        expect(wrapper.emitted('avatar-click')?.[0]).toEqual(['u-101'])
    })

    it('emits image-click with the sticker url when a STICKER message is clicked', async () => {
        const wrapper = mount(MessageItem, {
            props: {
                message: makeMessage({
                    messageType: 'STICKER',
                    content: null,
                    imageUrls: [],
                    stickerImageUrl: '/mock-images/sticker-1.png',
                }),
            },
        })

        await wrapper.find('.message-item__sticker').trigger('click')
        expect(wrapper.emitted('image-click')?.[0]).toEqual(['/mock-images/sticker-1.png'])
    })

    it('STICKER is keyboard-operable (role/tabindex + Enter emits image-click)', async () => {
        const wrapper = mount(MessageItem, {
            props: {
                message: makeMessage({
                    messageType: 'STICKER',
                    content: null,
                    imageUrls: [],
                    stickerImageUrl: '/mock-images/sticker-1.png',
                }),
            },
        })

        const sticker = wrapper.find('.message-item__sticker')
        expect(sticker.attributes('role')).toBe('button')
        expect(sticker.attributes('tabindex')).toBe('0')
        await sticker.trigger('keydown.enter')
        expect(wrapper.emitted('image-click')?.[0]).toEqual(['/mock-images/sticker-1.png'])
    })

    it('emits image-click with the clicked imageUrl', async () => {
        const wrapper = mount(MessageItem, {
            props: {
                message: makeMessage({
                    imageUrls: ['/mock-images/chat-image-1.jpg', '/mock-images/chat-image-2.jpg'],
                }),
            },
        })

        await wrapper.findAll('.message-item__image')[1].trigger('click')
        expect(wrapper.emitted('image-click')?.[0]).toEqual(['/mock-images/chat-image-2.jpg'])
    })

    it('emits image-load when a message image finishes loading', async () => {
        const wrapper = mount(MessageItem, {
            props: {
                message: makeMessage({
                    content: null,
                    imageUrls: ['/mock-images/chat-image-1.jpg'],
                }),
            },
        })

        await wrapper.find('.message-item__image').trigger('load')
        expect(wrapper.emitted('image-load')).toBeTruthy()
    })

    it('emits image-load when a sticker image finishes loading', async () => {
        const wrapper = mount(MessageItem, {
            props: {
                message: makeMessage({
                    messageType: 'STICKER',
                    content: null,
                    imageUrls: [],
                    stickerImageUrl: '/mock-images/sticker-1.png',
                }),
            },
        })

        await wrapper.find('.message-item__sticker').trigger('load')
        expect(wrapper.emitted('image-load')).toBeTruthy()
    })
})
