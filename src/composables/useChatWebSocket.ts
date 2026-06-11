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
const subscribers: Subscriber[] = []

const kicked = ref(false)
const wsReconnecting = ref(false)
const wsFailed = ref(false)
const connectTime = ref<number | null>(null)

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

function connect() {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        return
    }
    intentionalClose = false
    // Reset connectTime so any waitForConnectTime caller blocks until the
    // FRESH open event, not a stale value from a previous session.
    connectTime.value = null
    const endpoint = import.meta.env.VITE_WS_ENDPOINT as string
    ws = new WebSocket(endpoint)

    ws.onopen = () => {
        connectTime.value = Date.now()
        wsReconnecting.value = false
        wsFailed.value = false
        schedulePing()
    }

    ws.onmessage = (event: MessageEvent) => {
        let envelope: ChatEnvelope
        try {
            envelope = JSON.parse(event.data)
        } catch {
            return
        }
        if (envelope.type === 'PONG') {
            if (pongTimeout) {
                clearTimeout(pongTimeout)
                pongTimeout = null
            }
            return
        }
        if (envelope.type === 'KICKED') {
            kicked.value = true
            intentionalClose = true
            ws?.close()
            return
        }
        subscribers.forEach((cb) => cb(envelope))
    }

    ws.onclose = (event: CloseEvent) => {
        clearPing()
        if (event.code === CLOSE_CODE_KICKED) {
            kicked.value = true
            intentionalClose = true
        }
        if (intentionalClose) {
            return
        }
        scheduleReconnect()
    }
}

function disconnect() {
    intentionalClose = true
    if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
    }
    clearPing()
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
