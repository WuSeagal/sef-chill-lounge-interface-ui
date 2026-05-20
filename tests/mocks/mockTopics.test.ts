import { describe, it, expect } from 'vitest'
import { mockTopics, type MockTopic } from '@/mocks/mockTopics'

describe('mockTopics', () => {
    it('exports an array of at least 10 topics', () => {
        expect(mockTopics.length).toBeGreaterThanOrEqual(10)
    })

    it('every topic matches MockTopic shape', () => {
        for (const topic of mockTopics) {
            expect(topic).toMatchObject({
                id: expect.any(String),
                topicId: expect.any(String),
                content: expect.any(String),
            })
        }
    })

    it('topic content is non-empty plain text', () => {
        for (const topic of mockTopics) {
            expect(topic.content.length).toBeGreaterThan(0)
            expect(topic.content).not.toMatch(/<[^>]+>/) // no HTML tags
        }
    })

    it('topic ids are unique', () => {
        const ids = mockTopics.map((t) => t.id)
        expect(new Set(ids).size).toBe(ids.length)
    })

    it('MockTopic type is exported', () => {
        const _typeCheck: MockTopic = mockTopics[0]
        expect(_typeCheck).toBeDefined()
    })
})
