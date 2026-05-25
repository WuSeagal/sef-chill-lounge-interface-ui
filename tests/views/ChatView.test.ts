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

const historyMessagesRef = ref<MessageResponse[]>([])
const historyLoadingRef = ref(false)
const historyHasMoreRef = ref(false)
const loadInitialSpy = vi.fn()
const loadMoreSpy = vi.fn()
const appendLiveSpy = vi.fn()

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

vi.mock('@/composables/useChatHistory', () => ({
    useChatHistory: () => ({
        messages: historyMessagesRef,
        loading: historyLoadingRef,
        hasMore: historyHasMoreRef,
        loadInitial: loadInitialSpy,
        loadMore: loadMoreSpy,
        appendLive: appendLiveSpy,
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
        historyMessagesRef.value = [
            makeMessage({ cursorId: 11, messageId: 'msg-001', content: 'first', createdDate: '2026-05-25T10:00:00' }),
            makeMessage({ cursorId: 12, messageId: 'msg-002', content: 'second', createdDate: '2026-05-25T10:01:00' }),
        ]
        historyLoadingRef.value = false
        historyHasMoreRef.value = false
        loadInitialSpy.mockReset().mockResolvedValue(undefined)
        loadMoreSpy.mockReset().mockResolvedValue(undefined)
        appendLiveSpy.mockReset().mockImplementation((message: MessageResponse) => {
            historyMessagesRef.value = [...historyMessagesRef.value, message]
        })
    })

    it('loads history on mount and renders real history messages', async () => {
        const wrapper = mount(ChatView)
        await flushPromises()

        expect(loadInitialSpy).toHaveBeenCalled()
        expect(wrapper.findAll('.message-item')).toHaveLength(2)
        expect(wrapper.text()).toContain('first')
        expect(wrapper.text()).toContain('second')
    })

    it('shows placeholder when history is empty', async () => {
        historyMessagesRef.value = []
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

    it('appending via BottomBar send adds a new local message to the list', async () => {
        const wrapper = mount(ChatView)
        const before = wrapper.findAll('.message-item').length

        await wrapper.find('.bottom-bar__input').setValue('hi from test')
        await wrapper.find('[data-btn="send"]').trigger('click')
        await flushPromises()

        const after = wrapper.findAll('.message-item').length
        expect(appendLiveSpy).toHaveBeenCalled()
        expect(after).toBe(before + 1)
        expect(wrapper.text()).toContain('hi from test')
        expect(wrapper.text()).toContain('毛毛')
    })

    it('loads more when scrolled near top and hasMore is true', async () => {
        historyHasMoreRef.value = true
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
})
