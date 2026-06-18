import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

vi.mock('@/composables/useChatWebSocket', () => ({
    useChatWebSocket: vi.fn(),
}))

import { useChatWebSocket } from '@/composables/useChatWebSocket'
import { useTypingIndicator } from '@/composables/useTypingIndicator'

describe('useTypingIndicator', () => {
    let send: ReturnType<typeof vi.fn>
    let onMessage: ReturnType<typeof vi.fn>
    let handlers: Array<(env: { type: string; data: unknown }) => void>
    let unsub: ReturnType<typeof vi.fn>

    function emit(env: { type: string; data: unknown }) {
        handlers.forEach((h) => h(env))
    }

    beforeEach(() => {
        vi.useFakeTimers()
        handlers = []
        send = vi.fn(() => true)
        unsub = vi.fn(() => {
            handlers.length = 0
        })
        onMessage = vi.fn((cb) => {
            handlers.push(cb)
            return unsub
        })
        vi.mocked(useChatWebSocket).mockReturnValue({
            connect: vi.fn(),
            disconnect: vi.fn(),
            send,
            onMessage,
            kicked: ref(false),
            wsReconnecting: ref(false),
            wsFailed: ref(false),
            connectTime: ref<number | null>(null),
        } as unknown as ReturnType<typeof useChatWebSocket>)
    })

    afterEach(() => {
        vi.useRealTimers()
        vi.restoreAllMocks()
    })

    function typingCalls() {
        return send.mock.calls.filter((c) => (c[0] as { type: string }).type === 'TYPING')
    }

    // ---- 送出側（節流）----

    it('輸入由空變有字 → 立即送一次 TYPING', () => {
        const input = ref('')
        useTypingIndicator(input, () => 'me')
        input.value = 'h'
        expect(typingCalls()).toHaveLength(1)
    })

    it('持續變動 → 每 3 秒再送一次', () => {
        const input = ref('')
        useTypingIndicator(input, () => 'me')
        input.value = 'h' // 立即送 1
        input.value = 'he' // 標記有變動
        vi.advanceTimersByTime(3000) // heartbeat tick → 送 2
        expect(typingCalls()).toHaveLength(2)
    })

    it('3 秒內無變動 → 停止送出，之後不再 heartbeat', () => {
        const input = ref('')
        useTypingIndicator(input, () => 'me')
        input.value = 'h' // 送 1
        vi.advanceTimersByTime(3000) // tick：無變動 → 停止
        vi.advanceTimersByTime(9000) // 再過 9 秒
        expect(typingCalls()).toHaveLength(1)
    })

    it('停止後再次輸入 → 重新進入輸入中（再送）', () => {
        const input = ref('')
        useTypingIndicator(input, () => 'me')
        input.value = 'h' // 送 1
        vi.advanceTimersByTime(3000) // 無變動 → 停
        input.value = 'hi' // 重新有輸入 → 再送
        expect(typingCalls()).toHaveLength(2)
    })

    it('清空輸入 → 停止送出', () => {
        const input = ref('')
        useTypingIndicator(input, () => 'me')
        input.value = 'h' // 送 1
        input.value = '' // 清空 → 停
        vi.advanceTimersByTime(6000)
        expect(typingCalls()).toHaveLength(1)
    })

    it('stopTyping() 立即停止 heartbeat', () => {
        const input = ref('')
        const { stopTyping } = useTypingIndicator(input, () => 'me')
        input.value = 'hello' // 送 1
        input.value = 'hello!' // 有變動
        stopTyping()
        vi.advanceTimersByTime(6000)
        expect(typingCalls()).toHaveLength(1)
    })

    // ---- 接收側 ----

    it('自我過濾：自己的 userId 不入 typers', () => {
        const input = ref('')
        const { typers } = useTypingIndicator(input, () => 'me')
        emit({ type: 'TYPING', data: { userId: 'me', furName: 'Me', avatar: null, avatarColor: null } })
        expect(typers.value).toHaveLength(0)
    })

    it('他人 TYPING → 加入 typers，欄位取自 payload', () => {
        const input = ref('')
        const { typers } = useTypingIndicator(input, () => 'me')
        emit({ type: 'TYPING', data: { userId: 'u-2', furName: 'Fox', avatar: '/fox.png', avatarColor: '#abc' } })
        expect(typers.value).toHaveLength(1)
        expect(typers.value[0]).toMatchObject({ userId: 'u-2', furName: 'Fox', avatar: '/fox.png', avatarColor: '#abc' })
    })

    it('同一 user 多次 TYPING 不重複，只更新', () => {
        const input = ref('')
        const { typers } = useTypingIndicator(input, () => 'me')
        emit({ type: 'TYPING', data: { userId: 'u-2', furName: 'A', avatar: null, avatarColor: null } })
        emit({ type: 'TYPING', data: { userId: 'u-2', furName: 'B', avatar: null, avatarColor: null } })
        expect(typers.value).toHaveLength(1)
        expect(typers.value[0].furName).toBe('B')
    })

    it('idle 5 秒逾時 → 自 typers 移除', () => {
        const input = ref('')
        const { typers } = useTypingIndicator(input, () => 'me')
        emit({ type: 'TYPING', data: { userId: 'u-2', furName: 'Fox', avatar: null, avatarColor: null } })
        expect(typers.value).toHaveLength(1)
        vi.advanceTimersByTime(5000)
        expect(typers.value).toHaveLength(0)
    })

    it('收到同一 user 的 CHAT_MESSAGE → 即時移除（implicit stop）', () => {
        const input = ref('')
        const { typers } = useTypingIndicator(input, () => 'me')
        emit({ type: 'TYPING', data: { userId: 'u-2', furName: 'Fox', avatar: null, avatarColor: null } })
        expect(typers.value).toHaveLength(1)
        emit({ type: 'CHAT_MESSAGE', data: { messageId: 'm1', userId: 'u-2' } })
        expect(typers.value).toHaveLength(0)
    })

    it('dispose() 清空 typers、停 heartbeat、取消訂閱', () => {
        const input = ref('')
        const { typers, dispose } = useTypingIndicator(input, () => 'me')
        emit({ type: 'TYPING', data: { userId: 'u-2', furName: 'Fox', avatar: null, avatarColor: null } })
        input.value = 'h'
        dispose()
        expect(typers.value).toHaveLength(0)
        expect(unsub).toHaveBeenCalled()
        send.mockClear()
        vi.advanceTimersByTime(6000)
        expect(send).not.toHaveBeenCalled()
    })
})
