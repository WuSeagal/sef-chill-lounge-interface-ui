import { describe, it, expect, vi, afterEach } from 'vitest'
import { toDashboardMessage } from '@/utils/toDashboardMessage'
import type { ChatMessageBroadcastPayload } from '@/types/chat'

afterEach(() => vi.unstubAllEnvs())

function payload(over: Partial<ChatMessageBroadcastPayload> = {}): ChatMessageBroadcastPayload {
    return {
        cursorId: 1,
        messageId: 'msg-1',
        userId: 'u-1',
        messageType: 'TEXT',
        furName: 'Fox',
        avatar: '/a.png',
        avatarColor: '#fff',
        avatarBorder: true,
        content: 'hello',
        imageUrls: [],
        stickerImageUrl: null,
        createdDate: '2026-06-01T00:00:00.000Z',
        ...over,
    }
}

describe('toDashboardMessage', () => {
    it('maps TEXT message core fields', () => {
        const m = toDashboardMessage(payload())
        expect(m.id).toBe('msg-1')
        expect(m.userId).toBe('u-1')
        expect(m.nickname).toBe('Fox')
        expect(m.avatarUrl).toBe('/a.png')
        expect(m.avatarColor).toBe('#fff')
        expect(m.avatarBorder).toBe(true)
        expect(m.content).toBe('hello')
        expect(m.imageUrl).toBeUndefined()
        expect(m.timestamp).toBe('2026-06-01T00:00:00.000Z')
    })

    it('TEXT with images: imageUrl is the asset-resolved first image', () => {
        vi.stubEnv('VITE_ENDPOINT', 'http://localhost:9041')
        const m = toDashboardMessage(payload({ imageUrls: ['/image/a.png', '/image/b.png'] }))
        expect(m.imageUrl).toBe('http://localhost:9041/image/a.png')
    })

    it('STICKER: content empty, imageUrl is asset-resolved sticker url', () => {
        vi.stubEnv('VITE_ENDPOINT', 'http://localhost:9041')
        const m = toDashboardMessage(payload({
            messageType: 'STICKER', content: null, imageUrls: [], stickerImageUrl: '/sticker/u-1/1.png',
        }))
        expect(m.content).toBe('')
        expect(m.imageUrl).toBe('http://localhost:9041/sticker/u-1/1.png')
    })

    it('null furName/avatar map to safe defaults', () => {
        const m = toDashboardMessage(payload({ furName: null, avatar: null }))
        expect(m.nickname).toBe('')
        expect(m.avatarUrl).toBe('')
    })
})
