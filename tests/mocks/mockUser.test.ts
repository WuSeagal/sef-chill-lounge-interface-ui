import { describe, it, expect } from 'vitest'
import { mockUser, type MockUser } from '@/mocks/mockUser'

describe('mockUser', () => {
    it('matches MockUser shape', () => {
        expect(mockUser).toMatchObject({
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
    })

    it('avatarBgColor defaults to brainstorm spec value', () => {
        expect(mockUser.avatarBgColor).toBe('#8c8672')
    })

    it('has at most 5 stickers', () => {
        expect(mockUser.stickers.length).toBeLessThanOrEqual(5)
    })

    it('has at least one tag', () => {
        expect(mockUser.tags.length).toBeGreaterThan(0)
    })

    it('socialLinks items have platform and url', () => {
        for (const link of mockUser.socialLinks) {
            expect(link).toMatchObject({
                platform: expect.any(String),
                url: expect.any(String),
            })
        }
    })

    it('MockUser type is exported', () => {
        const _typeCheck: MockUser = mockUser
        expect(_typeCheck).toBeDefined()
    })
})
