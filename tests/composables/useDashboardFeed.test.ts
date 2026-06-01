import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

class FakeWebSocket {
    static instances: FakeWebSocket[] = []
    static OPEN = 1 as const
    static CLOSED = 3 as const
    static CONNECTING = 0 as const

    readyState = 0
    onopen: (() => void) | null = null
    onmessage: ((ev: { data: string }) => void) | null = null
    onclose: ((ev: { code: number }) => void) | null = null
    sent: string[] = []
    closeCalls: { code?: number }[] = []

    constructor(public url: string) { FakeWebSocket.instances.push(this) }
    send(data: string) { this.sent.push(data) }
    close(code?: number) { this.closeCalls.push({ code }); this.readyState = FakeWebSocket.CLOSED; this.onclose?.({ code: code ?? 1000 }) }
    open() { this.readyState = FakeWebSocket.OPEN; this.onopen?.() }
    deliver(json: string) { this.onmessage?.({ data: json }) }
}

describe('useDashboardFeed', () => {
    let useDashboardFeed: typeof import('@/composables/useDashboardFeed').useDashboardFeed

    beforeEach(async () => {
        FakeWebSocket.instances = []
        vi.stubGlobal('WebSocket', FakeWebSocket as unknown as typeof WebSocket)
        vi.stubEnv('VITE_WS_DASHBOARD_ENDPOINT', 'ws://test/ws/dashboard')
        vi.stubEnv('VITE_ENDPOINT', 'http://localhost:9041')
        vi.useFakeTimers()
        vi.resetModules()
        ;({ useDashboardFeed } = await import('@/composables/useDashboardFeed'))
    })

    afterEach(() => {
        vi.useRealTimers()
        vi.unstubAllGlobals()
        vi.unstubAllEnvs()
    })

    function chatMsg(messageId: string, content = 'hi') {
        return JSON.stringify({
            type: 'CHAT_MESSAGE', timestamp: 1,
            data: { cursorId: 1, messageId, userId: 'u-1', messageType: 'TEXT', furName: 'Fox',
                avatar: '/a.png', avatarColor: '#fff', avatarBorder: false, content,
                imageUrls: [], stickerImageUrl: null, createdDate: '2026-06-01T00:00:00.000Z' },
        })
    }

    it('connects to the dashboard endpoint', () => {
        const feed = useDashboardFeed()
        feed.connect()
        expect(FakeWebSocket.instances).toHaveLength(1)
        expect(FakeWebSocket.instances[0].url).toBe('ws://test/ws/dashboard')
    })

    it('CHAT_MESSAGE adds a bubble', () => {
        const feed = useDashboardFeed()
        feed.connect()
        const socket = FakeWebSocket.instances[0]
        socket.open()
        socket.deliver(chatMsg('msg-1'))
        expect(feed.bubbles.value).toHaveLength(1)
        expect(feed.bubbles.value[0].message.id).toBe('msg-1')
    })

    it('duplicate CHAT_MESSAGE id is ignored (replay + live race)', () => {
        const feed = useDashboardFeed()
        feed.connect()
        const socket = FakeWebSocket.instances[0]
        socket.open()
        socket.deliver(chatMsg('msg-1'))
        socket.deliver(chatMsg('msg-1'))
        expect(feed.bubbles.value).toHaveLength(1)
    })

    it('PROFILE_UPDATED patches existing bubbles', () => {
        const feed = useDashboardFeed()
        feed.connect()
        const socket = FakeWebSocket.instances[0]
        socket.open()
        socket.deliver(chatMsg('msg-1'))
        socket.deliver(JSON.stringify({ type: 'PROFILE_UPDATED', timestamp: 2, data: { userId: 'u-1', furName: 'NewName', avatar: '/new.png', avatarColor: '#abcdef', avatarBorder: true } }))
        expect(feed.bubbles.value[0].message.nickname).toBe('NewName')
        expect(feed.bubbles.value[0].message.avatarUrl).toBe('/new.png')
        expect(feed.bubbles.value[0].message.avatarColor).toBe('#abcdef')
        expect(feed.bubbles.value[0].message.avatarBorder).toBe(true)
    })

    it('sends PING every 30s while open', () => {
        const feed = useDashboardFeed()
        feed.connect()
        const socket = FakeWebSocket.instances[0]
        socket.open()
        vi.advanceTimersByTime(30_000)
        expect(socket.sent.some(s => s.includes('"type":"PING"'))).toBe(true)
    })

    it('reconnects with backoff after unexpected close', () => {
        const feed = useDashboardFeed()
        feed.connect()
        FakeWebSocket.instances[0].open()
        FakeWebSocket.instances[0].close(1006)
        vi.advanceTimersByTime(2_000)
        expect(FakeWebSocket.instances).toHaveLength(2)
    })

    it('disconnect stops reconnect', () => {
        const feed = useDashboardFeed()
        feed.connect()
        FakeWebSocket.instances[0].open()
        feed.disconnect()
        const closedCount = FakeWebSocket.instances.length
        vi.advanceTimersByTime(10_000)
        expect(FakeWebSocket.instances).toHaveLength(closedCount)
    })
})
