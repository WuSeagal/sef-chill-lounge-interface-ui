import { ref, watch, type Ref } from 'vue'
import { useChatWebSocket } from '@/composables/useChatWebSocket'
import type { ChatEnvelope, ChatMessageBroadcastPayload, TypingPayload } from '@/types/chat'

// 節流：打字時每 3 秒最多送一次 TYPING heartbeat；接收端某 typer 5 秒未再收到其
// TYPING 即逾時移除。逾時（5s）刻意 > heartbeat（3s），避免打字中途泡泡在兩次
// heartbeat 之間閃掉。
const HEARTBEAT_MS = 3_000
const EXPIRY_MS = 5_000

export interface TypingUser {
    userId: string
    furName: string | null
    avatar: string | null
    avatarColor: string | null
}

/**
 * 輸入中指示器。送出側：監看 inputValue 做節流 heartbeat；接收側：訂閱 WS 維護
 * 正在打字的他人清單（自我過濾、idle 逾時、收到該 user 訊息即移除）。
 *
 * @param inputValue 目前輸入框文字
 * @param selfUserId 取得自己的 providerUserId（用於過濾 broadcastToAll 的 echo）
 */
export function useTypingIndicator(inputValue: Ref<string>, selfUserId: () => string | null) {
    const socket = useChatWebSocket()
    const typers = ref<TypingUser[]>([])
    const expiryTimers = new Map<string, ReturnType<typeof setTimeout>>()

    let heartbeat: ReturnType<typeof setInterval> | null = null
    let dirty = false

    // ---- 送出側（節流）----
    function sendBeat() {
        socket.send({ type: 'TYPING', timestamp: Date.now(), data: null } as ChatEnvelope)
    }

    function startHeartbeat() {
        sendBeat()
        dirty = false
        heartbeat = setInterval(() => {
            if (dirty) {
                sendBeat()
                dirty = false
            } else {
                // 3 秒內文字沒變動 → 停送（接收端隨後 idle 逾時清除）
                stopTyping()
            }
        }, HEARTBEAT_MS)
    }

    function stopTyping() {
        if (heartbeat !== null) {
            clearInterval(heartbeat)
            heartbeat = null
        }
        dirty = false
    }

    const stopWatch = watch(
        inputValue,
        (val) => {
            if (val.trim().length === 0) {
                stopTyping()
                return
            }
            if (heartbeat === null) {
                // 由空變有字（或停止後重新有輸入）→ 立即送 + 啟動 heartbeat
                startHeartbeat()
            } else {
                dirty = true
            }
        },
        { flush: 'sync' },
    )

    // ---- 接收側 ----
    function removeTyper(userId: string) {
        const t = expiryTimers.get(userId)
        if (t) {
            clearTimeout(t)
            expiryTimers.delete(userId)
        }
        typers.value = typers.value.filter((u) => u.userId !== userId)
    }

    function resetExpiry(userId: string) {
        const existing = expiryTimers.get(userId)
        if (existing) clearTimeout(existing)
        expiryTimers.set(userId, setTimeout(() => removeTyper(userId), EXPIRY_MS))
    }

    function upsert(p: TypingPayload) {
        const entry: TypingUser = { userId: p.userId, furName: p.furName, avatar: p.avatar, avatarColor: p.avatarColor }
        const idx = typers.value.findIndex((u) => u.userId === p.userId)
        if (idx >= 0) {
            const next = typers.value.slice()
            next[idx] = entry
            typers.value = next
        } else {
            typers.value = [...typers.value, entry]
        }
    }

    const unsub = socket.onMessage((env: ChatEnvelope) => {
        if (env.type === 'TYPING') {
            const p = env.data as TypingPayload | null
            if (!p || !p.userId) return
            if (p.userId === selfUserId()) return // 過濾 broadcastToAll 的 self echo
            upsert(p)
            resetExpiry(p.userId)
            return
        }
        if (env.type === 'CHAT_MESSAGE') {
            // 該 user 已送出訊息 → implicit stop，即時移除
            const d = env.data as ChatMessageBroadcastPayload | undefined
            if (d?.userId) removeTyper(d.userId)
        }
    })

    function dispose() {
        stopTyping()
        stopWatch()
        unsub()
        expiryTimers.forEach((t) => clearTimeout(t))
        expiryTimers.clear()
        typers.value = []
    }

    return { typers, stopTyping, dispose }
}
