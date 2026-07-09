import { describe, it, expect, vi } from 'vitest'
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
        replyToMessageId: null,
        replyToUserId: null,
        replyToFurName: null,
        replyToContentSnippet: null,
        replyToCreatedDate: null,
        ...overrides,
    }
}

describe('MessageItem', () => {
    it('renders furName and a full-date timestamp for an old message', () => {
        const wrapper = mount(MessageItem, {
            props: {
                message: makeMessage({}),
            },
        })

        expect(wrapper.text()).toContain('小毛')
        expect(wrapper.find('.message-item__timestamp').text()).toBe('2026/05/20 14:00')
    })

    it('renders 今天 HH:mm for a message created today', () => {
        const now = new Date()
        const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T09:05:00`
        const wrapper = mount(MessageItem, {
            props: {
                message: makeMessage({ createdDate: todayIso }),
            },
        })

        expect(wrapper.find('.message-item__timestamp').text()).toBe('今天 09:05')
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

    it('emits avatar-click with the userId when the nickname is clicked (same effect as avatar)', async () => {
        const wrapper = mount(MessageItem, {
            props: {
                message: makeMessage({}),
            },
        })

        await wrapper.find('.message-item__nickname').trigger('click')
        expect(wrapper.emitted('avatar-click')?.[0]).toEqual(['u-101'])
    })

    it('nickname is keyboard-operable (role/tabindex + Enter/Space emits avatar-click)', async () => {
        const wrapper = mount(MessageItem, {
            props: {
                message: makeMessage({}),
            },
        })

        const nickname = wrapper.find('.message-item__nickname')
        expect(nickname.attributes('role')).toBe('button')
        expect(nickname.attributes('tabindex')).toBe('0')
        await nickname.trigger('keydown.enter')
        expect(wrapper.emitted('avatar-click')?.[0]).toEqual(['u-101'])
        await nickname.trigger('keydown.space')
        expect(wrapper.emitted('avatar-click')?.[1]).toEqual(['u-101'])
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

describe('MessageItem — 回覆鈕', () => {
    it('顯示回覆鈕（hover 顯隱由 CSS 控制，這裡只驗證存在與可觸發）', () => {
        const wrapper = mount(MessageItem, { props: { message: makeMessage({}) } })
        expect(wrapper.find('.message-item__reply-btn').exists()).toBe(true)
    })

    it('點回覆鈕 emit reply-click(messageId)', async () => {
        const wrapper = mount(MessageItem, { props: { message: makeMessage({ messageId: 'm-42' }) } })
        await wrapper.find('.message-item__reply-btn').trigger('click')
        expect(wrapper.emitted('reply-click')?.[0]).toEqual(['m-42'])
    })
})

describe('MessageItem — 回覆示意塊', () => {
    it('非回覆訊息不顯示示意塊', () => {
        const wrapper = mount(MessageItem, { props: { message: makeMessage({ replyToMessageId: null }) } })
        expect(wrapper.find('.message-item__reply-ref').exists()).toBe(false)
    })

    it('可解析的回覆顯示作者與摘要，可點擊 emit jump(replyToMessageId)', async () => {
        const wrapper = mount(MessageItem, {
            props: {
                message: makeMessage({
                    replyToMessageId: 'target-1',
                    replyToUserId: 'u-target',
                    replyToFurName: '小白',
                    replyToContentSnippet: '看看這張',
                }),
            },
        })

        const ref = wrapper.find('.message-item__reply-ref')
        expect(ref.exists()).toBe(true)
        expect(ref.text()).toContain('小白')
        expect(ref.text()).toContain('看看這張')
        expect(ref.attributes('role')).toBe('button')
        expect(ref.attributes('tabindex')).toBe('0')

        await ref.trigger('click')
        expect(wrapper.emitted('jump')?.[0]).toEqual(['target-1'])
    })

    it('無法解析（replyToFurName 為 null）顯示「無法載入訊息」且不可點擊', async () => {
        const wrapper = mount(MessageItem, {
            props: {
                message: makeMessage({
                    replyToMessageId: 'target-gone',
                    replyToUserId: null,
                    replyToFurName: null,
                    replyToContentSnippet: null,
                }),
            },
        })

        const ref = wrapper.find('.message-item__reply-ref')
        expect(ref.exists()).toBe(true)
        expect(ref.text()).toContain('無法載入訊息')
        expect(ref.attributes('role')).toBeUndefined()
        expect(ref.attributes('tabindex')).toBeUndefined()

        await ref.trigger('click')
        expect(wrapper.emitted('jump')).toBeFalsy()
    })
})

describe('MessageItem — host 刪除鈕', () => {
    it('canDelete=true 顯示刪除 X 鈕', () => {
        const wrapper = mount(MessageItem, { props: { message: makeMessage({}), canDelete: true } })
        expect(wrapper.find('.message-item__delete').exists()).toBe(true)
    })

    it('canDelete 預設 false 不顯示刪除鈕', () => {
        const wrapper = mount(MessageItem, { props: { message: makeMessage({}) } })
        expect(wrapper.find('.message-item__delete').exists()).toBe(false)
    })

    it('點擊刪除鈕 emit delete-click(messageId)', async () => {
        const wrapper = mount(MessageItem, { props: { message: makeMessage({ messageId: 'm-9' }), canDelete: true } })
        await wrapper.find('.message-item__delete').trigger('click')
        expect(wrapper.emitted('delete-click')?.[0]).toEqual(['m-9'])
    })
})

describe('MessageItem 安全渲染（URL / mention）', () => {
    it('純文字訊息整行文字維持原樣', () => {
        const wrapper = mount(MessageItem, { props: { message: makeMessage({ content: '今天天氣真好' }) } })
        expect(wrapper.find('.message-item__content').text()).toBe('今天天氣真好')
        expect(wrapper.find('.message-item__link').exists()).toBe(false)
    })

    it('URL 渲染為連結元素，display 為原文', () => {
        const wrapper = mount(MessageItem, {
            props: { message: makeMessage({ content: '看這個 https://example.com/a 很讚' }) },
        })
        const link = wrapper.find('.message-item__link')
        expect(link.exists()).toBe(true)
        expect(link.text()).toBe('https://example.com/a')
        expect(link.attributes('href')).toBe('https://example.com/a')
    })

    it('裸網域連結 href 補 https://、display 原文', () => {
        const wrapper = mount(MessageItem, {
            props: { message: makeMessage({ content: '上 www.example.com 看看' }) },
        })
        const link = wrapper.find('.message-item__link')
        expect(link.text()).toBe('www.example.com')
        expect(link.attributes('href')).toBe('https://www.example.com')
    })

    it('點擊連結 emit link-click(url) 且不直接開窗', async () => {
        const openSpy = vi.fn()
        const origOpen = window.open
        window.open = openSpy as typeof window.open
        try {
            const wrapper = mount(MessageItem, {
                props: { message: makeMessage({ content: 'go https://example.com' }) },
            })
            await wrapper.find('.message-item__link').trigger('click')
            expect(wrapper.emitted('link-click')?.[0]).toEqual(['https://example.com'])
            expect(openSpy).not.toHaveBeenCalled()
        } finally {
            window.open = origOpen
        }
    })

    it('blocked 危險連結渲染 *** 不可點', () => {
        const wrapper = mount(MessageItem, {
            props: { message: makeMessage({ content: '點 javascript:alert(1) 拿好康' }) },
        })
        expect(wrapper.find('.message-item__link').exists()).toBe(false)
        expect(wrapper.find('.message-item__content').text()).toContain('***')
    })

    it('mention segment 帶區別樣式 class', () => {
        const wrapper = mount(MessageItem, {
            props: { message: makeMessage({ content: '@小蜥蜴 你好' }), memberNames: ['小蜥蜴'] },
        })
        const mention = wrapper.find('.message-item__mention')
        expect(mention.exists()).toBe(true)
        expect(mention.text()).toBe('@小蜥蜴')
    })

    it('含 HTML 字串的 content 不產生對應 DOM 元素（無 v-html）', () => {
        const wrapper = mount(MessageItem, {
            props: { message: makeMessage({ content: '<img src=x onerror=alert(1)> https://example.com' }) },
        })
        // 此訊息無圖片/貼圖 → 不應有任何 <img>（注入的 <img> 必須是字面文字）
        expect(wrapper.findAll('img')).toHaveLength(0)
        expect(wrapper.find('.message-item__content').text()).toContain('<img src=x onerror=alert(1)>')
        expect(wrapper.find('.message-item__link').exists()).toBe(true)
    })
})

describe('MessageItem — 圖片延遲載入屬性（lazy/decoding）', () => {
    // /chat 一進頁載 50 則歷史、圖片垂直堆疊大量在視窗外 → lazy 延後視窗外圖片請求；
    // decoding=async 讓解碼不卡主執行緒。
    it('訊息圖片帶 loading="lazy" 與 decoding="async"', () => {
        const wrapper = mount(MessageItem, {
            props: {
                message: makeMessage({
                    content: null,
                    imageUrls: ['/mock-images/chat-image-1.jpg'],
                }),
            },
        })

        const img = wrapper.find('.message-item__image')
        expect(img.attributes('loading')).toBe('lazy')
        expect(img.attributes('decoding')).toBe('async')
    })

    it('貼圖帶 loading="lazy" 與 decoding="async"', () => {
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
        expect(sticker.attributes('loading')).toBe('lazy')
        expect(sticker.attributes('decoding')).toBe('async')
    })
})
