import { useDashboardBubbles } from '@/composables/useDashboardBubbles'
import { toDashboardMessage } from '@/utils/toDashboardMessage'
import type { ChatEnvelope, ChatMessageBroadcastPayload, ProfileUpdatedPayload } from '@/types/chat'

const PING_INTERVAL_MS = 30_000
const PONG_TIMEOUT_MS = 60_000
const MAX_RECONNECT = 5
const BACKOFFS_MS = [2_000, 4_000, 6_000, 8_000, 10_000]

const { bubbles, addBubble, patchProfile, startAnimation, stopAnimation, cleanup } = useDashboardBubbles()

let ws: WebSocket | null = null
let pingInterval: ReturnType<typeof setInterval> | null = null
let pongTimeout: ReturnType<typeof setTimeout> | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let reconnectAttempts = 0
let intentionalClose = false

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
            pongTimeout = setTimeout(() => ws?.close(), PONG_TIMEOUT_MS)
        }
    }, PING_INTERVAL_MS)
}

function scheduleReconnect() {
    if (reconnectAttempts >= MAX_RECONNECT) return
    const delay = BACKOFFS_MS[Math.min(reconnectAttempts, BACKOFFS_MS.length - 1)]
    reconnectAttempts += 1
    reconnectTimer = setTimeout(() => connect(), delay)
}

function handleEnvelope(env: ChatEnvelope) {
    if (env.type === 'CHAT_MESSAGE' && env.data) {
        addBubble(toDashboardMessage(env.data as ChatMessageBroadcastPayload))
        return
    }
    if (env.type === 'PROFILE_UPDATED' && env.data) {
        const p = env.data as ProfileUpdatedPayload
        patchProfile(p.userId, { furName: p.furName, avatar: p.avatar })
    }
}

function connect() {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return
    intentionalClose = false
    ws = new WebSocket(import.meta.env.VITE_WS_DASHBOARD_ENDPOINT as string)

    ws.onopen = () => {
        reconnectAttempts = 0
        schedulePing()
    }
    ws.onmessage = (event: MessageEvent) => {
        let env: ChatEnvelope
        try { env = JSON.parse(event.data) } catch { return }
        if (env.type === 'PONG') {
            if (pongTimeout) { clearTimeout(pongTimeout); pongTimeout = null }
            return
        }
        handleEnvelope(env)
    }
    ws.onclose = () => {
        clearPing()
        if (intentionalClose) return
        scheduleReconnect()
    }
}

function disconnect() {
    intentionalClose = true
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
    clearPing()
    ws?.close()
    ws = null
    reconnectAttempts = 0
}

export function useDashboardFeed() {
    return { bubbles, connect, disconnect, startAnimation, stopAnimation, cleanup }
}
