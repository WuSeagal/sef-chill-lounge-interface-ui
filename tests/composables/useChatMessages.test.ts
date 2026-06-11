import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import type { MessageResponse } from '@/types/message'

vi.mock('@/composables/useChatHistory', () => ({
    useChatHistory: vi.fn(),
}))

vi.mock('@/composables/useChatWebSocket', () => ({
    useChatWebSocket: vi.fn(),
}))

const { mockPushWarning, mockPushError } = vi.hoisted(() => ({ mockPushWarning: vi.fn(), mockPushError: vi.fn() }))
vi.mock('notivue', () => ({ push: { warning: mockPushWarning, error: mockPushError } }))

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
    let unsubSpies: ReturnType<typeof vi.fn>[]
    let connectTime: ReturnType<typeof ref<number | null>>
    let loadInitial: ReturnType<typeof vi.fn>
    let appendLiveMock: ReturnType<typeof vi.fn>
    let historyMessages: ReturnType<typeof ref<MessageResponse[]>>

    beforeEach(() => {
        messageHandlers = []
        unsubSpies = []
        connectTime = ref<number | null>(null)
        connect = vi.fn(() => {
            connectTime.value = new Date(2026, 4, 26, 10, 0, 0).getTime()
        })
        send = vi.fn(() => true)
        onMessage = vi.fn((cb) => {
            messageHandlers.push(cb)
            const unsub = vi.fn(() => {
                const idx = messageHandlers.indexOf(cb)
                if (idx >= 0) messageHandlers.splice(idx, 1)
            })
            unsubSpies.push(unsub)
            return unsub
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

    it('shows the unified rate-limit warning toast (no seconds) on RATE_LIMITED envelope', async () => {
        const { init } = useChatMessages()
        await init()
        mockPushWarning.mockClear()

        messageHandlers.forEach((h) => h({ type: 'RATE_LIMITED', data: { retryAfterMs: 4200 } }))

        expect(mockPushWarning).toHaveBeenCalledTimes(1)
        expect(mockPushWarning.mock.calls[0][0]).toBe('訊息發送太快了，請稍後再試！')
    })

    it('shows a specific error toast on ERROR envelope with code message_content_too_long', async () => {
        const { init } = useChatMessages()
        await init()
        mockPushError.mockClear()

        messageHandlers.forEach((h) => h({ type: 'ERROR', data: { code: 'message_content_too_long', message: 'message_content_too_long' } }))

        expect(mockPushError).toHaveBeenCalledTimes(1)
        expect(mockPushError.mock.calls[0][0]).toContain('訊息太長')
    })

    it('shows a generic error toast on ERROR envelope with an unmapped code', async () => {
        const { init } = useChatMessages()
        await init()
        mockPushError.mockClear()

        messageHandlers.forEach((h) => h({ type: 'ERROR', data: { code: 'something_unexpected' } }))

        expect(mockPushError).toHaveBeenCalledTimes(1)
        expect(mockPushError.mock.calls[0][0]).toBe('訊息發送失敗，請稍後再試')
    })

    it('shows an error toast even when ERROR envelope has no data', async () => {
        const { init } = useChatMessages()
        await init()
        mockPushError.mockClear()

        messageHandlers.forEach((h) => h({ type: 'ERROR', data: undefined }))

        expect(mockPushError).toHaveBeenCalledTimes(1)
    })

    it('sets rateLimited state with a per-second countdown that clears on expiry', async () => {
        vi.useFakeTimers()
        try {
            const { init, rateLimited, rateLimitRemaining } = useChatMessages()
            await init()

            messageHandlers.forEach((h) => h({ type: 'RATE_LIMITED', data: { retryAfterMs: 4200 } }))

            expect(rateLimited.value).toBe(true)
            expect(rateLimitRemaining.value).toBe(5) // ceil(4200/1000)

            vi.advanceTimersByTime(1000)
            expect(rateLimitRemaining.value).toBe(4)

            vi.advanceTimersByTime(4000)
            expect(rateLimited.value).toBe(false)
            expect(rateLimitRemaining.value).toBe(0)
        } finally {
            vi.useRealTimers()
        }
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

    it('sendChatMessage returns true and shows no error toast when the socket send succeeds', async () => {
        send.mockReturnValue(true)
        const { init, sendChatMessage } = useChatMessages()
        await init()
        mockPushError.mockClear()

        const result = sendChatMessage('hello')

        expect(result).toBe(true)
        expect(mockPushError).not.toHaveBeenCalled()
    })

    it('sendChatMessage shows an error toast and returns false when the socket send is dropped (disconnected)', async () => {
        send.mockReturnValue(false)
        const { init, sendChatMessage } = useChatMessages()
        await init()
        mockPushError.mockClear()

        const result = sendChatMessage('hello')

        expect(result).toBe(false)
        expect(mockPushError).toHaveBeenCalledTimes(1)
        expect(mockPushError.mock.calls[0][0]).toContain('連線中斷')
    })

    it('sendStickerMessage shows an error toast and returns false when the socket send is dropped', async () => {
        send.mockReturnValue(false)
        const { init, sendStickerMessage } = useChatMessages()
        await init()
        mockPushError.mockClear()

        const result = sendStickerMessage('/sticker/u-1/1.png')

        expect(result).toBe(false)
        expect(mockPushError).toHaveBeenCalledTimes(1)
    })

    it('reconnect connects WS and reloads history with the new connectTime', async () => {
        const { init, reconnect } = useChatMessages()
        await init()

        connectTime.value = null
        connect.mockImplementation(() => {
            connectTime.value = new Date(2026, 4, 26, 11, 0, 0).getTime()
        })
        loadInitial.mockClear()

        await reconnect()

        expect(loadInitial).toHaveBeenCalledWith({ before: '2026-05-26T11:00:00' })
    })

    it('patches loaded messages with new furName/avatar on PROFILE_UPDATED', async () => {
        const { init } = useChatMessages()
        await init()

        historyMessages.value = [
            fakeMessage({ messageId: 'm1', userId: 'u-1', furName: 'Old', avatar: '/old.png', avatarColor: '#old', avatarBorder: false, content: 'one' }),
            fakeMessage({ messageId: 'm2', userId: 'u-2', furName: 'Other', avatar: '/o.png', avatarColor: '#oth', avatarBorder: false, content: 'two' }),
            fakeMessage({ messageId: 'm3', userId: 'u-1', furName: 'Old', avatar: '/old.png', avatarColor: '#old', avatarBorder: false, content: 'three' }),
        ]

        messageHandlers[0]({
            type: 'PROFILE_UPDATED',
            data: { userId: 'u-1', furName: 'NewFur', avatar: '/new.png', avatarColor: '#new', avatarBorder: true },
        })

        expect(historyMessages.value).toEqual([
            expect.objectContaining({ messageId: 'm1', furName: 'NewFur', avatar: '/new.png', avatarColor: '#new', avatarBorder: true }),
            expect.objectContaining({ messageId: 'm2', furName: 'Other', avatar: '/o.png', avatarColor: '#oth', avatarBorder: false }),
            expect.objectContaining({ messageId: 'm3', furName: 'NewFur', avatar: '/new.png', avatarColor: '#new', avatarBorder: true }),
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

    it('buffers live CHAT_MESSAGE arriving before loadInitial finishes and flushes after', async () => {
        // Make loadInitial pause so we can fire a live message in the middle.
        let resolveLoad!: () => void
        loadInitial.mockImplementationOnce(() => new Promise<void>((res) => { resolveLoad = res }))

        const live = fakeMessage({ messageId: 'mid-race', content: 'arrived mid-load' })

        const { init } = useChatMessages()
        const initPromise = init()
        // wait for subscribe() to run (it runs synchronously after connectTime resolves)
        await Promise.resolve()
        await Promise.resolve()

        // Simulate live broadcast during the gap window.
        messageHandlers[0]({ type: 'CHAT_MESSAGE', data: live })

        // appendLive should NOT have fired yet — live is buffered.
        expect(appendLiveMock).not.toHaveBeenCalled()

        // Simulate history coming back empty.
        historyMessages.value = []
        resolveLoad()
        await initPromise

        // After load completes, the buffered live message should be appended.
        expect(appendLiveMock).toHaveBeenCalledWith(live)
    })

    it('flushPendingLive skips messages that history already contains', async () => {
        let resolveLoad!: () => void
        loadInitial.mockImplementationOnce(() => new Promise<void>((res) => { resolveLoad = res }))

        const overlapping = fakeMessage({ messageId: 'overlap', content: 'arrived twice' })

        const { init } = useChatMessages()
        const initPromise = init()
        await Promise.resolve()
        await Promise.resolve()

        messageHandlers[0]({ type: 'CHAT_MESSAGE', data: overlapping })

        // Simulate history containing the same message (server's broadcast was also persisted in time)
        historyMessages.value = [overlapping]
        resolveLoad()
        await initPromise

        expect(appendLiveMock).not.toHaveBeenCalled()
    })

    it('dispose removes the active subscription so further envelopes are ignored', async () => {
        const { init, dispose } = useChatMessages()
        await init()

        const unsubBefore = unsubSpies[0]
        dispose()
        expect(unsubBefore).toHaveBeenCalled()

        const live = fakeMessage({ messageId: 'after-dispose', content: 'should be ignored' })
        // After dispose, no handlers remain — broadcast to remaining handlers is a no-op
        expect(messageHandlers.length).toBe(0)
        // Even if a stale handler somehow ran, appendLive wouldn't be called
        expect(appendLiveMock).not.toHaveBeenCalledWith(live)
    })

    it('init replaces a previous subscription instead of stacking another', async () => {
        const { init } = useChatMessages()
        await init()
        const firstUnsub = unsubSpies[0]
        const firstHandlerCount = messageHandlers.length

        await init()

        expect(firstUnsub).toHaveBeenCalled()
        // First subscription unsubscribed, second registered → still exactly one active
        expect(messageHandlers.length).toBe(firstHandlerCount)
    })

    it('reconnect replaces the previous subscription too', async () => {
        const { init, reconnect } = useChatMessages()
        await init()
        const firstUnsub = unsubSpies[0]

        connectTime.value = null
        connect.mockImplementation(() => {
            connectTime.value = new Date(2026, 4, 26, 11, 0, 0).getTime()
        })

        await reconnect()

        expect(firstUnsub).toHaveBeenCalled()
        expect(messageHandlers.length).toBe(1)
    })

    it('ignores CHAT_MESSAGE with no messageId (shape guard)', async () => {
        const { init } = useChatMessages()
        await init()

        messageHandlers[0]({ type: 'CHAT_MESSAGE', data: { content: 'no id' } as unknown as MessageResponse })
        messageHandlers[0]({ type: 'CHAT_MESSAGE', data: null })
        messageHandlers[0]({ type: 'CHAT_MESSAGE', data: 'not an object' as unknown as MessageResponse })

        expect(appendLiveMock).not.toHaveBeenCalled()
    })

    it('ignores PROFILE_UPDATED with no userId (shape guard)', async () => {
        const { init } = useChatMessages()
        await init()
        historyMessages.value = [fakeMessage({ messageId: 'm1', userId: 'u-1' })]
        const before = historyMessages.value

        messageHandlers[0]({ type: 'PROFILE_UPDATED', data: { furName: 'no-id', avatar: '/n.png' } })

        expect(historyMessages.value).toBe(before)
    })

    it('sendStickerMessage emits a STICKER envelope via WebSocket', async () => {
        const { init, sendStickerMessage } = useChatMessages()
        await init()

        sendStickerMessage('/sticker/u-1/1.png?v=1')

        expect(send).toHaveBeenCalledWith(expect.objectContaining({
            type: 'CHAT_MESSAGE',
            data: { messageType: 'STICKER', stickerImageUrl: '/sticker/u-1/1.png?v=1' },
        }))
    })

    it('sendStickerMessage ignores blank url', async () => {
        const { init, sendStickerMessage } = useChatMessages()
        await init()
        sendStickerMessage('   ')
        expect(send).not.toHaveBeenCalled()
    })
})

describe('useChatMessages waitForConnectTime timeout', () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
        vi.clearAllMocks()
    })

    it('init rejects if connectTime never arrives within 30s', async () => {
        const connectTime = ref<number | null>(null)
        const connect = vi.fn() // never sets connectTime
        const send = vi.fn()
        const onMessage = vi.fn(() => () => {})

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
            messages: ref([]),
            loading: ref(false),
            hasMore: ref(true),
            loadInitial: vi.fn(async () => {}),
            loadMore: vi.fn(),
            appendLive: vi.fn(),
        } as unknown as ReturnType<typeof useChatHistory>)

        const { init } = useChatMessages()
        const promise = init()
        const expectation = expect(promise).rejects.toThrow('timed out')

        await vi.advanceTimersByTimeAsync(30_001)
        await expectation
    })
})
