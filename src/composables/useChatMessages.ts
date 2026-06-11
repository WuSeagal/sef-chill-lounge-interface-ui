import { useChatHistory } from '@/composables/useChatHistory'
import { useChatWebSocket } from '@/composables/useChatWebSocket'
import type {
    ChatEnvelope,
    ChatMessageBroadcastPayload,
    ChatMessageSendPayload,
    ErrorPayload,
    ProfileUpdatedPayload,
    RateLimitedPayload,
} from '@/types/chat'
import { ref, type Ref } from 'vue'
import { push } from 'notivue'

const WAIT_CONNECT_TIMEOUT_MS = 30_000

function waitForConnectTime(connectTimeRef: Ref<number | null>): Promise<number> {
    return new Promise((resolve, reject) => {
        if (connectTimeRef.value !== null) {
            resolve(connectTimeRef.value)
            return
        }
        const interval = setInterval(() => {
            if (connectTimeRef.value !== null) {
                clearInterval(interval)
                clearTimeout(timeout)
                resolve(connectTimeRef.value)
            }
        }, 5)
        const timeout = setTimeout(() => {
            clearInterval(interval)
            reject(new Error('waitForConnectTime timed out'))
        }, WAIT_CONNECT_TIMEOUT_MS)
    })
}

function toLocalIsoSeconds(ms: number): string {
    const d = new Date(ms)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function isValidChatMessage(data: unknown): data is ChatMessageBroadcastPayload {
    return !!data
        && typeof data === 'object'
        && typeof (data as ChatMessageBroadcastPayload).messageId === 'string'
}

function isValidProfileUpdate(data: unknown): data is ProfileUpdatedPayload {
    return !!data
        && typeof data === 'object'
        && typeof (data as ProfileUpdatedPayload).userId === 'string'
}

// 將後端 ERROR envelope 的 code 對應為使用者可讀的失敗提示。
// 後端來源：ChatWebSocketHandler.sendError / MessageService.persistText（IllegalArgumentException code）。
function errorMessageFor(code: string | undefined): string {
    switch (code) {
        case 'message_content_too_long':
            return '訊息太長（上限 500 字），請縮短後再發送'
        case 'message_images_limit_exceeded':
            return '圖片數量超過上限（最多 5 張），訊息未送出'
        case 'message_content_required':
            return '訊息內容不可為空'
        case 'message_image_url_invalid_prefix':
        case 'sticker_image_url_invalid_prefix':
            return '圖片來源無效，訊息未送出'
        default:
            return '訊息發送失敗，請稍後再試'
    }
}

export function useChatMessages() {
    const history = useChatHistory()
    const socket = useChatWebSocket()

    let currentUnsub: (() => void) | null = null
    const pendingLive: ChatMessageBroadcastPayload[] = []
    let historyLoaded = false

    // Rate-limit UX state: when the server rejects a send with RATE_LIMITED,
    // disable the composer for the reported window and tick a per-second
    // countdown so the input placeholder can show「請 X 秒後再發送」。
    const rateLimited = ref(false)
    const rateLimitRemaining = ref(0)
    let rateLimitTimer: ReturnType<typeof setInterval> | null = null

    function clearRateLimitTimer() {
        if (rateLimitTimer !== null) {
            clearInterval(rateLimitTimer)
            rateLimitTimer = null
        }
    }

    function startRateLimit(retryAfterMs: number) {
        const secs = Math.ceil(retryAfterMs / 1000)
        clearRateLimitTimer()
        rateLimitRemaining.value = Math.max(0, secs)
        rateLimited.value = rateLimitRemaining.value > 0
        if (!rateLimited.value) return
        rateLimitTimer = setInterval(() => {
            rateLimitRemaining.value -= 1
            if (rateLimitRemaining.value <= 0) {
                rateLimitRemaining.value = 0
                rateLimited.value = false
                clearRateLimitTimer()
            }
        }, 1000)
    }

    function subscribe() {
        // Replace any prior subscription so init / reconnect can be called
        // multiple times without accumulating handlers in the singleton.
        if (currentUnsub) {
            currentUnsub()
            currentUnsub = null
        }
        currentUnsub = socket.onMessage((envelope: ChatEnvelope) => {
            if (envelope.type === 'CHAT_MESSAGE') {
                if (!isValidChatMessage(envelope.data)) return
                const data = envelope.data
                if (!historyLoaded) {
                    // Buffer live messages that arrive between subscription
                    // and history-load completion; they'd otherwise be wiped
                    // by loadInitial's full messages.value replacement.
                    pendingLive.push(data)
                    return
                }
                const last = history.messages.value.at(-1)
                if (last && last.messageId === data.messageId) return
                history.appendLive(data)
                return
            }
            if (envelope.type === 'PROFILE_UPDATED') {
                if (!isValidProfileUpdate(envelope.data)) return
                const data = envelope.data
                history.messages.value = history.messages.value.map((m) =>
                    m.userId === data.userId
                        ? { ...m, furName: data.furName, avatar: data.avatar, avatarColor: data.avatarColor, avatarBorder: data.avatarBorder }
                        : m
                )
                return
            }
            if (envelope.type === 'RATE_LIMITED') {
                const data = envelope.data as RateLimitedPayload | undefined
                push.warning('訊息發送太快了，請稍後再試！')
                startRateLimit(data?.retryAfterMs ?? 0)
                return
            }
            if (envelope.type === 'ERROR') {
                // 後端拒絕訊息（過長 / 圖片超量 / 來源無效…）會送 ERROR envelope；
                // 過去前端未處理 → 變成靜默失敗，使用者以為有送出。改以 toast 明確告知未送出。
                const data = envelope.data as ErrorPayload | undefined
                push.error(errorMessageFor(data?.code))
                return
            }
        })
    }

    function flushPendingLive() {
        const seen = new Set(history.messages.value.map((m) => m.messageId))
        for (const msg of pendingLive) {
            if (seen.has(msg.messageId)) continue
            history.appendLive(msg)
            seen.add(msg.messageId)
        }
        pendingLive.length = 0
    }

    async function init() {
        historyLoaded = false
        socket.connect()
        const startedAt = await waitForConnectTime(socket.connectTime)
        subscribe()
        await history.loadInitial({ before: toLocalIsoSeconds(startedAt) })
        flushPendingLive()
        historyLoaded = true
    }

    async function reconnect() {
        historyLoaded = false
        socket.connect()
        const startedAt = await waitForConnectTime(socket.connectTime)
        subscribe()
        await history.loadInitial({ before: toLocalIsoSeconds(startedAt) })
        flushPendingLive()
        historyLoaded = true
    }

    function dispose() {
        if (currentUnsub) {
            currentUnsub()
            currentUnsub = null
        }
        pendingLive.length = 0
        historyLoaded = false
        clearRateLimitTimer()
        rateLimited.value = false
        rateLimitRemaining.value = 0
    }

    // 回傳是否真的送出（WS 斷線時為 false），讓呼叫端可保留輸入內容供重送。
    function sendChatMessage(content: string, imageUrls: string[] = []): boolean {
        const trimmed = content.trim()
        if (!trimmed && imageUrls.length === 0) return false
        const payload: ChatMessageSendPayload = {
            messageType: 'TEXT',
            content: trimmed,
            imageUrls,
        }
        const envelope: ChatEnvelope<ChatMessageSendPayload> = {
            type: 'CHAT_MESSAGE',
            timestamp: Date.now(),
            data: payload,
        }
        if (!socket.send(envelope)) {
            push.error('連線中斷，訊息未送出，請稍後再試')
            return false
        }
        return true
    }

    function sendStickerMessage(stickerImageUrl: string): boolean {
        const trimmed = stickerImageUrl.trim()
        if (!trimmed) return false
        const payload: ChatMessageSendPayload = {
            messageType: 'STICKER',
            stickerImageUrl: trimmed,
        }
        const envelope: ChatEnvelope<ChatMessageSendPayload> = {
            type: 'CHAT_MESSAGE',
            timestamp: Date.now(),
            data: payload,
        }
        if (!socket.send(envelope)) {
            push.error('連線中斷，貼圖未送出，請稍後再試')
            return false
        }
        return true
    }

    return {
        messages: history.messages,
        loading: history.loading,
        hasMore: history.hasMore,
        loadMore: history.loadMore,
        init,
        reconnect,
        dispose,
        sendChatMessage,
        sendStickerMessage,
        rateLimited,
        rateLimitRemaining,
        kicked: socket.kicked,
        wsReconnecting: socket.wsReconnecting,
        wsFailed: socket.wsFailed,
    }
}
