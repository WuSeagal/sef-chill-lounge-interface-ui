import { describe, it, expect, beforeEach } from 'vitest'
import { isRef } from 'vue'
import { useMockUser, resetMockUserForTest } from '@/composables/useMockUser'

describe('useMockUser', () => {
    beforeEach(() => {
        resetMockUserForTest()
    })

    it('returns a reactive ref containing the mock user', () => {
        const { user } = useMockUser()
        expect(isRef(user)).toBe(true)
        expect(user.value.id).toBe('u-101')
    })

    it('allows mutating nickname (mock-only)', () => {
        const { user, setNickname } = useMockUser()
        setNickname('NewName')
        expect(user.value.nickname).toBe('NewName')
    })

    it('allows redrawing topicCard from a provided pool', () => {
        const { user, redrawTopicCard } = useMockUser()
        const initialContent = user.value.topicCard.content
        const pool = [
            { id: 'tc-x', topicId: 'T-x', content: '完全不同的內容 X' },
            { id: 'tc-y', topicId: 'T-y', content: '完全不同的內容 Y' },
        ]
        // call multiple times to overcome random equality
        for (let i = 0; i < 10; i++) {
            redrawTopicCard(pool)
        }
        expect(user.value.topicCard.content).not.toBe(initialContent)
    })

    it('returns the same singleton instance across calls', () => {
        const a = useMockUser()
        const b = useMockUser()
        a.setNickname('SharedName')
        expect(b.user.value.nickname).toBe('SharedName')
    })

    it('redrawTopicCard with empty pool does not change topicCard', () => {
        const { user, redrawTopicCard } = useMockUser()
        const before = user.value.topicCard.content
        redrawTopicCard([])
        expect(user.value.topicCard.content).toBe(before)
    })
})
