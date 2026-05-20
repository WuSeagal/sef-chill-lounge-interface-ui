import { describe, it, expect } from 'vitest'
import { isRef } from 'vue'
import { useMockTopics, resetMockTopicsForTest } from '@/composables/useMockTopics'

describe('useMockTopics', () => {
    it('returns a reactive ref to topics array', () => {
        const { topics } = useMockTopics()
        expect(isRef(topics)).toBe(true)
        expect(topics.value.length).toBeGreaterThanOrEqual(10)
    })

    it('drawRandom returns a topic from the pool', () => {
        const { topics, drawRandom } = useMockTopics()
        const drawn = drawRandom()
        const ids = topics.value.map((t) => t.id)
        expect(ids).toContain(drawn.id)
    })

    it('drawRandom returns different topics across multiple draws (probabilistic)', () => {
        const { drawRandom } = useMockTopics()
        const seen = new Set<string>()
        for (let i = 0; i < 30; i++) {
            seen.add(drawRandom().id)
        }
        expect(seen.size).toBeGreaterThan(1)
    })

    it('drawRandom returns a safe fallback when pool is empty', () => {
        resetMockTopicsForTest()
        const { topics, drawRandom } = useMockTopics()
        topics.value = []
        const result = drawRandom()
        expect(result).toEqual({ id: '', topicId: '', content: '' })
    })
})
