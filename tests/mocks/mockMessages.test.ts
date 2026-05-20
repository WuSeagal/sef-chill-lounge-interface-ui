import { describe, it, expect } from 'vitest'
import { mockMessages, type MockMessage } from '@/mocks/mockMessages'

describe('mockMessages', () => {
    it('exports an array of at least 20 messages', () => {
        expect(mockMessages.length).toBeGreaterThanOrEqual(20)
    })

    it('every message matches MockMessage shape', () => {
        for (const msg of mockMessages) {
            expect(msg).toMatchObject({
                id: expect.any(String),
                userId: expect.any(String),
                nickname: expect.any(String),
                avatarUrl: expect.any(String),
                content: expect.any(String),
                timestamp: expect.any(String),
            })
        }
    })

    it('contains both text-only and image messages', () => {
        const hasImage = mockMessages.some((m) => typeof m.imageUrl === 'string')
        const hasTextOnly = mockMessages.some(
            (m) => m.imageUrl === undefined && m.content.length > 0
        )
        expect(hasImage).toBe(true)
        expect(hasTextOnly).toBe(true)
    })

    it('timestamps are valid ISO 8601 strings', () => {
        for (const msg of mockMessages) {
            expect(() => new Date(msg.timestamp).toISOString()).not.toThrow()
        }
    })

    it('message ids are unique', () => {
        const ids = mockMessages.map((m) => m.id)
        const uniq = new Set(ids)
        expect(uniq.size).toBe(ids.length)
    })

    it('MockMessage type is exported', () => {
        const _typeCheck: MockMessage = mockMessages[0]
        expect(_typeCheck).toBeDefined()
    })
})
