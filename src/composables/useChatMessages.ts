import { useChatHistory } from '@/composables/useChatHistory'
import { useChatWebSocket } from '@/composables/useChatWebSocket'
import type {
    ChatEnvelope,
    ChatMessageBroadcastPayload,
    ChatMessageSendPayload,
    ErrorPayload,
    MessageDeletedPayload,
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

    // D7：呼叫端（ChatView）注入「目前是否貼底」的 getter，供 appendLive 判定是否裁頭。
    // 預設 true（視為貼底）以沿用舊行為；每次 appendLive 即時求值以追蹤最新捲動狀態。
    let isAtBottomGetter: () => boolean = () => true
    function setIsAtBottom(getter: () => boolean) {
        isAtBottomGetter = getter
    }

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

    // 清空「引用 targetMessageId 的回覆」之衍生欄位（replyToMessageId 保留），使其示意塊立即
    // 反映「無法載入訊息」。供 MESSAGE_DELETED 事件與 jump-load 找不到目標時共用同一套邏輯。
    function clearReplyPreviewFor(targetMessageId: string) {
        history.messages.value = history.messages.value.map((m) => m.replyToMessageId === targetMessageId
            ? { ...m, replyToUserId: null, replyToFurName: null, replyToContentSnippet: null, replyToCreatedDate: null }
            : m)
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
                // 以工作集既有 messageId 集合去重（非僅比對最後一則）：非連續抵達的同 id
                // （中間插入過其他訊息後才重複到達）也要擋下，這是防重複送出的縱深防護之一。
                if (history.messages.value.some((m) => m.messageId === data.messageId)) return
                history.appendLive(data, isAtBottomGetter())
                return
            }
            if (envelope.type === 'PROFILE_UPDATED') {
                if (!isValidProfileUpdate(envelope.data)) return
                const data = envelope.data
                // 僅 /chat 需要：改名同時即時反映在（a）自己發送的訊息（既有）與（b）別人回覆
                // 自己訊息時、回覆預覽裡引用的作者名字（replyToFurName，經 replyToUserId 比對）。
                // 兩者互不排斥，自己回覆自己時會同時命中。
                history.messages.value = history.messages.value.map((m) => {
                    const isAuthor = m.userId === data.userId
                    const isReplyAuthor = m.replyToUserId === data.userId
                    if (!isAuthor && !isReplyAuthor) return m
                    return {
                        ...m,
                        ...(isAuthor
                            ? { furName: data.furName, avatar: data.avatar, avatarColor: data.avatarColor, avatarBorder: data.avatarBorder }
                            : {}),
                        ...(isReplyAuthor ? { replyToFurName: data.furName } : {}),
                    }
                })
                return
            }
            if (envelope.type === 'MESSAGE_DELETED') {
                const data = envelope.data as MessageDeletedPayload | undefined
                if (!data?.messageId) return
                const deletedId = data.messageId
                // 從畫面移除，並將引用它的回覆之衍生欄位清空 → 示意塊立即反映「無法載入訊息」。
                history.messages.value = history.messages.value.filter((m) => m.messageId !== deletedId)
                clearReplyPreviewFor(deletedId)
                // 同時清掉待倒入緩衝，否則 flushPendingLive 後會復活
                for (let i = pendingLive.length - 1; i >= 0; i--) {
                    if (pendingLive[i].messageId === deletedId) pendingLive.splice(i, 1)
                }
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
            history.appendLive(msg, isAtBottomGetter())
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

    // iOS Safari 上單次點擊/觸控偶發重複觸發送出事件，兩個 CHAT_MESSAGE frame 各自持久化
    // 成兩則訊息。in-flight 鎖在送出起點同步鎖住，微任務（下一個 tick）才釋放：
    // 兩次「同步」（無 await 相隔）呼叫必落在同一個微任務佇列前，第二次會被擋下；
    // 真正分開的後續送出則在鎖釋放後正常放行。text 與 sticker 共用同一把鎖。
    let sending = false
    function withSendLock<T>(action: () => T, fallback: T): T {
        if (sending) return fallback
        sending = true
        queueMicrotask(() => { sending = false })
        return action()
    }

    // 回傳是否真的送出（WS 斷線時為 false），讓呼叫端可保留輸入內容供重送。
    // replyToMessageId 缺省時 payload 不含該欄位（衍生欄位一律由 server 端即時解析，
    // client 只送這一個 id）。
    function sendChatMessage(content: string, imageUrls: string[] = [], replyToMessageId?: string): boolean {
        return withSendLock(() => {
            const trimmed = content.trim()
            if (!trimmed && imageUrls.length === 0) return false
            const payload: ChatMessageSendPayload = {
                messageType: 'TEXT',
                content: trimmed,
                imageUrls,
                ...(replyToMessageId ? { replyToMessageId } : {}),
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
        }, false)
    }

    function sendStickerMessage(stickerImageUrl: string, replyToMessageId?: string): boolean {
        return withSendLock(() => {
            const trimmed = stickerImageUrl.trim()
            if (!trimmed) return false
            const payload: ChatMessageSendPayload = {
                messageType: 'STICKER',
                stickerImageUrl: trimmed,
                ...(replyToMessageId ? { replyToMessageId } : {}),
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
        }, false)
    }

    return {
        messages: history.messages,
        loading: history.loading,
        initialized: history.initialized,
        hasMore: history.hasMore,
        loadMore: history.loadMore,
        jumpToMessage: history.jumpToMessage,
        clearReplyPreviewFor,
        init,
        reconnect,
        dispose,
        setIsAtBottom,
        sendChatMessage,
        sendStickerMessage,
        rateLimited,
        rateLimitRemaining,
        kicked: socket.kicked,
        wsReconnecting: socket.wsReconnecting,
        wsFailed: socket.wsFailed,
    }
}
