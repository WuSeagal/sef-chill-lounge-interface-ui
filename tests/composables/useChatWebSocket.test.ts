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

    it('sets kicked when receiving KICKED envelope', () => {
        const ws = useChatWebSocket()
        ws.connect()
        const socket = FakeWebSocket.instances[0]
        socket.open()

        socket.deliver('{"type":"KICKED","timestamp":1,"data":null}')

        expect(ws.kicked.value).toBe(true)
    })

    it('sets kicked when close code is 4271', () => {
        const ws = useChatWebSocket()
        ws.connect()
        const socket = FakeWebSocket.instances[0]
        socket.open()

        socket.close(4271)

        expect(ws.kicked.value).toBe(true)
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
        for (let attempt = 0; attempt < 6; attempt++) {
            const socket = FakeWebSocket.instances.at(-1)!
            socket.open()
            socket.close(1006)
            vi.advanceTimersByTime(60_000) // > max backoff
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
        // after close, before second WS opens, connectTime should be reset to null
        // so that any waitForConnectTime call doesn't see stale value
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
})
