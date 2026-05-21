import { describe, it, expect } from 'vitest'
import { mockMembers } from '@/mocks/mockMembers'
import { mockUser } from '@/mocks/mockUser'
import type { MockUser } from '@/mocks/mockUser'

describe('mockMembers', () => {
    it('exports at least 7 entries covering every userId used in mockMessages', () => {
        expect(mockMembers.length).toBeGreaterThanOrEqual(7)
        const expected = ['u-101', 'u-102', 'u-103', 'u-104', 'u-105', 'u-106', 'u-107']
        for (const id of expected) {
            const found = mockMembers.find((m) => m.id === id)
            expect(found, `userId ${id} missing from mockMembers`).toBeDefined()
        }
    })

    it('every entry matches MockUser shape', () => {
        for (const m of mockMembers) {
            expect(m).toMatchObject({
                id: expect.any(String),
                nickname: expect.any(String),
                avatarUrl: expect.any(String),
                avatarBgColor: expect.any(String),
                tags: expect.any(Array),
                socialLinks: expect.any(Array),
                stickers: expect.any(Array),
                topicCard: expect.objectContaining({
                    id: expect.any(String),
                    topicId: expect.any(String),
                    content: expect.any(String),
                }),
                donateUrl: expect.any(String),
            })
        }
    })

    it('ids are unique', () => {
        const ids = mockMembers.map((m) => m.id)
        expect(new Set(ids).size).toBe(ids.length)
    })

    it('the u-101 entry matches mockUser data', () => {
        const me = mockMembers.find((m) => m.id === 'u-101')
        expect(me).toBeDefined()
        expect(me!.nickname).toBe(mockUser.nickname)
        expect(me!.avatarUrl).toBe(mockUser.avatarUrl)
    })

    it('MockUser type is satisfied at compile time', () => {
        const _check: MockUser[] = mockMembers
        expect(_check).toBeDefined()
    })
})
