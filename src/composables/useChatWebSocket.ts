import { ref } from 'vue'
import type { ChatEnvelope } from '@/types/chat'

type Subscriber = (envelope: ChatEnvelope) => void

const PING_INTERVAL_MS = 30_000
const PONG_TIMEOUT_MS = 60_000
const MAX_RECONNECT = 5
const BACKOFFS_MS = [2_000, 4_000, 6_000, 8_000, 10_000]
const CLOSE_CODE_KICKED = 4271
// D1：剛連上 KICK_GRACE_MS 內被踢，壓倒性是「重開瀏覽器/還原雙實例」的同人自我碰撞，
// 視為自我碰撞並靜默重連；超過則視為真的「別台登入」。MAX_SELF_RECONNECT 讓兩個真.並存
// 分頁互踢時收斂（彈幾下後其中一邊顯示 modal），不會無限 ping-pong。
const KICK_GRACE_MS = 4_000
const MAX_SELF_RECONNECT = 2

let ws: WebSocket | null = null
let pingInterval: ReturnType<typeof setInterval> | null = null
let pongTimeout: ReturnType<typeof setTimeout> | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let reconnectAttempts = 0
let intentionalClose = false
// D1：自我重連計數；只在「連線存活超過 grace window」後才歸零（非每次 onopen），
// 否則 ping-pong 互踢的重連會在每次 onopen 把計數清掉而永遠到不了上限。
let selfReconnectCount = 0
let graceTimer: ReturnType<typeof setTimeout> | null = null
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

function clearGraceTimer() {
    if (graceTimer) clearTimeout(graceTimer)
    graceTimer = null
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
 * D1：KICKED（envelope 或 onclose 4271）共用的判定。
 * grace 內且自我重連未達上限 → 自我碰撞：不設 kicked、reset reconnectAttempts、count+1、靜默立即重連；
 * 否則 → 別台登入：kicked=true、不重連。
 */
function handleKicked() {
    const now = Date.now()
    // connectTime 在 connect() 開頭被設為 null（尚未 onopen）。此時被踢＝極早碰撞，仍視為 grace 內。
    const withinGrace = connectTime.value === null || now - connectTime.value < KICK_GRACE_MS
    if (withinGrace && selfReconnectCount < MAX_SELF_RECONNECT) {
        selfReconnectCount += 1
        intentionalClose = true
        clearGraceTimer()
        clearPing()
        ws?.close()
        ws = null
        // 自我碰撞：reset 退避並立即重連（不等 backoff、不設 kicked）
        reconnectAttempts = 0
        connectTime.value = null
        connect()
        return
    }
    // 別台登入（或達上限收斂）：顯示 modal、不重連
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
        // D1：連線存活超過 grace window 才把自我重連計數歸零（非 onopen 當下），
        // 確保 ping-pong 互踢能累積到上限而收斂。
        clearGraceTimer()
        graceTimer = setTimeout(() => {
            if (ws !== thisWs) return
            selfReconnectCount = 0
        }, KICK_GRACE_MS)
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
            return
        }
        subscribers.forEach((cb) => cb(envelope))
    }

    ws.onclose = (event: CloseEvent) => {
        // D2：舊 socket 的延遲 onclose（含 4271）不得改共享狀態或觸發重連。
        if (ws !== thisWs) return
        clearPing()
        clearGraceTimer()
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
 * 否則 connect() 會因 readyState===OPEN 而早退什麼都不做。
 */
function reconnectIfForeground() {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
    const open = ws?.readyState === WebSocket.OPEN
    const pongOverdue = open && Date.now() - lastPongAt > PONG_TIMEOUT_MS
    if (open && !pongOverdue) return
    if (open && pongOverdue && ws) {
        // 半死連線：主動關閉（標記 intentionalClose 讓其 onclose 不再 scheduleReconnect），
        // 立即接著走重連流程。
        intentionalClose = true
        clearPing()
        clearGraceTimer()
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
    clearGraceTimer()
    removeLifecycleListeners()
    ws?.close()
    ws = null
    connectTime.value = null
    wsReconnecting.value = false
    reconnectAttempts = 0
    selfReconnectCount = 0
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
