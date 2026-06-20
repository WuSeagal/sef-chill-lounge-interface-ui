import { ref } from 'vue'
import type { ChatEnvelope } from '@/types/chat'

type Subscriber = (envelope: ChatEnvelope) => void

const PING_INTERVAL_MS = 30_000
const PONG_TIMEOUT_MS = 60_000
const MAX_RECONNECT = 5
const BACKOFFS_MS = [2_000, 4_000, 6_000, 8_000, 10_000]
const CLOSE_CODE_KICKED = 4271

let ws: WebSocket | null = null
let pingInterval: ReturnType<typeof setInterval> | null = null
let pongTimeout: ReturnType<typeof setTimeout> | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let reconnectAttempts = 0
let intentionalClose = false
// D3：頁面卸載 / 前景重連監聽只註冊一次（module flag），disconnect 時移除。
let lifecycleListenersRegistered = false
const subscribers: Subscriber[] = []

const kicked = ref(false)
const wsReconnecting = ref(false)
const wsFailed = ref(false)
const connectTime = ref<number | null>(null)
// 上次成功收到 PONG（或本連線 onopen）的時間，供回前景時判定「半死連線」（pong 逾時）。
let lastPongAt = 0

function clearPing() {
    if (pingInterval) clearInterval(pingInterval)
    pingInterval = null
    if (pongTimeout) clearTimeout(pongTimeout)
    pongTimeout = null
}

function schedulePing() {
    clearPing()
    pingInterval = setInterval(() => {
        if (ws?.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'PING', timestamp: Date.now(), data: null }))
            pongTimeout = setTimeout(() => {
                ws?.close()
            }, PONG_TIMEOUT_MS)
        }
    }, PING_INTERVAL_MS)
}

function scheduleReconnect() {
    if (reconnectAttempts >= MAX_RECONNECT) {
        wsFailed.value = true
        return
    }
    const delay = BACKOFFS_MS[Math.min(reconnectAttempts, BACKOFFS_MS.length - 1)]
    reconnectAttempts += 1
    wsReconnecting.value = true
    reconnectTimer = setTimeout(() => {
        connect()
    }, delay)
}

/**
 * 嚴格單一連線：被新連線踢掉（KICKED envelope 或 onclose code 4271）即顯示 KickedModal、
 * 停止自動重連（intentionalClose）。由使用者於 modal 決定是否「在這裡繼續」（手動重連會踢掉另一端）。
 * 不做 grace-window 靜默重連，避免兩個同帳號分頁互踢成「兩邊半死、各看各的」。
 */
function handleKicked() {
    kicked.value = true
    intentionalClose = true
}

function connect() {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        return
    }
    // D2：每次 connect 重置 kicked，避免上一輪殘留把新連線誤判為已被踢。
    kicked.value = false
    intentionalClose = false
    // Reset connectTime so any waitForConnectTime caller blocks until the
    // FRESH open event, not a stale value from a previous session.
    connectTime.value = null
    const endpoint = import.meta.env.VITE_WS_ENDPOINT as string
    ws = new WebSocket(endpoint)
    // D2：綁定本次 socket；所有事件處理前確認來自「當前 ws」，否則忽略（舊 socket 延遲事件不改共享狀態）。
    const thisWs = ws
    registerLifecycleListeners()

    ws.onopen = () => {
        if (ws !== thisWs) return
        connectTime.value = Date.now()
        lastPongAt = Date.now()
        wsReconnecting.value = false
        wsFailed.value = false
        // D4：onopen 重置退避計數（既有 bug：不 reset 會讓多次背景斷線累計後永久停止自動重連）。
        reconnectAttempts = 0
        schedulePing()
    }

    ws.onmessage = (event: MessageEvent) => {
        if (ws !== thisWs) return
        let envelope: ChatEnvelope
        try {
            envelope = JSON.parse(event.data)
        } catch {
            return
        }
        if (envelope.type === 'PONG') {
            lastPongAt = Date.now()
            if (pongTimeout) {
                clearTimeout(pongTimeout)
                pongTimeout = null
            }
            return
        }
        if (envelope.type === 'KICKED') {
            handleKicked()
            ws?.close()
            return
        }
        subscribers.forEach((cb) => cb(envelope))
    }

    ws.onclose = (event: CloseEvent) => {
        // D2：舊 socket 的延遲 onclose（含 4271）不得改共享狀態或觸發重連。
        if (ws !== thisWs) return
        clearPing()
        if (event.code === CLOSE_CODE_KICKED) {
            handleKicked()
        }
        if (intentionalClose) {
            return
        }
        scheduleReconnect()
    }
}

/**
 * D4：回前景 / 連線恢復時，若連線非 OPEN（或 PONG 已逾時的半死連線）→ reset 退避並立即重連，
 * 不等 backoff。半死連線（readyState 仍 OPEN 但 pong 逾時）需先強制關閉舊 socket 再重連，
 * 否則 connect() 會因 readyState===OPEN 而早退什麼都不做。被踢（kicked）時不自動重連。
 */
function reconnectIfForeground() {
    if (kicked.value) return
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
    const open = ws?.readyState === WebSocket.OPEN
    const pongOverdue = open && Date.now() - lastPongAt > PONG_TIMEOUT_MS
    if (open && !pongOverdue) return
    if (open && pongOverdue && ws) {
        // 半死連線：主動關閉（標記 intentionalClose 讓其 onclose 不再 scheduleReconnect），
        // 立即接著走重連流程。
        intentionalClose = true
        clearPing()
        ws.close()
        ws = null
    }
    reconnectAttempts = 0
    if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
    }
    connect()
}

function onVisibilityChange() {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        reconnectIfForeground()
    }
}

function onOnline() {
    reconnectIfForeground()
}

function onPageHide() {
    disconnect()
}

function registerLifecycleListeners() {
    if (lifecycleListenersRegistered) return
    if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', onVisibilityChange)
    }
    if (typeof window !== 'undefined') {
        window.addEventListener('online', onOnline)
        // D3：pagehide 在行動瀏覽器較 beforeunload 可靠，兩者並用涵蓋最廣。
        window.addEventListener('pagehide', onPageHide)
        window.addEventListener('beforeunload', onPageHide)
    }
    lifecycleListenersRegistered = true
}

function removeLifecycleListeners() {
    if (!lifecycleListenersRegistered) return
    if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibilityChange)
    }
    if (typeof window !== 'undefined') {
        window.removeEventListener('online', onOnline)
        window.removeEventListener('pagehide', onPageHide)
        window.removeEventListener('beforeunload', onPageHide)
    }
    lifecycleListenersRegistered = false
}

function disconnect() {
    intentionalClose = true
    if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
    }
    clearPing()
    removeLifecycleListeners()
    ws?.close()
    ws = null
    connectTime.value = null
    wsReconnecting.value = false
    reconnectAttempts = 0
}

/** 送出 envelope。WS 非 OPEN 時不送並回傳 false，讓呼叫端可提示使用者「訊息未送出」。 */
function send(envelope: ChatEnvelope): boolean {
    if (ws?.readyState !== WebSocket.OPEN) {
        console.warn('[useChatWebSocket] send before OPEN — dropped envelope', envelope)
        return false
    }
    ws.send(JSON.stringify(envelope))
    return true
}

function onMessage(cb: Subscriber): () => void {
    subscribers.push(cb)
    return () => {
        const idx = subscribers.indexOf(cb)
        if (idx >= 0) subscribers.splice(idx, 1)
    }
}

export function useChatWebSocket() {
    return {
        connect,
        disconnect,
        send,
        onMessage,
        kicked,
        wsReconnecting,
        wsFailed,
        connectTime,
    }
}
