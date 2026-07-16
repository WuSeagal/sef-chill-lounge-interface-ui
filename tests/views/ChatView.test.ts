import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref, nextTick } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import ChatView from '@/views/ChatView.vue'
import BottomBar from '@/components/BottomBar.vue'
import type { MessageResponse } from '@/types/message'
import type { Member } from '@/types/user'

vi.mock('vue-i18n', () => ({
    useI18n: () => ({ t: (key: string) => key }),
}))

const pushWarningSpy = vi.fn()
const pushErrorSpy = vi.fn()
vi.mock('notivue', () => ({
    push: {
        warning: (...args: unknown[]) => pushWarningSpy(...args),
        success: vi.fn(),
        error: (...args: unknown[]) => pushErrorSpy(...args),
    },
}))

// host 判定來源 + banned gate 來源：可控的假 auth store user（預設非 host、非 banned）。
const authUserHolder: { value: null | { providerUserId: string; banned?: boolean } } = { value: null }
vi.mock('@/stores/auth', () => ({
    useAuthStore: () => ({ get user() { return authUserHolder.value } }),
}))

const deleteMessageSpy = vi.fn()
vi.mock('@/api/messageApi', () => ({
    deleteMessage: (...args: unknown[]) => deleteMessageSpy(...args),
    fetchMessageHistory: vi.fn(),
}))

const uploadChatImageSpy = vi.fn(async (file: File) => ({ fileName: file.name, url: `/image/${file.name}` }))
vi.mock('@/api/imageUploadApi', () => ({
    uploadChatImage: (...args: [File]) => uploadChatImageSpy(...args),
    ImageUploadError: class ImageUploadError extends Error {
        code: number
        constructor(code: number, message: string) {
            super(message)
            this.code = code
        }
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
const initializedRef = ref(true)
const hasMoreRef = ref(false)
const kickedRef = ref(false)
const wsReconnectingRef = ref(false)
const wsFailedRef = ref(false)
const typingTypersRef = ref<Array<{ userId: string; furName: string | null; avatar: string | null; avatarColor: string | null }>>([])
const stopTypingSpy = vi.fn()
const disposeTypingSpy = vi.fn()
const initSpy = vi.fn()
const reconnectSpy = vi.fn()
const disposeSpy = vi.fn()
const loadMoreSpy = vi.fn()
const jumpToMessageSpy = vi.fn()
// 沿用真實 clearReplyPreviewFor 的行為（就地清空引用 targetMessageId 的回覆衍生欄位），
// 讓測試能觀察到 MessageItem 渲染出的「無法載入訊息」結果，而非只驗證 spy 被呼叫。
const clearReplyPreviewForSpy = vi.fn((targetMessageId: string) => {
    messagesRef.value = messagesRef.value.map((m) => m.replyToMessageId === targetMessageId
        ? { ...m, replyToUserId: null, replyToFurName: null, replyToContentSnippet: null, replyToCreatedDate: null }
        : m)
})
const sendChatMessageSpy = vi.fn(() => true)
const sendStickerMessageSpy = vi.fn(() => true)
const disconnectSpy = vi.fn()
const connectSpy = vi.fn()

const membersRef = ref<Member[]>([])
const membersErrorRef = ref<string | null>(null)
const refetchMembersSpy = vi.fn(async () => {})

// 捕捉透過 useChatWebSocket.onMessage 註冊的 subscriber，讓測試能 emit WS 事件。
const wsSubscribers: Array<(e: unknown) => void> = []
function emitWs(envelope: unknown) {
    wsSubscribers.forEach((cb) => cb(envelope))
}

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
        initialized: initializedRef,
        hasMore: hasMoreRef,
        loadMore: loadMoreSpy,
        jumpToMessage: jumpToMessageSpy,
        clearReplyPreviewFor: clearReplyPreviewForSpy,
        init: initSpy,
        reconnect: reconnectSpy,
        dispose: disposeSpy,
        setIsAtBottom: vi.fn(),
        sendChatMessage: sendChatMessageSpy,
        sendStickerMessage: sendStickerMessageSpy,
        kicked: kickedRef,
        wsReconnecting: wsReconnectingRef,
        wsFailed: wsFailedRef,
    }),
}))

vi.mock('@/composables/useChatWebSocket', () => ({
    useChatWebSocket: () => ({
        connect: connectSpy,
        disconnect: disconnectSpy,
        send: vi.fn(),
        onMessage: vi.fn((cb: (e: unknown) => void) => {
            wsSubscribers.push(cb)
            return () => {
                const i = wsSubscribers.indexOf(cb)
                if (i >= 0) wsSubscribers.splice(i, 1)
            }
        }),
        kicked: kickedRef,
        wsReconnecting: ref(false),
        wsFailed: ref(false),
        connectTime: ref<number | null>(null),
    }),
}))

vi.mock('@/composables/useMembers', () => ({
    useMembers: () => ({
        members: membersRef,
        loading: ref(false),
        error: membersErrorRef,
        refetch: refetchMembersSpy,
    }),
}))

vi.mock('@/composables/useTypingIndicator', () => ({
    useTypingIndicator: () => ({
        typers: typingTypersRef,
        stopTyping: stopTypingSpy,
        dispose: disposeTypingSpy,
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
        initializedRef.value = true
        hasMoreRef.value = false
        kickedRef.value = false
        initSpy.mockReset().mockResolvedValue(undefined)
        reconnectSpy.mockReset().mockResolvedValue(undefined)
        disposeSpy.mockReset()
        loadMoreSpy.mockReset().mockResolvedValue(undefined)
        jumpToMessageSpy.mockReset()
        sendChatMessageSpy.mockReset()
        sendStickerMessageSpy.mockReset()
        connectSpy.mockReset()
        disconnectSpy.mockReset()
        pushWarningSpy.mockReset()
        uploadChatImageSpy.mockClear()
        membersRef.value = []
        membersErrorRef.value = null
        refetchMembersSpy.mockReset().mockResolvedValue(undefined)
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

    it('renders a date divider above the first message and again only when the calendar day changes', async () => {
        messagesRef.value = [
            makeMessage({ cursorId: 11, messageId: 'msg-d1', content: 'day1-a', createdDate: '2026-07-06T09:00:00' }),
            makeMessage({ cursorId: 12, messageId: 'msg-d2', content: 'day1-b', createdDate: '2026-07-06T10:00:00' }),
            makeMessage({ cursorId: 13, messageId: 'msg-d3', content: 'day2-a', createdDate: '2026-07-07T09:00:00' }),
        ]
        const wrapper = mount(ChatView)
        await flushPromises()

        const dividers = wrapper.findAll('.date-divider')
        expect(dividers).toHaveLength(2)
        expect(dividers[0].text()).toBe('2026/07/06')
        expect(dividers[1].text()).toBe('2026/07/07')
    })

    it('shows placeholder when messages are empty', async () => {
        messagesRef.value = []
        const wrapper = mount(ChatView)
        await flushPromises()

        expect(wrapper.text()).toContain('目前沒有訊息')
    })

    it('首次載入未完成（initialized=false）時顯示載入動畫而非「目前沒有訊息」', async () => {
        messagesRef.value = []
        initializedRef.value = false
        const wrapper = mount(ChatView)
        await flushPromises()

        expect(wrapper.find('.chat-view__loading').exists()).toBe(true)
        expect(wrapper.text()).not.toContain('目前沒有訊息')
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

    it('已選圖片時雙擊送出鍵只會上傳與送出一次（iOS 雙擊防護：鎖須同步設定於 uploadAll 的 await 之前）', async () => {
        sendChatMessageSpy.mockReturnValue(true)
        const wrapper = mount(ChatView)
        await flushPromises()

        await wrapper.find('.bottom-bar__input').setValue('圖片訊息')
        const file = new File(['x'], 'a.png', { type: 'image/png' })
        await wrapper.findComponent(BottomBar).vm.$emit('image-paste', [file])
        await nextTick()

        const sendBtn = wrapper.find('[data-btn="send"]')
        // 模擬 iOS 雙擊/雙事件觸發：兩次呼叫中間不 await，落在同一輪同步執行內競爭。
        const p1 = sendBtn.trigger('click')
        const p2 = sendBtn.trigger('click')
        await Promise.all([p1, p2])
        await flushPromises()

        expect(uploadChatImageSpy).toHaveBeenCalledTimes(1)
        expect(sendChatMessageSpy).toHaveBeenCalledTimes(1)
    })

    it('圖片送出 action 完成後可正常送出下一則不同訊息', async () => {
        sendChatMessageSpy.mockReturnValue(true)
        const wrapper = mount(ChatView)
        await flushPromises()

        await wrapper.find('.bottom-bar__input').setValue('圖片訊息')
        const file = new File(['x'], 'a.png', { type: 'image/png' })
        await wrapper.findComponent(BottomBar).vm.$emit('image-paste', [file])
        await wrapper.find('[data-btn="send"]').trigger('click')
        await flushPromises()

        await wrapper.find('.bottom-bar__input').setValue('下一則')
        await wrapper.find('[data-btn="send"]').trigger('click')
        await flushPromises()

        expect(uploadChatImageSpy).toHaveBeenCalledTimes(1)
        expect(sendChatMessageSpy).toHaveBeenCalledTimes(2)
        expect(sendChatMessageSpy).toHaveBeenLastCalledWith('下一則', [])
    })

    it('clicking a message reply button shows the reply preview in BottomBar', async () => {
        messagesRef.value = [
            makeMessage({ cursorId: 11, messageId: 'msg-target', furName: '小白', content: '看看這張' }),
        ]
        const wrapper = mount(ChatView)
        await flushPromises()

        expect(wrapper.find('.bottom-bar__reply-preview').exists()).toBe(false)
        await wrapper.find('.message-item__reply-btn').trigger('click')

        const preview = wrapper.find('.bottom-bar__reply-preview')
        expect(preview.exists()).toBe(true)
        expect(preview.text()).toContain('小白')
        expect(preview.text()).toContain('看看這張')
    })

    it('cancelling the reply preview clears it', async () => {
        messagesRef.value = [
            makeMessage({ cursorId: 11, messageId: 'msg-target', furName: '小白', content: '看看這張' }),
        ]
        const wrapper = mount(ChatView)
        await flushPromises()
        await wrapper.find('.message-item__reply-btn').trigger('click')
        expect(wrapper.find('.bottom-bar__reply-preview').exists()).toBe(true)

        await wrapper.find('.bottom-bar__reply-preview-cancel').trigger('click')

        expect(wrapper.find('.bottom-bar__reply-preview').exists()).toBe(false)
    })

    it('sending while replying passes replyToMessageId and clears the preview after send', async () => {
        sendChatMessageSpy.mockReset().mockReturnValue(true)
        messagesRef.value = [
            makeMessage({ cursorId: 11, messageId: 'msg-target', furName: '小白', content: '看看這張' }),
        ]
        const wrapper = mount(ChatView)
        await flushPromises()
        await wrapper.find('.message-item__reply-btn').trigger('click')

        await wrapper.find('.bottom-bar__input').setValue('好可愛')
        await wrapper.find('[data-btn="send"]').trigger('click')
        await flushPromises()

        expect(sendChatMessageSpy).toHaveBeenCalledWith('好可愛', [], 'msg-target')
        expect(wrapper.find('.bottom-bar__reply-preview').exists()).toBe(false)
    })

    it('sending without an active reply still calls sendChatMessage with only 2 args (no regression)', async () => {
        sendChatMessageSpy.mockReset().mockReturnValue(true)
        const wrapper = mount(ChatView)
        await flushPromises()

        await wrapper.find('.bottom-bar__input').setValue('hi from test')
        await wrapper.find('[data-btn="send"]').trigger('click')
        await flushPromises()

        expect(sendChatMessageSpy).toHaveBeenCalledWith('hi from test', [])
    })

    it('sending a sticker while replying passes replyToMessageId and clears the preview after send（支援用貼圖回覆）', async () => {
        sendStickerMessageSpy.mockReset().mockReturnValue(true)
        messagesRef.value = [
            makeMessage({ cursorId: 11, messageId: 'msg-target', furName: '小白', content: '看看這張' }),
        ]
        const wrapper = mount(ChatView)
        await flushPromises()
        await wrapper.find('.message-item__reply-btn').trigger('click')
        expect(wrapper.find('.bottom-bar__reply-preview').exists()).toBe(true)

        await wrapper.findComponent(BottomBar).vm.$emit('sticker-select', '/sticker/u-1/1.png')
        await flushPromises()

        expect(sendStickerMessageSpy).toHaveBeenCalledWith('/sticker/u-1/1.png', 'msg-target')
        expect(wrapper.find('.bottom-bar__reply-preview').exists()).toBe(false)
    })

    it('sending a sticker without an active reply still calls sendStickerMessage with only 1 arg (no regression)', async () => {
        sendStickerMessageSpy.mockReset().mockReturnValue(true)
        const wrapper = mount(ChatView)
        await flushPromises()

        await wrapper.findComponent(BottomBar).vm.$emit('sticker-select', '/sticker/u-1/1.png')
        await flushPromises()

        expect(sendStickerMessageSpy).toHaveBeenCalledWith('/sticker/u-1/1.png')
    })

    it('sending a sticker while replying keeps the reply preview if the send fails (disconnected)', async () => {
        sendStickerMessageSpy.mockReset().mockReturnValue(false)
        messagesRef.value = [
            makeMessage({ cursorId: 11, messageId: 'msg-target', furName: '小白', content: '看看這張' }),
        ]
        const wrapper = mount(ChatView)
        await flushPromises()
        await wrapper.find('.message-item__reply-btn').trigger('click')

        await wrapper.findComponent(BottomBar).vm.$emit('sticker-select', '/sticker/u-1/1.png')
        await flushPromises()

        expect(wrapper.find('.bottom-bar__reply-preview').exists()).toBe(true)
    })

    it('點擊已載入目標的回覆示意塊直接高亮，不呼叫 jumpToMessage', async () => {
        messagesRef.value = [
            makeMessage({
                cursorId: 1, messageId: 'target-msg', furName: '小白', content: '看看這張',
                createdDate: '2026-05-25T10:00:00',
            }),
            makeMessage({
                cursorId: 2, messageId: 'reply-msg', furName: '毛毛', content: '好可愛',
                createdDate: '2026-05-25T10:05:00',
                replyToMessageId: 'target-msg', replyToUserId: 'u-101', replyToFurName: '小白',
                replyToContentSnippet: '看看這張', replyToCreatedDate: '2026-05-25T10:00:00',
            }),
        ]
        const wrapper = mount(ChatView, { attachTo: document.body })
        await flushPromises()

        await wrapper.find('.message-item__reply-ref').trigger('click')
        await flushPromises()

        expect(jumpToMessageSpy).not.toHaveBeenCalled()
        wrapper.unmount()
    })

    it('點擊未載入目標的回覆示意塊，jump-load 找到後高亮', async () => {
        messagesRef.value = [
            makeMessage({
                cursorId: 2, messageId: 'reply-msg', furName: '毛毛', content: '好可愛',
                createdDate: '2026-05-25T10:05:00',
                replyToMessageId: 'target-msg', replyToUserId: 'u-101', replyToFurName: '小白',
                replyToContentSnippet: '看看這張', replyToCreatedDate: '2026-05-25T10:00:00',
            }),
        ]
        jumpToMessageSpy.mockImplementation(async () => {
            messagesRef.value = [
                makeMessage({ cursorId: 1, messageId: 'target-msg', furName: '小白', content: '看看這張', createdDate: '2026-05-25T10:00:00' }),
                ...messagesRef.value,
            ]
            return 'found'
        })
        const wrapper = mount(ChatView, { attachTo: document.body })
        await flushPromises()

        await wrapper.find('.message-item__reply-ref').trigger('click')
        await flushPromises()

        expect(jumpToMessageSpy).toHaveBeenCalledWith('target-msg', '2026-05-25T10:00:00')
        expect(clearReplyPreviewForSpy).not.toHaveBeenCalled()
        wrapper.unmount()
    })

    it('點擊未載入目標的回覆示意塊，jump-load 找不到時該示意塊翻為「無法載入訊息」（不用 toast）', async () => {
        messagesRef.value = [
            makeMessage({
                cursorId: 2, messageId: 'reply-msg', furName: '毛毛', content: '好可愛',
                createdDate: '2026-05-25T10:05:00',
                replyToMessageId: 'target-msg', replyToUserId: 'u-101', replyToFurName: '小白',
                replyToContentSnippet: '看看這張', replyToCreatedDate: '2026-05-25T10:00:00',
            }),
        ]
        jumpToMessageSpy.mockResolvedValue('unresolvable')
        const wrapper = mount(ChatView, { attachTo: document.body })
        await flushPromises()

        await wrapper.find('.message-item__reply-ref').trigger('click')
        await flushPromises()

        expect(jumpToMessageSpy).toHaveBeenCalledWith('target-msg', '2026-05-25T10:00:00')
        expect(clearReplyPreviewForSpy).toHaveBeenCalledWith('target-msg')
        expect(wrapper.find('.message-item__reply-ref').text()).toContain('無法載入訊息')
        expect(pushWarningSpy).not.toHaveBeenCalled()
        expect(pushErrorSpy).not.toHaveBeenCalled()
        wrapper.unmount()
    })

    it('同一目標的跳轉進行中，重複點擊不會再觸發第二次 jumpToMessage', async () => {
        messagesRef.value = [
            makeMessage({
                cursorId: 2, messageId: 'reply-msg', furName: '毛毛', content: '好可愛',
                createdDate: '2026-05-25T10:05:00',
                replyToMessageId: 'target-msg', replyToUserId: 'u-101', replyToFurName: '小白',
                replyToContentSnippet: '看看這張', replyToCreatedDate: '2026-05-25T10:00:00',
            }),
        ]
        let resolveJump!: (v: 'found' | 'unresolvable') => void
        jumpToMessageSpy.mockImplementation(() => new Promise((resolve) => { resolveJump = resolve }))
        const wrapper = mount(ChatView, { attachTo: document.body })
        await flushPromises()

        await wrapper.find('.message-item__reply-ref').trigger('click')
        await wrapper.find('.message-item__reply-ref').trigger('click')
        expect(jumpToMessageSpy).toHaveBeenCalledTimes(1)

        resolveJump('unresolvable')
        await flushPromises()
        wrapper.unmount()
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

describe('ChatView scroll-fab 未讀 badge', () => {
    beforeEach(() => {
        profileRef.value = {
            userId: 'u-101', username: '小毛', furName: '毛毛',
            avatar: '/mock-images/avatar-default.png', avatarColor: '#8c8672',
        }
        messagesRef.value = [
            makeMessage({ cursorId: 11, messageId: 'msg-001', content: 'first' }),
            makeMessage({ cursorId: 12, messageId: 'msg-002', content: 'second' }),
        ]
        loadingRef.value = false
        initializedRef.value = true
        hasMoreRef.value = false
        kickedRef.value = false
        initSpy.mockReset().mockResolvedValue(undefined)
        loadMoreSpy.mockReset().mockResolvedValue(undefined)
        jumpToMessageSpy.mockReset()
        sendChatMessageSpy.mockReset().mockReturnValue(true)
        membersRef.value = []
        membersErrorRef.value = null
        refetchMembersSpy.mockReset().mockResolvedValue(undefined)
    })

    function defineListMetrics(
        list: HTMLElement,
        { scrollHeight, clientHeight, scrollTop }: { scrollHeight: number; clientHeight: number; scrollTop: number },
    ) {
        Object.defineProperty(list, 'scrollHeight', { value: scrollHeight, configurable: true })
        Object.defineProperty(list, 'clientHeight', { value: clientHeight, configurable: true })
        Object.defineProperty(list, 'scrollTop', { value: scrollTop, configurable: true, writable: true })
    }

    // 進入「非貼底」狀態（fab 顯示），回傳 list element 供後續調整 metrics
    async function enterScrolledUp(wrapper: ReturnType<typeof mount>): Promise<HTMLElement> {
        const list = wrapper.find('.chat-view__list').element as HTMLElement
        defineListMetrics(list, { scrollHeight: 1200, clientHeight: 600, scrollTop: 200 })
        ;(list as unknown as { scrollTo: () => void }).scrollTo = vi.fn()
        await wrapper.find('.chat-view__list').trigger('scroll')
        return list
    }

    it('非貼底時他人訊息到達，scroll-fab 顯示未讀計數 badge', async () => {
        const wrapper = mount(ChatView, { attachTo: document.body })
        await flushPromises()
        await enterScrolledUp(wrapper)

        for (let i = 0; i < 3; i++) {
            messagesRef.value = [...messagesRef.value, makeMessage({ cursorId: 20 + i, messageId: `other-${i}`, userId: 'u-202', content: 'yo' })]
            await nextTick()
            await flushPromises()
        }

        const badge = wrapper.find('.chat-view__scroll-fab-badge')
        expect(badge.exists()).toBe(true)
        expect(badge.text()).toBe('3')
        wrapper.unmount()
    })

    it('自己送出的訊息不計入未讀 badge', async () => {
        const wrapper = mount(ChatView, { attachTo: document.body })
        await flushPromises()
        await enterScrolledUp(wrapper)

        await wrapper.find('.bottom-bar__input').setValue('hello')
        await wrapper.find('[data-btn="send"]').trigger('click')
        await flushPromises()
        messagesRef.value = [...messagesRef.value, makeMessage({ cursorId: 30, messageId: 'own', content: 'hello' })]
        await nextTick()
        await flushPromises()

        expect(wrapper.find('.chat-view__scroll-fab-badge').exists()).toBe(false)
        wrapper.unmount()
    })

    // 每則 MessageItem 現多渲染回覆鈕（v-html SVG），一次掛載 100 則在 happy-dom + CI 併發
    // 負載下逼近預設 5000ms timeout，故此壓力測試個別放寬（斷言本身與回覆功能無關）。
    it('未讀超過 99 顯示 99+', async () => {
        const wrapper = mount(ChatView, { attachTo: document.body })
        await flushPromises()
        await enterScrolledUp(wrapper)

        const batch = Array.from({ length: 100 }, (_, i) =>
            makeMessage({ cursorId: 100 + i, messageId: `flood-${i}`, userId: 'u-202', content: 'x' }))
        messagesRef.value = [...messagesRef.value, ...batch]
        await nextTick()
        await flushPromises()

        expect(wrapper.find('.chat-view__scroll-fab-badge').text()).toBe('99+')
        wrapper.unmount()
    }, 15000)

    it('往上捲載入歷史（prepend）不增加未讀計數', async () => {
        const wrapper = mount(ChatView, { attachTo: document.body })
        await flushPromises()
        await enterScrolledUp(wrapper)

        // 先有 1 則未讀（tail append）
        messagesRef.value = [...messagesRef.value, makeMessage({ cursorId: 40, messageId: 'other-new', userId: 'u-202', content: 'yo' })]
        await nextTick()
        await flushPromises()
        expect(wrapper.find('.chat-view__scroll-fab-badge').text()).toBe('1')

        // 載入歷史：在「頭部」插入 5 則舊訊息，tail 不變 → 不應增加未讀
        const history = Array.from({ length: 5 }, (_, i) =>
            makeMessage({ cursorId: -i, messageId: `hist-${i}`, userId: 'u-303', content: 'old' }))
        messagesRef.value = [...history, ...messagesRef.value]
        await nextTick()
        await flushPromises()

        expect(wrapper.find('.chat-view__scroll-fab-badge').text()).toBe('1')
        wrapper.unmount()
    })

    it('點 scroll-fab 捲底後未讀歸零、badge 消失', async () => {
        const wrapper = mount(ChatView, { attachTo: document.body })
        await flushPromises()
        await enterScrolledUp(wrapper)

        messagesRef.value = [...messagesRef.value, makeMessage({ cursorId: 50, messageId: 'other-x', userId: 'u-202', content: 'yo' })]
        await nextTick()
        await flushPromises()
        expect(wrapper.find('.chat-view__scroll-fab-badge').exists()).toBe(true)

        await wrapper.find('.chat-view__scroll-fab').trigger('click')
        await nextTick()

        expect(wrapper.find('.chat-view__scroll-fab-badge').exists()).toBe(false)
        wrapper.unmount()
    })

    it('手動捲到底（進入貼底）後未讀歸零、badge 消失', async () => {
        const wrapper = mount(ChatView, { attachTo: document.body })
        await flushPromises()
        const list = await enterScrolledUp(wrapper)

        messagesRef.value = [...messagesRef.value, makeMessage({ cursorId: 60, messageId: 'other-y', userId: 'u-202', content: 'yo' })]
        await nextTick()
        await flushPromises()
        expect(wrapper.find('.chat-view__scroll-fab-badge').exists()).toBe(true)

        // 捲到底：distance = scrollHeight - scrollTop - clientHeight <= 80
        defineListMetrics(list, { scrollHeight: 1200, clientHeight: 600, scrollTop: 600 })
        await wrapper.find('.chat-view__list').trigger('scroll')
        await nextTick()

        expect(wrapper.find('.chat-view__scroll-fab-badge').exists()).toBe(false)
        wrapper.unmount()
    })

    it('重連（reconnect）全量重載後未讀歸零，不殘留重載期間累計', async () => {
        const wrapper = mount(ChatView, { attachTo: document.body })
        await flushPromises()
        await enterScrolledUp(wrapper) // 非貼底（scrollTo 已 mock，重連後不會真的捲底偵測歸零）

        // 模擬 reconnect → loadInitial 全量重載：以更長的全新列表取代 messages
        reconnectSpy.mockReset().mockImplementation(async () => {
            messagesRef.value = Array.from({ length: 6 }, (_, i) =>
                makeMessage({ cursorId: 200 + i, messageId: `re-${i}`, userId: 'u-202', content: 'reload' }))
        })
        kickedRef.value = true
        await nextTick()

        await wrapper.find('[data-test="kicked-modal-reconnect"]').trigger('click')
        await flushPromises()

        expect(reconnectSpy).toHaveBeenCalled()
        expect(wrapper.find('.chat-view__scroll-fab-badge').exists()).toBe(false)
        wrapper.unmount()
    })

    it('scroll-fab 的 aria-label 隨未讀計數更新', async () => {
        const wrapper = mount(ChatView, { attachTo: document.body })
        await flushPromises()
        await enterScrolledUp(wrapper)

        for (let i = 0; i < 2; i++) {
            messagesRef.value = [...messagesRef.value, makeMessage({ cursorId: 70 + i, messageId: `aria-${i}`, userId: 'u-202', content: 'yo' })]
            await nextTick()
            await flushPromises()
        }

        const label = wrapper.find('.chat-view__scroll-fab').attributes('aria-label') ?? ''
        expect(label).toContain('2 則新訊息')
        wrapper.unmount()
    })
})

describe('ChatView @mention 接線', () => {
    beforeEach(() => {
        messagesRef.value = []
        membersRef.value = []
        membersErrorRef.value = null
        refetchMembersSpy.mockReset().mockResolvedValue(undefined)
        pushWarningSpy.mockReset()
        initSpy.mockReset().mockResolvedValue(undefined)
    })

    it('mount 時呼叫 useMembers.refetch', async () => {
        mount(ChatView)
        await flushPromises()
        expect(refetchMembersSpy).toHaveBeenCalled()
    })

    it('refetch 後 error 有值 → 顯示 toast', async () => {
        refetchMembersSpy.mockReset().mockImplementation(async () => {
            membersErrorRef.value = '載入成員列表失敗'
        })
        mount(ChatView)
        await flushPromises()
        expect(pushWarningSpy).toHaveBeenCalled()
    })

    it('選取 mention 後 inputValue 為 token 取代結果，並呼叫 BottomBar setCaret', async () => {
        membersRef.value = [
            { userId: 'u-1', username: 'liz', furName: '小蜥蜴', avatar: null, avatarColor: null },
        ]
        const wrapper = mount(ChatView, { attachTo: document.body })
        await flushPromises()

        const input = wrapper.find('.bottom-bar__input')
        const ta = input.element as HTMLTextAreaElement
        ta.value = '哈囉 @小'
        ta.selectionStart = 5
        await input.trigger('input')
        await nextTick()

        // popup 應出現 mention 選項
        const option = wrapper.find('[data-test=af-option-u-1]')
        expect(option.exists()).toBe(true)
        await option.trigger('mousedown')
        await flushPromises()
        await nextTick()

        // 取代結果 + 游標經 BottomBar.setCaret 落在插入文字之後（observable effect）
        expect(ta.value).toBe('哈囉 @小蜥蜴 ')
        expect(ta.selectionStart).toBe('哈囉 @小蜥蜴 '.length)
        expect(document.activeElement).toBe(ta)
        wrapper.unmount()
    })
})

describe('ChatView 離站確認窗', () => {
    beforeEach(() => {
        membersRef.value = []
        membersErrorRef.value = null
        refetchMembersSpy.mockReset().mockResolvedValue(undefined)
        initSpy.mockReset().mockResolvedValue(undefined)
    })

    it('點訊息內連結 → 開啟 ConfirmDialog 且顯示完整 URL（punycode 照原樣）', async () => {
        messagesRef.value = [makeMessage({ messageId: 'm-link', content: '看 https://xn--80ak6aa92e.com/a' })]
        const wrapper = mount(ChatView, { attachTo: document.body })
        await flushPromises()

        expect(document.body.querySelector('.confirm-dialog')).toBeNull()
        await wrapper.find('.message-item__link').trigger('click')
        await nextTick()

        const dialog = document.body.querySelector('.confirm-dialog')
        expect(dialog).not.toBeNull()
        expect(dialog!.textContent).toContain('https://xn--80ak6aa92e.com/a')
        wrapper.unmount()
    })

    it('確認 → window.open(url, _blank, noopener,noreferrer) 並關窗', async () => {
        const openSpy = vi.fn()
        const origOpen = window.open
        window.open = openSpy as typeof window.open
        try {
            messagesRef.value = [makeMessage({ messageId: 'm-link', content: 'go https://example.com/x' })]
            const wrapper = mount(ChatView, { attachTo: document.body })
            await flushPromises()

            await wrapper.find('.message-item__link').trigger('click')
            await nextTick()
            const confirmBtn = document.body.querySelector('.confirm-dialog__confirm') as HTMLButtonElement
            confirmBtn.click()
            await nextTick()

            expect(openSpy).toHaveBeenCalledWith('https://example.com/x', '_blank', 'noopener,noreferrer')
            expect(document.body.querySelector('.confirm-dialog')).toBeNull()
            wrapper.unmount()
        } finally {
            window.open = origOpen
        }
    })

    it('取消 → 不呼叫 window.open，關窗', async () => {
        const openSpy = vi.fn()
        const origOpen = window.open
        window.open = openSpy as typeof window.open
        try {
            messagesRef.value = [makeMessage({ messageId: 'm-link', content: 'go https://example.com/x' })]
            const wrapper = mount(ChatView, { attachTo: document.body })
            await flushPromises()

            await wrapper.find('.message-item__link').trigger('click')
            await nextTick()
            const cancelBtn = document.body.querySelector('.confirm-dialog__cancel') as HTMLButtonElement
            cancelBtn.click()
            await nextTick()

            expect(openSpy).not.toHaveBeenCalled()
            expect(document.body.querySelector('.confirm-dialog')).toBeNull()
            wrapper.unmount()
        } finally {
            window.open = origOpen
        }
    })
})

describe('ChatView mention 名單即時刷新', () => {
    beforeEach(() => {
        wsSubscribers.length = 0
        messagesRef.value = [makeMessage({ messageId: 'seed', content: 'seed' })]
        membersRef.value = [{ userId: 'u-known', username: 'k', furName: '已知', avatar: null, avatarColor: null }]
        membersErrorRef.value = null
        refetchMembersSpy.mockReset().mockResolvedValue(undefined)
        initSpy.mockReset().mockResolvedValue(undefined)
    })

    it('PROFILE_UPDATED 帶不在名單的 userId → refetch members', async () => {
        const wrapper = mount(ChatView)
        await flushPromises()
        refetchMembersSpy.mockClear() // 排除 mount 時那次

        emitWs({ type: 'PROFILE_UPDATED', timestamp: 1, data: { userId: 'u-new', furName: '新人', avatar: null, avatarColor: null, avatarBorder: false } })
        await flushPromises()

        expect(refetchMembersSpy).toHaveBeenCalled()
        wrapper.unmount()
    })

    it('PRESENCE_SNAPSHOT 含未知 online id → refetch members', async () => {
        const wrapper = mount(ChatView)
        await flushPromises()
        refetchMembersSpy.mockClear()

        emitWs({ type: 'PRESENCE_SNAPSHOT', timestamp: 1, data: { onlineUserIds: ['u-known', 'u-brandnew'] } })
        await flushPromises()

        expect(refetchMembersSpy).toHaveBeenCalled()
        wrapper.unmount()
    })

    it('同一未知 id 重複事件 → 只 refetch 一次（避免廣播風暴/不收斂）', async () => {
        const wrapper = mount(ChatView)
        await flushPromises()
        refetchMembersSpy.mockClear()

        // 第一次未知 id → refetch
        emitWs({ type: 'PRESENCE_SNAPSHOT', timestamp: 1, data: { onlineUserIds: ['u-known', 'u-ghost'] } })
        await flushPromises()
        expect(refetchMembersSpy).toHaveBeenCalledTimes(1)

        // refetch 後該 id 仍未進名單（divergent / 失敗）；同 id 再來不應再 refetch
        emitWs({ type: 'PRESENCE_SNAPSHOT', timestamp: 2, data: { onlineUserIds: ['u-known', 'u-ghost'] } })
        await flushPromises()
        expect(refetchMembersSpy).toHaveBeenCalledTimes(1)

        wrapper.unmount()
    })

    it('PRESENCE_SNAPSHOT 全部已知 id → 不 refetch', async () => {
        const wrapper = mount(ChatView)
        await flushPromises()
        refetchMembersSpy.mockClear()

        emitWs({ type: 'PRESENCE_SNAPSHOT', timestamp: 1, data: { onlineUserIds: ['u-known'] } })
        await flushPromises()

        expect(refetchMembersSpy).not.toHaveBeenCalled()
        wrapper.unmount()
    })

    it('unmount 後不再接收 WS 事件（已 unsub）', async () => {
        const wrapper = mount(ChatView)
        await flushPromises()
        wrapper.unmount()
        refetchMembersSpy.mockClear()

        emitWs({ type: 'PROFILE_UPDATED', timestamp: 1, data: { userId: 'u-new2', furName: 'x', avatar: null, avatarColor: null, avatarBorder: false } })
        await flushPromises()

        expect(refetchMembersSpy).not.toHaveBeenCalled()
    })
})

describe('ChatView autofiller 點外部關閉', () => {
    beforeEach(() => {
        messagesRef.value = []
        membersRef.value = [{ userId: 'u-1', username: 'liz', furName: '小蜥蜴', avatar: null, avatarColor: null }]
        membersErrorRef.value = null
        refetchMembersSpy.mockReset().mockResolvedValue(undefined)
        initSpy.mockReset().mockResolvedValue(undefined)
    })

    async function openMentionPopup(wrapper: ReturnType<typeof mount>) {
        const input = wrapper.find('.bottom-bar__input')
        ;(input.element as HTMLTextAreaElement).value = '@'
        ;(input.element as HTMLTextAreaElement).selectionStart = 1
        await input.trigger('input')
        await nextTick()
        return input
    }

    it('點 popup / textarea 以外的地方 → 關閉 autofiller', async () => {
        const wrapper = mount(ChatView, { attachTo: document.body })
        await flushPromises()
        await openMentionPopup(wrapper)
        expect(wrapper.find('.autofiller-popup').exists()).toBe(true)

        document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
        await nextTick()

        expect(wrapper.find('.autofiller-popup').exists()).toBe(false)
        wrapper.unmount()
    })

    it('點 textarea 內不關閉', async () => {
        const wrapper = mount(ChatView, { attachTo: document.body })
        await flushPromises()
        const input = await openMentionPopup(wrapper)
        expect(wrapper.find('.autofiller-popup').exists()).toBe(true)

        input.element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
        await nextTick()

        expect(wrapper.find('.autofiller-popup').exists()).toBe(true)
        wrapper.unmount()
    })

    it('點 popup 內的選項仍正常選取（outside 監聽不攔截）', async () => {
        const wrapper = mount(ChatView, { attachTo: document.body })
        await flushPromises()
        const input = await openMentionPopup(wrapper)
        const option = wrapper.find('[data-test=af-option-u-1]')
        expect(option.exists()).toBe(true)

        await option.trigger('mousedown')
        await flushPromises()
        await nextTick()

        // 選取成功插入 @小蜥蜴（證明 outside 監聽沒有把點選項誤判為關閉）
        expect((input.element as HTMLTextAreaElement).value).toBe('@小蜥蜴 ')
        wrapper.unmount()
    })

    it('unmount 後移除 document 監聽（不殘留）', async () => {
        const wrapper = mount(ChatView, { attachTo: document.body })
        await flushPromises()
        wrapper.unmount()
        // 不應拋錯（監聽已移除）
        expect(() => document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))).not.toThrow()
    })
})

describe('ChatView 主持人公告 banner', () => {
    beforeEach(() => {
        wsSubscribers.length = 0
        profileRef.value = { userId: 'u-101', username: '小毛', furName: '毛毛', avatar: '/mock-images/avatar-default.png', avatarColor: '#8c8672' }
        messagesRef.value = [makeMessage({ cursorId: 11, messageId: 'm1', content: 'a' })]
        loadingRef.value = false
        initializedRef.value = true
        hasMoreRef.value = false
        kickedRef.value = false
        membersRef.value = []
        membersErrorRef.value = null
        refetchMembersSpy.mockReset().mockResolvedValue(undefined)
        initSpy.mockReset().mockResolvedValue(undefined)
        authUserHolder.value = null
    })

    function mockListScroll(wrapper: ReturnType<typeof mount>) {
        ;(wrapper.find('.chat-view__list').element as unknown as { scrollTo: () => void }).scrollTo = vi.fn()
    }

    it('收到 ANNOUNCEMENT 顯示頂端 banner 純文字', async () => {
        const wrapper = mount(ChatView, { attachTo: document.body })
        await flushPromises()
        mockListScroll(wrapper)

        emitWs({ type: 'ANNOUNCEMENT', timestamp: 1, data: { text: '18:00 抽獎' } })
        await nextTick()

        expect(wrapper.find('.announcement-banner').exists()).toBe(true)
        expect(wrapper.find('.announcement-banner__text').text()).toBe('18:00 抽獎')
        wrapper.unmount()
    })

    it('收到空 ANNOUNCEMENT 移除 banner', async () => {
        const wrapper = mount(ChatView, { attachTo: document.body })
        await flushPromises()
        mockListScroll(wrapper)

        emitWs({ type: 'ANNOUNCEMENT', timestamp: 1, data: { text: 'x' } })
        await nextTick()
        expect(wrapper.find('.announcement-banner').exists()).toBe(true)

        emitWs({ type: 'ANNOUNCEMENT', timestamp: 2, data: { text: null } })
        await nextTick()
        expect(wrapper.find('.announcement-banner').exists()).toBe(false)
        wrapper.unmount()
    })

    it('banner 為浮層（.chat-view__announcement，位於訊息列之外）', async () => {
        const wrapper = mount(ChatView, { attachTo: document.body })
        await flushPromises()
        mockListScroll(wrapper)

        emitWs({ type: 'ANNOUNCEMENT', timestamp: 1, data: { text: 'x' } })
        await nextTick()

        expect(wrapper.find('.chat-view__announcement').exists()).toBe(true)
        // 浮層是 list 的兄弟、不在 .chat-view__list 內（不佔列內空間）
        expect(wrapper.find('.chat-view__list .chat-view__announcement').exists()).toBe(false)
        wrapper.unmount()
    })
})

describe('ChatView 未讀分隔線', () => {
    beforeEach(() => {
        profileRef.value = { userId: 'u-101', username: '小毛', furName: '毛毛', avatar: '/mock-images/avatar-default.png', avatarColor: '#8c8672' }
        messagesRef.value = [
            makeMessage({ cursorId: 11, messageId: 'msg-001', content: 'first' }),
            makeMessage({ cursorId: 12, messageId: 'msg-002', content: 'second' }),
        ]
        loadingRef.value = false
        initializedRef.value = true
        hasMoreRef.value = false
        kickedRef.value = false
        initSpy.mockReset().mockResolvedValue(undefined)
        reconnectSpy.mockReset().mockResolvedValue(undefined)
        loadMoreSpy.mockReset().mockResolvedValue(undefined)
        jumpToMessageSpy.mockReset()
        sendChatMessageSpy.mockReset().mockReturnValue(true)
        membersRef.value = []
        membersErrorRef.value = null
        refetchMembersSpy.mockReset().mockResolvedValue(undefined)
        authUserHolder.value = null
    })

    function defineListMetrics(
        list: HTMLElement,
        { scrollHeight, clientHeight, scrollTop }: { scrollHeight: number; clientHeight: number; scrollTop: number },
    ) {
        Object.defineProperty(list, 'scrollHeight', { value: scrollHeight, configurable: true })
        Object.defineProperty(list, 'clientHeight', { value: clientHeight, configurable: true })
        Object.defineProperty(list, 'scrollTop', { value: scrollTop, configurable: true, writable: true })
    }

    async function enterScrolledUp(wrapper: ReturnType<typeof mount>): Promise<HTMLElement> {
        const list = wrapper.find('.chat-view__list').element as HTMLElement
        defineListMetrics(list, { scrollHeight: 1200, clientHeight: 600, scrollTop: 200 })
        ;(list as unknown as { scrollTo: () => void }).scrollTo = vi.fn()
        await wrapper.find('.chat-view__list').trigger('scroll')
        return list
    }

    it('非貼底他人新訊息 → 第一則未讀上方出現分隔線「新訊息 ↓」', async () => {
        const wrapper = mount(ChatView, { attachTo: document.body })
        await flushPromises()
        await enterScrolledUp(wrapper)

        messagesRef.value = [...messagesRef.value, makeMessage({ cursorId: 20, messageId: 'other-1', userId: 'u-202', content: 'yo' })]
        await nextTick()
        await flushPromises()

        expect(wrapper.find('.unread-divider').exists()).toBe(true)
        expect(wrapper.find('.unread-divider__pill').text()).toBe('新訊息')
        wrapper.unmount()
    })

    it('自己送出的訊息不觸發分隔線', async () => {
        const wrapper = mount(ChatView, { attachTo: document.body })
        await flushPromises()
        await enterScrolledUp(wrapper)

        await wrapper.find('.bottom-bar__input').setValue('hi')
        await wrapper.find('[data-btn="send"]').trigger('click')
        await flushPromises()
        messagesRef.value = [...messagesRef.value, makeMessage({ cursorId: 21, messageId: 'own-1', content: 'hi' })]
        await nextTick()
        await flushPromises()

        expect(wrapper.find('.unread-divider').exists()).toBe(false)
        wrapper.unmount()
    })

    it('往上捲載入歷史（prepend）不觸發分隔線', async () => {
        const wrapper = mount(ChatView, { attachTo: document.body })
        await flushPromises()
        await enterScrolledUp(wrapper)

        const hist = Array.from({ length: 3 }, (_, i) =>
            makeMessage({ cursorId: -i, messageId: `h-${i}`, userId: 'u-303', content: 'old' }))
        messagesRef.value = [...hist, ...messagesRef.value]
        await nextTick()
        await flushPromises()

        expect(wrapper.find('.unread-divider').exists()).toBe(false)
        wrapper.unmount()
    })

    it('顯示中再來新訊息仍只有一條分隔線（邊界凍結、不重複）', async () => {
        const wrapper = mount(ChatView, { attachTo: document.body })
        await flushPromises()
        await enterScrolledUp(wrapper)

        messagesRef.value = [...messagesRef.value, makeMessage({ cursorId: 20, messageId: 'o1', userId: 'u-202', content: 'a' })]
        await nextTick(); await flushPromises()
        messagesRef.value = [...messagesRef.value, makeMessage({ cursorId: 21, messageId: 'o2', userId: 'u-202', content: 'b' })]
        await nextTick(); await flushPromises()

        expect(wrapper.findAll('.unread-divider').length).toBe(1)
        expect(wrapper.find('.unread-divider__pill').text()).toBe('新訊息')
        wrapper.unmount()
    })

    it('回到貼底不清除分隔線；滾到底起算 15 秒後淡出並移除', async () => {
        const wrapper = mount(ChatView, { attachTo: document.body })
        await flushPromises()
        const list = await enterScrolledUp(wrapper)

        messagesRef.value = [...messagesRef.value, makeMessage({ cursorId: 22, messageId: 'other-2', userId: 'u-202', content: 'yo' })]
        await nextTick(); await flushPromises()
        expect(wrapper.find('.unread-divider').exists()).toBe(true)

        vi.useFakeTimers()
        try {
            // 回到貼底（distance <= 80）→ 不清除，改啟動 15 秒倒數
            defineListMetrics(list, { scrollHeight: 1200, clientHeight: 600, scrollTop: 600 })
            await wrapper.find('.chat-view__list').trigger('scroll')
            await nextTick()
            expect(wrapper.find('.unread-divider').exists()).toBe(true)

            // 15 秒倒數到 → 進入淡出
            vi.advanceTimersByTime(15000)
            await nextTick()
            // 淡出動畫窗結束 → 移除
            vi.advanceTimersByTime(500)
            await nextTick()
            expect(wrapper.find('.unread-divider').exists()).toBe(false)
        } finally {
            vi.useRealTimers()
        }
        wrapper.unmount()
    })

    it('重連清除分隔線', async () => {
        const wrapper = mount(ChatView, { attachTo: document.body })
        await flushPromises()
        await enterScrolledUp(wrapper)

        messagesRef.value = [...messagesRef.value, makeMessage({ cursorId: 23, messageId: 'other-3', userId: 'u-202', content: 'yo' })]
        await nextTick(); await flushPromises()
        expect(wrapper.find('.unread-divider').exists()).toBe(true)

        kickedRef.value = true
        await nextTick()
        await wrapper.find('[data-test="kicked-modal-reconnect"]').trigger('click')
        await flushPromises()

        expect(wrapper.find('.unread-divider').exists()).toBe(false)
        wrapper.unmount()
    })
})

describe('ChatView host 刪除訊息', () => {
    beforeEach(() => {
        messagesRef.value = [
            makeMessage({ cursorId: 11, messageId: 'msg-001', content: 'first' }),
            makeMessage({ cursorId: 12, messageId: 'msg-002', content: 'second' }),
        ]
        initializedRef.value = true
        hasMoreRef.value = false
        kickedRef.value = false
        membersRef.value = []
        membersErrorRef.value = null
        refetchMembersSpy.mockReset().mockResolvedValue(undefined)
        initSpy.mockReset().mockResolvedValue(undefined)
        deleteMessageSpy.mockReset().mockResolvedValue(undefined)
        pushErrorSpy.mockReset()
        authUserHolder.value = { providerUserId: '111427449810799428954' } // host
    })

    afterEach(() => {
        authUserHolder.value = null
    })

    it('host 每則訊息顯示刪除鈕', async () => {
        const wrapper = mount(ChatView)
        await flushPromises()
        expect(wrapper.findAll('.message-item__delete').length).toBe(2)
        wrapper.unmount()
    })

    it('非 host 不顯示刪除鈕', async () => {
        authUserHolder.value = { providerUserId: 'not-host' }
        const wrapper = mount(ChatView)
        await flushPromises()
        expect(wrapper.find('.message-item__delete').exists()).toBe(false)
        wrapper.unmount()
    })

    it('點刪除鈕開確認框；確認後呼叫 deleteMessage 並關窗，畫面不做樂觀移除', async () => {
        const wrapper = mount(ChatView, { attachTo: document.body })
        await flushPromises()
        const before = wrapper.findAll('.message-item').length

        await wrapper.findAll('.message-item__delete')[0].trigger('click')
        await nextTick()
        const dialog = document.body.querySelector('.confirm-dialog')
        expect(dialog).not.toBeNull()
        expect(dialog!.textContent).toContain('確定刪除這則訊息')

        ;(document.body.querySelector('.confirm-dialog__confirm') as HTMLButtonElement).click()
        await flushPromises()

        expect(deleteMessageSpy).toHaveBeenCalledWith('msg-001')
        expect(document.body.querySelector('.confirm-dialog')).toBeNull()
        expect(wrapper.findAll('.message-item').length).toBe(before)
        wrapper.unmount()
    })

    it('取消確認框不呼叫 deleteMessage', async () => {
        const wrapper = mount(ChatView, { attachTo: document.body })
        await flushPromises()

        await wrapper.findAll('.message-item__delete')[0].trigger('click')
        await nextTick()
        ;(document.body.querySelector('.confirm-dialog__cancel') as HTMLButtonElement).click()
        await nextTick()

        expect(deleteMessageSpy).not.toHaveBeenCalled()
        expect(document.body.querySelector('.confirm-dialog')).toBeNull()
        wrapper.unmount()
    })

    it('deleteMessage 失敗時顯示錯誤 toast', async () => {
        deleteMessageSpy.mockReset().mockRejectedValue(new Error('500'))
        const wrapper = mount(ChatView, { attachTo: document.body })
        await flushPromises()

        await wrapper.findAll('.message-item__delete')[0].trigger('click')
        await nextTick()
        ;(document.body.querySelector('.confirm-dialog__confirm') as HTMLButtonElement).click()
        await flushPromises()

        expect(pushErrorSpy).toHaveBeenCalled()
        wrapper.unmount()
    })
})

describe('ChatView 連線重連 overlay', () => {
    beforeEach(() => {
        profileRef.value = { userId: 'u-101', username: '小毛', furName: '毛毛', avatar: '/mock-images/avatar-default.png', avatarColor: '#8c8672' }
        messagesRef.value = [makeMessage({ cursorId: 11, messageId: 'm1', content: 'a' })]
        loadingRef.value = false
        initializedRef.value = true
        hasMoreRef.value = false
        kickedRef.value = false
        wsReconnectingRef.value = false
        wsFailedRef.value = false
        membersRef.value = []
        membersErrorRef.value = null
        refetchMembersSpy.mockReset().mockResolvedValue(undefined)
        initSpy.mockReset().mockResolvedValue(undefined)
        authUserHolder.value = null
    })

    afterEach(() => {
        wsReconnectingRef.value = false
        wsFailedRef.value = false
    })

    it('連線正常（皆 false）時不渲染 overlay', async () => {
        const wrapper = mount(ChatView)
        await flushPromises()
        expect(wrapper.find('[data-test="reconnect-overlay"]').exists()).toBe(false)
        wrapper.unmount()
    })

    it('wsReconnecting=true → overlay 顯示「重新連線中」、無重新整理按鈕', async () => {
        wsReconnectingRef.value = true
        const wrapper = mount(ChatView)
        await flushPromises()
        expect(wrapper.find('[data-test="reconnect-overlay"]').exists()).toBe(true)
        expect(wrapper.text()).toContain('重新連線中')
        expect(wrapper.find('[data-test="reconnect-overlay-refresh"]').exists()).toBe(false)
        wrapper.unmount()
    })

    it('wsFailed=true → overlay 顯示「連線已中斷」+ 重新整理按鈕', async () => {
        // 真實失敗終態：達上限後 wsReconnecting 不被重置，故兩者同時為真（failed 優先）
        wsReconnectingRef.value = true
        wsFailedRef.value = true
        const wrapper = mount(ChatView)
        await flushPromises()
        expect(wrapper.find('[data-test="reconnect-overlay"]').exists()).toBe(true)
        expect(wrapper.text()).toContain('連線已中斷')
        expect(wrapper.find('[data-test="reconnect-overlay-refresh"]').exists()).toBe(true)
        wrapper.unmount()
    })

    it('重連成功（true→false）後 overlay 消失', async () => {
        wsReconnectingRef.value = true
        const wrapper = mount(ChatView)
        await flushPromises()
        expect(wrapper.find('[data-test="reconnect-overlay"]').exists()).toBe(true)

        wsReconnectingRef.value = false
        await nextTick()
        expect(wrapper.find('[data-test="reconnect-overlay"]').exists()).toBe(false)
        wrapper.unmount()
    })
})

describe('ChatView 輸入中指示器', () => {
    beforeEach(() => {
        profileRef.value = { userId: 'u-101', username: '小毛', furName: '毛毛', avatar: '/mock-images/avatar-default.png', avatarColor: '#8c8672' }
        messagesRef.value = [makeMessage({ cursorId: 11, messageId: 'm1', content: 'a' })]
        loadingRef.value = false
        initializedRef.value = true
        hasMoreRef.value = false
        kickedRef.value = false
        membersRef.value = []
        membersErrorRef.value = null
        refetchMembersSpy.mockReset().mockResolvedValue(undefined)
        initSpy.mockReset().mockResolvedValue(undefined)
        sendChatMessageSpy.mockReset().mockReturnValue(true)
        typingTypersRef.value = []
        stopTypingSpy.mockReset()
        disposeTypingSpy.mockReset()
        authUserHolder.value = null
    })

    afterEach(() => {
        typingTypersRef.value = []
    })

    it('有人輸入中 → 顯示 TypingIndicator', async () => {
        typingTypersRef.value = [{ userId: 'u-2', furName: 'Fox', avatar: null, avatarColor: null }]
        const wrapper = mount(ChatView)
        await flushPromises()
        expect(wrapper.find('[data-test="typing-indicator"]').exists()).toBe(true)
        wrapper.unmount()
    })

    it('無人輸入中 → 不顯示 TypingIndicator', async () => {
        typingTypersRef.value = []
        const wrapper = mount(ChatView)
        await flushPromises()
        expect(wrapper.find('[data-test="typing-indicator"]').exists()).toBe(false)
        wrapper.unmount()
    })

    it('TypingIndicator 位於輸入框（BottomBar）之上', async () => {
        typingTypersRef.value = [{ userId: 'u-2', furName: 'Fox', avatar: null, avatarColor: null }]
        const wrapper = mount(ChatView)
        await flushPromises()
        const ti = wrapper.find('[data-test="typing-indicator"]').element
        const bb = wrapper.find('.bottom-bar__input').element
        // ti 在 bb 之前（DOCUMENT_POSITION_FOLLOWING：bb 跟在 ti 之後）
        expect(ti.compareDocumentPosition(bb) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
        wrapper.unmount()
    })

    it('送出訊息後呼叫 stopTyping', async () => {
        const wrapper = mount(ChatView)
        await flushPromises()
        await wrapper.find('.bottom-bar__input').setValue('hello')
        await wrapper.find('[data-btn="send"]').trigger('click')
        await flushPromises()
        expect(stopTypingSpy).toHaveBeenCalled()
        wrapper.unmount()
    })

    it('unmount 時呼叫 dispose', async () => {
        const wrapper = mount(ChatView)
        await flushPromises()
        wrapper.unmount()
        expect(disposeTypingSpy).toHaveBeenCalled()
    })
})

describe('ChatView 封禁 gate', () => {
    beforeEach(() => {
        messagesRef.value = [makeMessage({ cursorId: 11, messageId: 'm1', content: 'a' })]
        loadingRef.value = false
        initializedRef.value = true
        hasMoreRef.value = false
        kickedRef.value = false
        membersRef.value = []
        membersErrorRef.value = null
        refetchMembersSpy.mockReset().mockResolvedValue(undefined)
        initSpy.mockReset().mockResolvedValue(undefined)
        authUserHolder.value = null
    })

    afterEach(() => {
        authUserHolder.value = null
    })

    it('banned=true 時顯示 BannedScreen、不渲染聊天內容', async () => {
        authUserHolder.value = { providerUserId: 'u-banned', banned: true }
        const wrapper = mount(ChatView)
        await flushPromises()

        expect(wrapper.find('.banned-screen').exists()).toBe(true)
        expect(wrapper.find('.chat-view__list').exists()).toBe(false)
        wrapper.unmount()
    })

    it('banned=false（一般使用者）時正常顯示聊天，不顯示 BannedScreen', async () => {
        authUserHolder.value = { providerUserId: 'u-normal', banned: false }
        const wrapper = mount(ChatView)
        await flushPromises()

        expect(wrapper.find('.banned-screen').exists()).toBe(false)
        expect(wrapper.find('.chat-view__list').exists()).toBe(true)
        wrapper.unmount()
    })
})
