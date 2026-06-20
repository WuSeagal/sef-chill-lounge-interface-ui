import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

class FakeWebSocket {
    static instances: FakeWebSocket[] = []
    static OPEN = 1 as const
    static CLOSED = 3 as const
    static CONNECTING = 0 as const

    readyState: number = 0
    onopen: (() => void) | null = null
    onmessage: ((ev: { data: string }) => void) | null = null
    onclose: ((ev: { code: number; reason?: string }) => void) | null = null
    sent: string[] = []
    closeCalls: { code?: number }[] = []

    constructor(public url: string) {
        FakeWebSocket.instances.push(this)
    }

    send(data: string) {
        this.sent.push(data)
    }

    close(code?: number) {
        this.closeCalls.push({ code })
        this.readyState = FakeWebSocket.CLOSED
        this.onclose?.({ code: code ?? 1000 })
    }

    open() {
        this.readyState = FakeWebSocket.OPEN
        this.onopen?.()
    }

    deliver(json: string) {
        this.onmessage?.({ data: json })
    }
}

describe('useChatWebSocket', () => {
    let useChatWebSocket: typeof import('@/composables/useChatWebSocket').useChatWebSocket

    beforeEach(async () => {
        FakeWebSocket.instances = []
        vi.stubGlobal('WebSocket', FakeWebSocket as unknown as typeof WebSocket)
        vi.stubEnv('VITE_WS_ENDPOINT', 'ws://test/ws/chat')
        vi.useFakeTimers()
        vi.resetModules()
        ;({ useChatWebSocket } = await import('@/composables/useChatWebSocket'))
    })

    afterEach(() => {
        // 清掉本測試 module 實例註冊在 document/window 的生命週期監聽（visibilitychange/online/pagehide）。
        // resetModules 只換新 module，不會移除舊 module 殘留在 global 的監聽；若不清，後續測試
        // dispatch 事件時會觸發殘留監聽的 connect()，污染共用的 FakeWebSocket.instances 計數。
        useChatWebSocket().disconnect()
        vi.useRealTimers()
        vi.unstubAllGlobals()
        vi.unstubAllEnvs()
    })

    it('connect opens WebSocket and records connectTime on open', () => {
        const ws = useChatWebSocket()
        ws.connect()

        expect(FakeWebSocket.instances).toHaveLength(1)
        const socket = FakeWebSocket.instances[0]
        expect(ws.connectTime.value).toBeNull()

        socket.open()
        expect(ws.connectTime.value).not.toBeNull()
        expect(ws.wsReconnecting.value).toBe(false)
    })

    it('sends PING every 30 seconds while open', () => {
        const ws = useChatWebSocket()
        ws.connect()
        const socket = FakeWebSocket.instances[0]
        socket.open()

        vi.advanceTimersByTime(30_000)
        expect(socket.sent.some((s) => s.includes('"type":"PING"'))).toBe(true)
    })

    it('triggers reconnect when no PONG within 60s', () => {
        const ws = useChatWebSocket()
        ws.connect()
        const socket = FakeWebSocket.instances[0]
        socket.open()

        vi.advanceTimersByTime(30_000) // ping
        vi.advanceTimersByTime(60_000) // no pong → close

        expect(socket.closeCalls.length).toBeGreaterThan(0)
    })

    it('intercepts PONG and does not forward to subscribers', () => {
        const ws = useChatWebSocket()
        const received: unknown[] = []
        ws.onMessage((env) => received.push(env))
        ws.connect()
        const socket = FakeWebSocket.instances[0]
        socket.open()

        socket.deliver('{"type":"PONG","timestamp":1,"data":null}')

        expect(received).toEqual([])
    })

    // ── 嚴格單一連線：被踢即顯示 modal、不靜默重連 ──────────────────

    it('sets kicked when receiving KICKED envelope', () => {
        const ws = useChatWebSocket()
        ws.connect()
        const socket = FakeWebSocket.instances[0]
        socket.open()

        socket.deliver('{"type":"KICKED","timestamp":1,"data":null}')

        expect(ws.kicked.value).toBe(true)
        // 被踢不自動重連
        expect(FakeWebSocket.instances).toHaveLength(1)
    })

    it('sets kicked when close code is 4271', () => {
        const ws = useChatWebSocket()
        ws.connect()
        const socket = FakeWebSocket.instances[0]
        socket.open()

        socket.close(4271)

        expect(ws.kicked.value).toBe(true)
        expect(FakeWebSocket.instances).toHaveLength(1)
    })

    it('reconnects with backoff after unexpected close', () => {
        const ws = useChatWebSocket()
        ws.connect()
        const first = FakeWebSocket.instances[0]
        first.open()

        first.close(1006) // unexpected
        // first backoff is 2s
        vi.advanceTimersByTime(2_000)

        expect(FakeWebSocket.instances).toHaveLength(2)
    })

    it('marks wsFailed after 5 failed reconnects', () => {
        const ws = useChatWebSocket()
        ws.connect()
        // onopen 會重置 reconnectAttempts，故「成功開啟再斷」不算失敗重連；
        // 只有「連上前就斷（never open）」的重連才會累計。模擬連續 6 次未開啟即斷。
        for (let attempt = 0; attempt < 6; attempt++) {
            const socket = FakeWebSocket.instances.at(-1)!
            socket.close(1006)
            vi.advanceTimersByTime(60_000) // > max backoff，觸發下一次重連
        }
        expect(ws.wsFailed.value).toBe(true)
    })

    it('resets connectTime to null when starting a new connection (so callers can wait for fresh value)', () => {
        const ws = useChatWebSocket()
        ws.connect()
        const first = FakeWebSocket.instances[0]
        first.open()
        const firstConnectTime = ws.connectTime.value
        expect(firstConnectTime).not.toBeNull()

        first.close(1006)
        vi.advanceTimersByTime(2_000)
        const second = FakeWebSocket.instances.at(-1)!
        expect(ws.connectTime.value).toBeNull()

        second.open()
        expect(ws.connectTime.value).not.toBeNull()
    })

    it('send before OPEN warns and does not throw', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const ws = useChatWebSocket()
        ws.connect()

        expect(() => ws.send({ type: 'PING', timestamp: 1, data: null })).not.toThrow()
        expect(warn).toHaveBeenCalled()

        warn.mockRestore()
    })

    // ── D2：socket 身分守門 + connect 重置 kicked ──────────────────

    it('舊 socket 的延遲 onclose(4271) 被忽略，不改 kicked 也不觸發重連', () => {
        const ws = useChatWebSocket()
        ws.connect()
        const first = FakeWebSocket.instances[0]
        first.open()
        // 久連後正常斷線觸發重連，建立第二個 socket
        vi.advanceTimersByTime(5_000)
        first.close(1006)
        vi.advanceTimersByTime(2_000)
        const second = FakeWebSocket.instances[1]
        second.open()
        const countBefore = FakeWebSocket.instances.length

        // 舊 socket（first）此時才延遲 fire 一個 4271 onclose
        first.onclose?.({ code: 4271 })

        expect(ws.kicked.value).toBe(false)
        expect(FakeWebSocket.instances).toHaveLength(countBefore)
    })

    it('connect() 開頭重置 kicked 為 false', () => {
        const ws = useChatWebSocket()
        ws.connect()
        const socket = FakeWebSocket.instances[0]
        socket.open()
        socket.close(4271) // 被踢 → kicked = true
        expect(ws.kicked.value).toBe(true)

        ws.connect() // 使用者於 modal 點「重新連線」
        expect(ws.kicked.value).toBe(false)
    })

    // ── D4：回前景主動重連 + onopen 重置 reconnectAttempts ─────────

    function setHidden(hidden: boolean) {
        Object.defineProperty(document, 'visibilityState', {
            configurable: true,
            get: () => (hidden ? 'hidden' : 'visible'),
        })
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden })
    }

    it('onopen 重置 reconnectAttempts（避免多次背景斷線後永久停止自動重連）', () => {
        const ws = useChatWebSocket()
        ws.connect()
        for (let i = 0; i < 4; i++) {
            const s = FakeWebSocket.instances.at(-1)!
            s.open()
            s.close(1006)
            vi.advanceTimersByTime(60_000)
        }
        const s = FakeWebSocket.instances.at(-1)!
        s.open()

        s.close(1006)
        vi.advanceTimersByTime(2_000)
        expect(ws.wsFailed.value).toBe(false)
    })

    it('回前景且連線非 OPEN 時立即重連並重置 attempts', () => {
        const ws = useChatWebSocket()
        ws.connect()
        const first = FakeWebSocket.instances[0]
        first.open()
        vi.advanceTimersByTime(5_000)
        first.close(1006)
        const countBefore = FakeWebSocket.instances.length

        setHidden(false)
        document.dispatchEvent(new Event('visibilitychange'))

        expect(FakeWebSocket.instances.length).toBeGreaterThan(countBefore)
        ws.disconnect()
    })

    it('回前景但連線 OPEN 且 PONG 未逾時時不重連', () => {
        const ws = useChatWebSocket()
        ws.connect()
        const socket = FakeWebSocket.instances[0]
        socket.open()
        const countBefore = FakeWebSocket.instances.length

        setHidden(false)
        document.dispatchEvent(new Event('visibilitychange'))

        expect(FakeWebSocket.instances).toHaveLength(countBefore)
        ws.disconnect()
    })

    it('被踢後不因回前景而自動重連（嚴格單一連線）', () => {
        const ws = useChatWebSocket()
        ws.connect()
        const socket = FakeWebSocket.instances[0]
        socket.open()
        socket.close(4271)
        expect(ws.kicked.value).toBe(true)
        const countBefore = FakeWebSocket.instances.length

        setHidden(false)
        document.dispatchEvent(new Event('visibilitychange'))

        expect(FakeWebSocket.instances).toHaveLength(countBefore)
    })

    it('online 事件且連線非 OPEN 時立即重連', () => {
        const ws = useChatWebSocket()
        ws.connect()
        const first = FakeWebSocket.instances[0]
        first.open()
        vi.advanceTimersByTime(5_000)
        first.close(1006)
        const countBefore = FakeWebSocket.instances.length

        setHidden(false)
        window.dispatchEvent(new Event('online'))

        expect(FakeWebSocket.instances.length).toBeGreaterThan(countBefore)
        ws.disconnect()
    })

    // ── D3：pagehide → disconnect，監聽只註冊一次並於 disconnect 移除 ──

    it('pagehide 觸發時呼叫 disconnect 關閉 socket', () => {
        const ws = useChatWebSocket()
        ws.connect()
        const socket = FakeWebSocket.instances[0]
        socket.open()

        window.dispatchEvent(new Event('pagehide'))

        expect(socket.closeCalls.length).toBeGreaterThan(0)
    })

    it('disconnect 後移除 visibilitychange/online/pagehide 監聽（不殘留重連）', () => {
        const ws = useChatWebSocket()
        ws.connect()
        const socket = FakeWebSocket.instances[0]
        socket.open()
        ws.disconnect()
        const countAfter = FakeWebSocket.instances.length

        setHidden(false)
        document.dispatchEvent(new Event('visibilitychange'))
        window.dispatchEvent(new Event('online'))

        expect(FakeWebSocket.instances).toHaveLength(countAfter)
    })
})
