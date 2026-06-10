import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref, nextTick } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import ChatView from '@/views/ChatView.vue'
import BottomBar from '@/components/BottomBar.vue'
import type { MessageResponse } from '@/types/message'

vi.mock('vue-i18n', () => ({
    useI18n: () => ({ t: (key: string) => key }),
}))

const pushWarningSpy = vi.fn()
vi.mock('notivue', () => ({
    push: {
        warning: (...args: unknown[]) => pushWarningSpy(...args),
        success: vi.fn(),
        error: vi.fn(),
    },
}))

function makeMessage(overrides: Partial<MessageResponse>): MessageResponse {
    return {
        cursorId: 11,
        messageId: 'msg-001',
        userId: 'u-101',
        messageType: 'TEXT',
        furName: '毛毛',
        avatar: '/mock-images/avatar-default.png',
        content: 'hello',
        imageUrls: [],
        stickerImageUrl: null,
        createdDate: '2026-05-25T10:00:00',
        ...overrides,
    }
}

const profileRef = ref<any>({
    userId: 'u-101',
    username: '小毛',
    furName: '毛毛',
    avatar: '/mock-images/avatar-default.png',
    avatarColor: '#8c8672',
})

const messagesRef = ref<MessageResponse[]>([])
const loadingRef = ref(false)
const hasMoreRef = ref(false)
const kickedRef = ref(false)
const initSpy = vi.fn()
const reconnectSpy = vi.fn()
const disposeSpy = vi.fn()
const loadMoreSpy = vi.fn()
const sendChatMessageSpy = vi.fn()
const sendStickerMessageSpy = vi.fn()
const disconnectSpy = vi.fn()
const connectSpy = vi.fn()

vi.mock('@/composables/useUser', () => ({
    useUser: () => ({ profile: profileRef }),
}))

vi.mock('@/api/userApi', () => ({
    fetchProfileDetail: vi.fn().mockImplementation(async (userId: string) => ({
        userId,
        username: userId === 'u-101' ? '小毛' : `User-${userId}`,
        furName: userId === 'u-101' ? '毛毛' : `Fur-${userId}`,
        avatar: '/x.png',
        avatarColor: '#000',
        topicId: null,
        topic: null,
        tags: [],
        socials: [],
        stickers: [],
    })),
}))

vi.mock('@/composables/useChatMessages', () => ({
    useChatMessages: () => ({
        messages: messagesRef,
        loading: loadingRef,
        hasMore: hasMoreRef,
        loadMore: loadMoreSpy,
        init: initSpy,
        reconnect: reconnectSpy,
        dispose: disposeSpy,
        sendChatMessage: sendChatMessageSpy,
        sendStickerMessage: sendStickerMessageSpy,
        kicked: kickedRef,
        wsReconnecting: ref(false),
        wsFailed: ref(false),
    }),
}))

vi.mock('@/composables/useChatWebSocket', () => ({
    useChatWebSocket: () => ({
        connect: connectSpy,
        disconnect: disconnectSpy,
        send: vi.fn(),
        onMessage: vi.fn(() => () => {}),
        kicked: kickedRef,
        wsReconnecting: ref(false),
        wsFailed: ref(false),
        connectTime: ref<number | null>(null),
    }),
}))

describe('ChatView', () => {
    beforeEach(() => {
        profileRef.value = {
            userId: 'u-101',
            username: '小毛',
            furName: '毛毛',
            avatar: '/mock-images/avatar-default.png',
            avatarColor: '#8c8672',
        }
        messagesRef.value = [
            makeMessage({ cursorId: 11, messageId: 'msg-001', content: 'first', createdDate: '2026-05-25T10:00:00' }),
            makeMessage({ cursorId: 12, messageId: 'msg-002', content: 'second', createdDate: '2026-05-25T10:01:00' }),
        ]
        loadingRef.value = false
        hasMoreRef.value = false
        kickedRef.value = false
        initSpy.mockReset().mockResolvedValue(undefined)
        reconnectSpy.mockReset().mockResolvedValue(undefined)
        disposeSpy.mockReset()
        loadMoreSpy.mockReset().mockResolvedValue(undefined)
        sendChatMessageSpy.mockReset()
        sendStickerMessageSpy.mockReset()
        connectSpy.mockReset()
        disconnectSpy.mockReset()
        pushWarningSpy.mockReset()
    })

    it('初次載入訊息失敗時顯示 toast，不靜默也不導頁（Q2 白名單後的呼叫端保護）', async () => {
        initSpy.mockReset().mockRejectedValue(new Error('500'))
        mount(ChatView)
        await flushPromises()
        expect(pushWarningSpy).toHaveBeenCalled()
    })

    it('往上捲載入更多失敗時顯示 toast（loadMore 呼叫端保護）', async () => {
        hasMoreRef.value = true
        loadMoreSpy.mockReset().mockRejectedValue(new Error('500'))
        const wrapper = mount(ChatView, { attachTo: document.body })
        await flushPromises()

        const list = wrapper.find('.chat-view__list').element as HTMLElement
        Object.defineProperty(list, 'scrollHeight', { value: 1200, configurable: true })
        Object.defineProperty(list, 'clientHeight', { value: 600, configurable: true })
        Object.defineProperty(list, 'scrollTop', { value: 0, configurable: true, writable: true })

        await wrapper.find('.chat-view__list').trigger('scroll')
        await flushPromises()

        expect(pushWarningSpy).toHaveBeenCalled()
        wrapper.unmount()
    })

    it('calls init on mount and renders messages', async () => {
        const wrapper = mount(ChatView)
        await flushPromises()

        expect(initSpy).toHaveBeenCalled()
        expect(wrapper.findAll('.message-item')).toHaveLength(2)
        expect(wrapper.text()).toContain('first')
        expect(wrapper.text()).toContain('second')
    })

    it('shows placeholder when messages are empty', async () => {
        messagesRef.value = []
        const wrapper = mount(ChatView)
        await flushPromises()

        expect(wrapper.text()).toContain('目前沒有訊息')
    })

    it('opens the passport profile overlay with the correct user when an avatar is clicked', async () => {
        const wrapper = mount(ChatView, { attachTo: document.body })
        await wrapper.findAll('.message-item__avatar')[0].trigger('click')
        await flushPromises()
        await nextTick()

        const overlay = document.body.querySelector('.passport-overlay')
        expect(overlay).not.toBeNull()
        expect(overlay!.textContent).toContain('毛毛')
        wrapper.unmount()
    })

    it('opens SettingsModal when gear button is clicked', async () => {
        const wrapper = mount(ChatView, { attachTo: document.body })
        await wrapper.find('[data-btn="gear"]').trigger('click')
        await nextTick()

        expect(wrapper.find('.settings-modal').exists()).toBe(true)
        wrapper.unmount()
    })

    it('calls sendChatMessage when BottomBar emits send (no local optimistic append)', async () => {
        const wrapper = mount(ChatView)
        const before = wrapper.findAll('.message-item').length

        await wrapper.find('.bottom-bar__input').setValue('hi from test')
        await wrapper.find('[data-btn="send"]').trigger('click')
        await flushPromises()

        expect(sendChatMessageSpy).toHaveBeenCalledWith('hi from test', [])
        // 不做 optimistic local append — 等 broadcast 回來才出現
        expect(wrapper.findAll('.message-item').length).toBe(before)
    })

    it('loads more when scrolled near top and hasMore is true', async () => {
        hasMoreRef.value = true
        const wrapper = mount(ChatView, { attachTo: document.body })
        await flushPromises()

        const list = wrapper.find('.chat-view__list').element as HTMLElement
        Object.defineProperty(list, 'scrollHeight', { value: 1200, configurable: true })
        Object.defineProperty(list, 'clientHeight', { value: 600, configurable: true })
        Object.defineProperty(list, 'scrollTop', { value: 0, configurable: true, writable: true })

        await wrapper.find('.chat-view__list').trigger('scroll')
        await flushPromises()

        expect(loadMoreSpy).toHaveBeenCalled()
        wrapper.unmount()
    })

    it('shows KickedModal when kicked is true', async () => {
        kickedRef.value = true
        const wrapper = mount(ChatView)
        await flushPromises()

        expect(wrapper.find('[data-test="kicked-modal-backdrop"]').exists()).toBe(true)
    })

    it('calls useChatMessages.reconnect when KickedModal emits reconnect', async () => {
        kickedRef.value = true
        const wrapper = mount(ChatView)
        await flushPromises()

        await wrapper.find('[data-test="kicked-modal-reconnect"]').trigger('click')
        await flushPromises()

        expect(reconnectSpy).toHaveBeenCalled()
        expect(kickedRef.value).toBe(false)
    })

    it('calls dispose and disconnect on unmount', async () => {
        const wrapper = mount(ChatView)
        await flushPromises()

        wrapper.unmount()

        expect(disposeSpy).toHaveBeenCalled()
        expect(disconnectSpy).toHaveBeenCalled()
    })

    // --- own-send 強制捲底 / 圖片載入補捲 / 選檔後 focus ---

    function defineListMetrics(
        list: HTMLElement,
        { scrollHeight, clientHeight, scrollTop }: { scrollHeight: number; clientHeight: number; scrollTop: number },
    ) {
        Object.defineProperty(list, 'scrollHeight', { value: scrollHeight, configurable: true })
        Object.defineProperty(list, 'clientHeight', { value: clientHeight, configurable: true })
        Object.defineProperty(list, 'scrollTop', { value: scrollTop, configurable: true, writable: true })
    }

    it('自己送出文字訊息後，廣播進列表時即使非貼底也強制捲底', async () => {
        const wrapper = mount(ChatView, { attachTo: document.body })
        await flushPromises()

        const list = wrapper.find('.chat-view__list').element as HTMLElement
        defineListMetrics(list, { scrollHeight: 1200, clientHeight: 600, scrollTop: 200 })
        const scrollToSpy = vi.fn()
        ;(list as unknown as { scrollTo: typeof scrollToSpy }).scrollTo = scrollToSpy
        await wrapper.find('.chat-view__list').trigger('scroll') // isAtBottom -> false

        await wrapper.find('.bottom-bar__input').setValue('hello')
        await wrapper.find('[data-btn="send"]').trigger('click')
        await flushPromises()
        scrollToSpy.mockClear() // 排除 onSend 在訊息渲染前的那次捲動

        messagesRef.value = [...messagesRef.value, makeMessage({ cursorId: 13, messageId: 'msg-own', content: 'hello' })]
        await nextTick()
        await flushPromises()

        expect(scrollToSpy).toHaveBeenCalled()
        wrapper.unmount()
    })

    it('自己送出貼圖後，廣播進列表時即使非貼底也強制捲底', async () => {
        const wrapper = mount(ChatView, { attachTo: document.body })
        await flushPromises()

        const list = wrapper.find('.chat-view__list').element as HTMLElement
        defineListMetrics(list, { scrollHeight: 1200, clientHeight: 600, scrollTop: 200 })
        const scrollToSpy = vi.fn()
        ;(list as unknown as { scrollTo: typeof scrollToSpy }).scrollTo = scrollToSpy
        await wrapper.find('.chat-view__list').trigger('scroll')

        wrapper.findComponent(BottomBar).vm.$emit('sticker-select', '/stickers/a.png')
        await flushPromises()
        expect(sendStickerMessageSpy).toHaveBeenCalledWith('/stickers/a.png')
        scrollToSpy.mockClear()

        messagesRef.value = [...messagesRef.value, makeMessage({ cursorId: 14, messageId: 'msg-sticker', messageType: 'STICKER', content: '', stickerImageUrl: '/stickers/a.png' })]
        await nextTick()
        await flushPromises()

        expect(scrollToSpy).toHaveBeenCalled()
        wrapper.unmount()
    })

    it('他人新訊息到達時，非貼底不捲動（維持既有行為）', async () => {
        const wrapper = mount(ChatView, { attachTo: document.body })
        await flushPromises()

        const list = wrapper.find('.chat-view__list').element as HTMLElement
        defineListMetrics(list, { scrollHeight: 1200, clientHeight: 600, scrollTop: 200 })
        const scrollToSpy = vi.fn()
        ;(list as unknown as { scrollTo: typeof scrollToSpy }).scrollTo = scrollToSpy
        await wrapper.find('.chat-view__list').trigger('scroll')

        messagesRef.value = [...messagesRef.value, makeMessage({ cursorId: 15, messageId: 'msg-other', userId: 'u-202', content: 'yo' })]
        await nextTick()
        await flushPromises()

        expect(scrollToSpy).not.toHaveBeenCalled()
        wrapper.unmount()
    })

    it('空白輸入按送出不會殘留強制捲底旗標（之後他人訊息不被拉到底）', async () => {
        const wrapper = mount(ChatView, { attachTo: document.body })
        await flushPromises()

        const list = wrapper.find('.chat-view__list').element as HTMLElement
        defineListMetrics(list, { scrollHeight: 1200, clientHeight: 600, scrollTop: 200 })
        const scrollToSpy = vi.fn()
        ;(list as unknown as { scrollTo: typeof scrollToSpy }).scrollTo = scrollToSpy
        await wrapper.find('.chat-view__list').trigger('scroll')

        await wrapper.find('[data-btn="send"]').trigger('click') // 空輸入送出 = no-op
        await flushPromises()
        scrollToSpy.mockClear()

        messagesRef.value = [...messagesRef.value, makeMessage({ cursorId: 16, messageId: 'msg-other-2', userId: 'u-202', content: 'yo' })]
        await nextTick()
        await flushPromises()

        expect(scrollToSpy).not.toHaveBeenCalled()
        wrapper.unmount()
    })

    it('own-send 旗標只消費一次：自己的訊息捲底後，後續他人訊息在非貼底時不再強制捲底', async () => {
        const wrapper = mount(ChatView, { attachTo: document.body })
        await flushPromises()

        const list = wrapper.find('.chat-view__list').element as HTMLElement
        defineListMetrics(list, { scrollHeight: 1200, clientHeight: 600, scrollTop: 200 })
        const scrollToSpy = vi.fn()
        ;(list as unknown as { scrollTo: typeof scrollToSpy }).scrollTo = scrollToSpy
        await wrapper.find('.chat-view__list').trigger('scroll')

        await wrapper.find('.bottom-bar__input').setValue('hello')
        await wrapper.find('[data-btn="send"]').trigger('click')
        await flushPromises()
        messagesRef.value = [...messagesRef.value, makeMessage({ cursorId: 17, messageId: 'msg-own-2', content: 'hello' })]
        await nextTick()
        await flushPromises()
        expect(scrollToSpy).toHaveBeenCalled()
        scrollToSpy.mockClear()

        messagesRef.value = [...messagesRef.value, makeMessage({ cursorId: 18, messageId: 'msg-other-3', userId: 'u-202', content: 'yo' })]
        await nextTick()
        await flushPromises()

        expect(scrollToSpy).not.toHaveBeenCalled()
        wrapper.unmount()
    })

    it('own-send 捲底動畫尚未落底時圖片載入完成，仍補捲到底', async () => {
        const wrapper = mount(ChatView, { attachTo: document.body })
        await flushPromises()

        const list = wrapper.find('.chat-view__list').element as HTMLElement
        defineListMetrics(list, { scrollHeight: 1200, clientHeight: 600, scrollTop: 200 })
        const scrollToSpy = vi.fn()
        ;(list as unknown as { scrollTo: typeof scrollToSpy }).scrollTo = scrollToSpy
        await wrapper.find('.chat-view__list').trigger('scroll') // isAtBottom -> false

        await wrapper.find('.bottom-bar__input').setValue('pic')
        await wrapper.find('[data-btn="send"]').trigger('click')
        await flushPromises()
        messagesRef.value = [...messagesRef.value, makeMessage({ cursorId: 19, messageId: 'msg-own-img', content: '', imageUrls: ['/img/a.png'] })]
        await nextTick()
        await flushPromises()
        scrollToSpy.mockClear()
        // spy 不會真的捲動，scroll 事件沒發生 → isAtBottom 仍為 false，
        // 模擬「smooth 捲底動畫進行中」的窗口
        await wrapper.find('.message-item__image').trigger('load')
        await flushPromises()

        expect(scrollToSpy).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'auto' }))
        wrapper.unmount()
    })

    it('貼底狀態下圖片載入完成時，以 auto 行為補捲到底', async () => {
        messagesRef.value = [
            makeMessage({ cursorId: 11, messageId: 'msg-img', content: '', imageUrls: ['/img/a.png'] }),
        ]
        const wrapper = mount(ChatView, { attachTo: document.body })
        await flushPromises()

        const list = wrapper.find('.chat-view__list').element as HTMLElement
        defineListMetrics(list, { scrollHeight: 600, clientHeight: 600, scrollTop: 0 })
        const scrollToSpy = vi.fn()
        ;(list as unknown as { scrollTo: typeof scrollToSpy }).scrollTo = scrollToSpy
        await wrapper.find('.chat-view__list').trigger('scroll') // isAtBottom -> true

        await wrapper.find('.message-item__image').trigger('load')
        await flushPromises()

        expect(scrollToSpy).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'auto' }))
        wrapper.unmount()
    })

    it('非貼底狀態下圖片載入完成時不捲動', async () => {
        messagesRef.value = [
            makeMessage({ cursorId: 11, messageId: 'msg-img', content: '', imageUrls: ['/img/a.png'] }),
        ]
        const wrapper = mount(ChatView, { attachTo: document.body })
        await flushPromises()

        const list = wrapper.find('.chat-view__list').element as HTMLElement
        defineListMetrics(list, { scrollHeight: 1200, clientHeight: 600, scrollTop: 200 })
        const scrollToSpy = vi.fn()
        ;(list as unknown as { scrollTo: typeof scrollToSpy }).scrollTo = scrollToSpy
        await wrapper.find('.chat-view__list').trigger('scroll')

        await wrapper.find('.message-item__image').trigger('load')
        await flushPromises()

        expect(scrollToSpy).not.toHaveBeenCalled()
        wrapper.unmount()
    })

    it('選檔完成後 focus 回到訊息輸入框', async () => {
        const origCreateObjectURL = URL.createObjectURL
        URL.createObjectURL = vi.fn(() => 'blob:mock') as typeof URL.createObjectURL
        try {
            const wrapper = mount(ChatView, { attachTo: document.body })
            await flushPromises()

            const fileInput = wrapper.find('[data-testid="chat-image-picker"]')
            const file = new File(['x'], 'a.png', { type: 'image/png' })
            Object.defineProperty(fileInput.element, 'files', { value: [file], configurable: true })
            await fileInput.trigger('change')
            await nextTick()

            expect(document.activeElement).toBe(wrapper.find('.bottom-bar__input').element)
            wrapper.unmount()
        } finally {
            URL.createObjectURL = origCreateObjectURL
        }
    })
})
