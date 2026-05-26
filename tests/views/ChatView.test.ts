import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref, nextTick } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import ChatView from '@/views/ChatView.vue'
import type { MessageResponse } from '@/types/message'

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
        connectSpy.mockReset()
        disconnectSpy.mockReset()
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

    it('opens UserPopup with the correct user when an avatar is clicked', async () => {
        const wrapper = mount(ChatView, { attachTo: document.body })
        await wrapper.findAll('.message-item__avatar')[0].trigger('click')
        await flushPromises()

        expect(wrapper.find('.user-popup').exists()).toBe(true)
        expect(wrapper.find('.user-popup').text()).toContain('毛毛')
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
})
