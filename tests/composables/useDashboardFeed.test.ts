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
        // 清掉本測試 module 實例註冊在 document/window 的生命週期監聽（visibilitychange/online）。
        // resetModules 只換新 module，不會移除舊 module 殘留在 global 的監聽；若不清，後續測試
        // dispatch 事件時會觸發殘留監聽的 connect()，污染共用的 FakeWebSocket.instances 計數。
        useDashboardFeed().disconnect()
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

    it('PRESENCE_SNAPSHOT sets onlineCount to the number of online users', () => {
        const feed = useDashboardFeed()
        feed.connect()
        const socket = FakeWebSocket.instances[0]
        socket.open()
        socket.deliver(JSON.stringify({ type: 'PRESENCE_SNAPSHOT', timestamp: 1, data: { onlineUserIds: ['u-1', 'u-2', 'u-3'] } }))
        expect(feed.onlineCount.value).toBe(3)
    })

    it('連線後 replay 期間（PRESENCE_SNAPSHOT 之前）的 CHAT_MESSAGE 不播入場動畫', () => {
        const feed = useDashboardFeed()
        feed.connect()
        const socket = FakeWebSocket.instances[0]
        socket.open()
        socket.deliver(chatMsg('replay-1'))
        socket.deliver(chatMsg('replay-2'))
        expect(feed.bubbles.value.every(b => b.animateEntrance === false)).toBe(true)
    })

    it('PRESENCE_SNAPSHOT（replay 邊界）之後到達的 CHAT_MESSAGE 才播入場動畫', () => {
        const feed = useDashboardFeed()
        feed.connect()
        const socket = FakeWebSocket.instances[0]
        socket.open()
        socket.deliver(chatMsg('replay-1'))
        socket.deliver(JSON.stringify({ type: 'PRESENCE_SNAPSHOT', timestamp: 1, data: { onlineUserIds: ['u-1'] } }))
        socket.deliver(chatMsg('live-1'))

        const replayBubble = feed.bubbles.value.find(b => b.message.id === 'replay-1')
        const liveBubble = feed.bubbles.value.find(b => b.message.id === 'live-1')
        expect(replayBubble?.animateEntrance).toBe(false)
        expect(liveBubble?.animateEntrance).toBe(true)
    })

    it('重連時重置 live 邊界：reconnect 後 replay（新 PRESENCE_SNAPSHOT 之前）的訊息不播動畫', () => {
        const feed = useDashboardFeed()
        feed.connect()
        const s1 = FakeWebSocket.instances[0]
        s1.open()
        s1.deliver(JSON.stringify({ type: 'PRESENCE_SNAPSHOT', timestamp: 1, data: { onlineUserIds: ['u-1'] } }))
        s1.close(1006)
        vi.advanceTimersByTime(2_000)
        const s2 = FakeWebSocket.instances[1]
        s2.open()
        s2.deliver(chatMsg('reconnect-replay'))
        const b = feed.bubbles.value.find(x => x.message.id === 'reconnect-replay')
        expect(b?.animateEntrance).toBe(false)
    })

    it('ready 初始為 false，收到首個 PRESENCE_SNAPSHOT 後為 true', () => {
        const feed = useDashboardFeed()
        expect(feed.ready.value).toBe(false)

        feed.connect()
        const socket = FakeWebSocket.instances[0]
        socket.open()
        socket.deliver(JSON.stringify({ type: 'PRESENCE_SNAPSHOT', timestamp: 1, data: { onlineUserIds: ['u-1'] } }))

        expect(feed.ready.value).toBe(true)
    })

    it('ready 一旦為 true，重連再 replay 不會被 reset 回 false', () => {
        const feed = useDashboardFeed()
        feed.connect()
        const s1 = FakeWebSocket.instances[0]
        s1.open()
        s1.deliver(JSON.stringify({ type: 'PRESENCE_SNAPSHOT', timestamp: 1, data: { onlineUserIds: ['u-1'] } }))
        expect(feed.ready.value).toBe(true)

        s1.close(1006)
        vi.advanceTimersByTime(2_000)
        const s2 = FakeWebSocket.instances[1]
        s2.open()
        s2.deliver(chatMsg('reconnect-replay'))

        expect(feed.ready.value).toBe(true)
    })

    it('connected is true after open and false after unexpected close', () => {
        const feed = useDashboardFeed()
        feed.connect()
        const socket = FakeWebSocket.instances[0]
        socket.open()
        expect(feed.connected.value).toBe(true)
        socket.close(1006)
        expect(feed.connected.value).toBe(false)
    })

    it('MESSAGE_DELETED removes the matching bubble', () => {
        const feed = useDashboardFeed()
        feed.connect()
        const socket = FakeWebSocket.instances[0]
        socket.open()
        socket.deliver(chatMsg('msg-del'))
        socket.deliver(chatMsg('msg-keep'))
        expect(feed.bubbles.value).toHaveLength(2)

        socket.deliver(JSON.stringify({ type: 'MESSAGE_DELETED', timestamp: 3, data: { messageId: 'msg-del' } }))

        expect(feed.bubbles.value.map(b => b.message.id)).toEqual(['msg-keep'])
    })

    it('MESSAGE_DELETED for an unknown id is a no-op', () => {
        const feed = useDashboardFeed()
        feed.connect()
        const socket = FakeWebSocket.instances[0]
        socket.open()
        socket.deliver(chatMsg('msg-1'))

        expect(() => socket.deliver(JSON.stringify({ type: 'MESSAGE_DELETED', timestamp: 3, data: { messageId: 'ghost' } }))).not.toThrow()
        expect(feed.bubbles.value).toHaveLength(1)
    })

    // ── D4 / dashboard-page：回前景主動重連 ──────────────────────────

    function setHidden(hidden: boolean) {
        Object.defineProperty(document, 'visibilityState', {
            configurable: true,
            get: () => (hidden ? 'hidden' : 'visible'),
        })
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden })
    }

    it('回前景且連線非 OPEN 時立即重連（不等退避）', () => {
        const feed = useDashboardFeed()
        feed.connect()
        const s1 = FakeWebSocket.instances[0]
        s1.open()
        // 連線斷掉但尚在退避等待中（reconnectTimer pending）
        s1.close(1006)
        expect(FakeWebSocket.instances).toHaveLength(1)

        // 回前景：應立即重連，不等 2s backoff
        setHidden(false)
        document.dispatchEvent(new Event('visibilitychange'))

        expect(FakeWebSocket.instances).toHaveLength(2)
        feed.disconnect()
    })

    it('online 事件且連線非 OPEN 時立即重連', () => {
        const feed = useDashboardFeed()
        feed.connect()
        const s1 = FakeWebSocket.instances[0]
        s1.open()
        s1.close(1006)
        expect(FakeWebSocket.instances).toHaveLength(1)

        setHidden(false)
        window.dispatchEvent(new Event('online'))

        expect(FakeWebSocket.instances).toHaveLength(2)
        feed.disconnect()
    })

    it('回前景但連線仍 OPEN（且 PONG 未逾時）時不重連', () => {
        const feed = useDashboardFeed()
        feed.connect()
        const s1 = FakeWebSocket.instances[0]
        s1.open()
        expect(FakeWebSocket.instances).toHaveLength(1)

        setHidden(false)
        document.dispatchEvent(new Event('visibilitychange'))

        expect(FakeWebSocket.instances).toHaveLength(1)
        feed.disconnect()
    })

    it('頁面仍隱藏（hidden）時 visibilitychange 不重連', () => {
        const feed = useDashboardFeed()
        feed.connect()
        const s1 = FakeWebSocket.instances[0]
        s1.open()
        s1.close(1006)

        setHidden(true)
        document.dispatchEvent(new Event('visibilitychange'))

        expect(FakeWebSocket.instances).toHaveLength(1)
        feed.disconnect()
    })

    it('disconnect 後移除 visibilitychange/online 監聽（不殘留重連）', () => {
        const feed = useDashboardFeed()
        feed.connect()
        const s1 = FakeWebSocket.instances[0]
        s1.open()
        feed.disconnect()
        const countAfterDisconnect = FakeWebSocket.instances.length

        // disconnect 後事件不應再觸發任何重連
        setHidden(false)
        document.dispatchEvent(new Event('visibilitychange'))
        window.dispatchEvent(new Event('online'))

        expect(FakeWebSocket.instances).toHaveLength(countAfterDisconnect)
    })
})
