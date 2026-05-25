import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import type { MessageResponse } from '@/types/message'

vi.mock('@/composables/useChatHistory', () => ({
    useChatHistory: vi.fn(),
}))

vi.mock('@/composables/useChatWebSocket', () => ({
    useChatWebSocket: vi.fn(),
}))

import { useChatHistory } from '@/composables/useChatHistory'
import { useChatWebSocket } from '@/composables/useChatWebSocket'
import { useChatMessages } from '@/composables/useChatMessages'

function fakeMessage(overrides: Partial<MessageResponse> = {}): MessageResponse {
    return {
        cursorId: 1,
        messageId: 'msg-001',
        userId: 'u-1',
        messageType: 'TEXT',
        furName: 'Fox',
        avatar: null,
        content: 'hello',
        imageUrls: [],
        stickerImageUrl: null,
        createdDate: '2026-05-26T10:00:00',
        ...overrides,
    }
}

describe('useChatMessages', () => {
    let connect: ReturnType<typeof vi.fn>
    let send: ReturnType<typeof vi.fn>
    let onMessage: ReturnType<typeof vi.fn>
    let messageHandlers: Array<(env: { type: string; data: unknown }) => void>
    let connectTime: ReturnType<typeof ref<number | null>>
    let loadInitial: ReturnType<typeof vi.fn>
    let appendLiveMock: ReturnType<typeof vi.fn>
    let historyMessages: ReturnType<typeof ref<MessageResponse[]>>

    beforeEach(() => {
        messageHandlers = []
        connectTime = ref<number | null>(null)
        // Use a fixed ms timestamp that maps to a known local datetime
        // 2026-05-26T10:00:00 local → use Date.parse for cross-TZ stability
        connect = vi.fn(() => {
            connectTime.value = new Date(2026, 4, 26, 10, 0, 0).getTime()
        })
        send = vi.fn()
        onMessage = vi.fn((cb) => {
            messageHandlers.push(cb)
            return () => {}
        })
        historyMessages = ref<MessageResponse[]>([])
        loadInitial = vi.fn(async () => {})
        appendLiveMock = vi.fn((msg: MessageResponse) => {
            historyMessages.value = [...historyMessages.value, msg]
        })

        vi.mocked(useChatWebSocket).mockReturnValue({
            connect,
            disconnect: vi.fn(),
            send,
            onMessage,
            kicked: ref(false),
            wsReconnecting: ref(false),
            wsFailed: ref(false),
            connectTime,
        } as unknown as ReturnType<typeof useChatWebSocket>)

        vi.mocked(useChatHistory).mockReturnValue({
            messages: historyMessages,
            loading: ref(false),
            hasMore: ref(true),
            loadInitial,
            loadMore: vi.fn(),
            appendLive: appendLiveMock,
        } as unknown as ReturnType<typeof useChatHistory>)
    })

    afterEach(() => {
        vi.clearAllMocks()
    })

    it('init connects WS then loads history with before=connectTime as local ISO string', async () => {
        const { init } = useChatMessages()
        await init()

        expect(connect).toHaveBeenCalled()
        expect(onMessage).toHaveBeenCalled()
        expect(loadInitial).toHaveBeenCalledWith({ before: '2026-05-26T10:00:00' })
        expect(connect.mock.invocationCallOrder[0]).toBeLessThan(loadInitial.mock.invocationCallOrder[0])
    })

    it('appendLive deduplicates by messageId at the tail', async () => {
        const { init } = useChatMessages()
        await init()

        const live = fakeMessage({ messageId: 'msg-100', content: 'live' })
        historyMessages.value = [fakeMessage({ messageId: 'msg-100', content: 'echo' })]

        messageHandlers[0]({ type: 'CHAT_MESSAGE', data: live })

        expect(appendLiveMock).not.toHaveBeenCalled()
    })

    it('appendLive pushes message when not duplicated', async () => {
        const { init } = useChatMessages()
        await init()

        const live = fakeMessage({ messageId: 'msg-200', content: 'live' })

        messageHandlers[0]({ type: 'CHAT_MESSAGE', data: live })

        expect(appendLiveMock).toHaveBeenCalledWith(live)
    })

    it('sendChatMessage emits a TEXT envelope via WebSocket', async () => {
        const { init, sendChatMessage } = useChatMessages()
        await init()

        sendChatMessage('hello')

        expect(send).toHaveBeenCalledWith(expect.objectContaining({
            type: 'CHAT_MESSAGE',
            data: { messageType: 'TEXT', content: 'hello', imageUrls: [] },
        }))
    })

    it('sendChatMessage ignores empty / whitespace-only input', async () => {
        const { init, sendChatMessage } = useChatMessages()
        await init()

        sendChatMessage('   ')

        expect(send).not.toHaveBeenCalled()
    })

    it('patches loaded messages with new furName/avatar on PROFILE_UPDATED', async () => {
        const { init } = useChatMessages()
        await init()

        historyMessages.value = [
            fakeMessage({ messageId: 'm1', userId: 'u-1', furName: 'Old', avatar: '/old.png', content: 'one' }),
            fakeMessage({ messageId: 'm2', userId: 'u-2', furName: 'Other', avatar: '/o.png', content: 'two' }),
            fakeMessage({ messageId: 'm3', userId: 'u-1', furName: 'Old', avatar: '/old.png', content: 'three' }),
        ]

        messageHandlers[0]({
            type: 'PROFILE_UPDATED',
            data: { userId: 'u-1', furName: 'NewFur', avatar: '/new.png' },
        })

        expect(historyMessages.value).toEqual([
            expect.objectContaining({ messageId: 'm1', furName: 'NewFur', avatar: '/new.png' }),
            expect.objectContaining({ messageId: 'm2', furName: 'Other', avatar: '/o.png' }),
            expect.objectContaining({ messageId: 'm3', furName: 'NewFur', avatar: '/new.png' }),
        ])
    })

    it('PROFILE_UPDATED is a no-op when no messages are loaded yet', async () => {
        const { init } = useChatMessages()
        await init()

        historyMessages.value = []

        expect(() => {
            messageHandlers[0]({
                type: 'PROFILE_UPDATED',
                data: { userId: 'u-1', furName: 'X', avatar: '/x.png' },
            })
        }).not.toThrow()
        expect(historyMessages.value).toEqual([])
    })
})
