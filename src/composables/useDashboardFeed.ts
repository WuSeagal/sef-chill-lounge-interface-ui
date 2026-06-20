import { ref } from 'vue'
import { useDashboardBubbles } from '@/composables/useDashboardBubbles'
import { toDashboardMessage } from '@/utils/toDashboardMessage'
import type { ChatEnvelope, ChatMessageBroadcastPayload, ProfileUpdatedPayload, PresenceSnapshotPayload, MessageDeletedPayload } from '@/types/chat'

const PING_INTERVAL_MS = 30_000
const PONG_TIMEOUT_MS = 60_000
const MAX_RECONNECT = 5
const BACKOFFS_MS = [2_000, 4_000, 6_000, 8_000, 10_000]

const { bubbles, addBubble, removeBubble, patchProfile, startAnimation, stopAnimation, cleanup } = useDashboardBubbles()

// 線上人數（由 PRESENCE_SNAPSHOT 即時更新）與 WS 連線狀態（驅動紅點閃爍 / 轉灰）。
const onlineCount = ref(0)
// 線上 userId 名單（people-directory：People modal 用來在線優先排序 + 離線淡化）。
const onlineUserIds = ref<string[]>([])
const connected = ref(false)
// 「初次 replay 是否完成」的單向旗標：收到首個 PRESENCE_SNAPSHOT（replay 結束標誌）
// 後翻 true，之後不再 reset（重連不重新以載入動畫覆蓋既有 bubbles）。供 DashboardView
// 在 replay 完成前顯示載入動畫，避免空白 grid 先出現再跳出 bubbles。
// 註：與 bubbles/connected 同為 module-singleton，故「載入動畫」只在真正整頁載入（F5）出現；
// SPA 內離開再回到 /dashboard 時 ready 已為 true（既有 bubbles 也還在畫面上，此時蓋 loading 反而不對）。
const ready = ref(false)

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
// 上次成功收到 PONG（或本連線 onopen）的時間，供回前景時判定「半死連線」（pong 逾時）。
let lastPongAt = 0
// D4：前景重連監聽只註冊一次（module flag），disconnect 時移除。
let lifecycleListenersRegistered = false

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
    if (env.type === 'MESSAGE_DELETED' && env.data) {
        removeBubble((env.data as MessageDeletedPayload).messageId)
        return
    }
    if (env.type === 'PRESENCE_SNAPSHOT' && env.data) {
        const ids = (env.data as PresenceSnapshotPayload).onlineUserIds
        onlineUserIds.value = ids
        onlineCount.value = ids.length
        // replay 已結束（snapshot 緊接 replay 之後送出）→ 之後的 CHAT_MESSAGE 才是新訊息
        liveSince = true
        // 初次 replay 完成 → 收掉載入動畫；之後重連 replay 不再重置（bubbles 已在畫面上）
        ready.value = true
    }
}

function connect() {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return
    intentionalClose = false
    ws = new WebSocket(import.meta.env.VITE_WS_DASHBOARD_ENDPOINT as string)
    registerLifecycleListeners()

    ws.onopen = () => {
        connected.value = true
        reconnectAttempts = 0
        lastPongAt = Date.now()
        // 每次（含重連）連線都會重新 replay；重置 live 邊界，等首個 PRESENCE_SNAPSHOT 再開啟
        liveSince = false
        schedulePing()
    }
    ws.onmessage = (event: MessageEvent) => {
        let env: ChatEnvelope
        try { env = JSON.parse(event.data) } catch { return }
        if (env.type === 'PONG') {
            lastPongAt = Date.now()
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

/**
 * D4：投影端回前景 / 網路恢復時，若 viewer 連線非 OPEN（或 PONG 已逾時的半死連線）→
 * reset 退避並立即重連，不等 backoff。半死連線需先強制關閉舊 socket 再重連，否則
 * connect() 因 readyState===OPEN 而早退什麼都不做。
 */
function reconnectIfForeground() {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
    const open = ws?.readyState === WebSocket.OPEN
    const pongOverdue = open && Date.now() - lastPongAt > PONG_TIMEOUT_MS
    if (open && !pongOverdue) return
    if (open && pongOverdue && ws) {
        intentionalClose = true
        clearPing()
        ws.close()
        ws = null
    }
    reconnectAttempts = 0
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
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

function registerLifecycleListeners() {
    if (lifecycleListenersRegistered) return
    if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', onVisibilityChange)
    }
    if (typeof window !== 'undefined') {
        window.addEventListener('online', onOnline)
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
    }
    lifecycleListenersRegistered = false
}

function disconnect() {
    intentionalClose = true
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
    clearPing()
    removeLifecycleListeners()
    ws?.close()
    ws = null
    reconnectAttempts = 0
}

export function useDashboardFeed() {
    return { bubbles, onlineCount, onlineUserIds, connected, ready, connect, disconnect, startAnimation, stopAnimation, cleanup }
}
