import { ref } from 'vue'
import { useDashboardBubbles } from '@/composables/useDashboardBubbles'
import { toDashboardMessage } from '@/utils/toDashboardMessage'
import type { ChatEnvelope, ChatMessageBroadcastPayload, ProfileUpdatedPayload, PresenceSnapshotPayload } from '@/types/chat'

const PING_INTERVAL_MS = 30_000
const PONG_TIMEOUT_MS = 60_000
const MAX_RECONNECT = 5
const BACKOFFS_MS = [2_000, 4_000, 6_000, 8_000, 10_000]

const { bubbles, addBubble, patchProfile, startAnimation, stopAnimation, cleanup } = useDashboardBubbles()

// 線上人數（由 PRESENCE_SNAPSHOT 即時更新）與 WS 連線狀態（驅動紅點閃爍 / 轉灰）。
const onlineCount = ref(0)
const connected = ref(false)

let ws: WebSocket | null = null
// 後端連線時先 replayRecentHistory 再 sendPresenceSnapshot；故「首個 PRESENCE_SNAPSHOT」
// 標誌 replay 結束。在此之前到達的 CHAT_MESSAGE 視為既有訊息（不播後空翻），之後才是新訊息。
// 每次 onopen 重置為 false，讓重連 replay 也不誤播。
let liveSince = false
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
        // 只有 replay 邊界（首個 PRESENCE_SNAPSHOT）之後到達的訊息才播後空翻入場動畫
        addBubble(toDashboardMessage(env.data as ChatMessageBroadcastPayload), liveSince)
        return
    }
    if (env.type === 'PROFILE_UPDATED' && env.data) {
        const p = env.data as ProfileUpdatedPayload
        patchProfile(p.userId, { furName: p.furName, avatar: p.avatar, avatarColor: p.avatarColor, avatarBorder: p.avatarBorder })
        return
    }
    if (env.type === 'PRESENCE_SNAPSHOT' && env.data) {
        onlineCount.value = (env.data as PresenceSnapshotPayload).onlineUserIds.length
        // replay 已結束（snapshot 緊接 replay 之後送出）→ 之後的 CHAT_MESSAGE 才是新訊息
        liveSince = true
    }
}

function connect() {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return
    intentionalClose = false
    ws = new WebSocket(import.meta.env.VITE_WS_DASHBOARD_ENDPOINT as string)

    ws.onopen = () => {
        connected.value = true
        reconnectAttempts = 0
        // 每次（含重連）連線都會重新 replay；重置 live 邊界，等首個 PRESENCE_SNAPSHOT 再開啟
        liveSince = false
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
        connected.value = false
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
    return { bubbles, onlineCount, connected, connect, disconnect, startAnimation, stopAnimation, cleanup }
}
