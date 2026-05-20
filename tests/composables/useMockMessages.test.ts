import { describe, it, expect, beforeEach } from 'vitest'
import { isRef } from 'vue'
import { useMockMessages, resetMockMessagesForTest } from '@/composables/useMockMessages'

describe('useMockMessages', () => {
    beforeEach(() => {
        resetMockMessagesForTest()
    })

    it('returns a reactive ref to a messages array', () => {
        const { messages } = useMockMessages()
        expect(isRef(messages)).toBe(true)
        expect(Array.isArray(messages.value)).toBe(true)
        expect(messages.value.length).toBeGreaterThan(0)
    })

    it('appendMessage adds a new message to the array', () => {
        const { messages, appendMessage } = useMockMessages()
        const before = messages.value.length
        appendMessage({
            userId: 'u-101',
            nickname: '小毛',
            avatarUrl: '/x.png',
            content: 'hi',
        })
        expect(messages.value.length).toBe(before + 1)
    })

    it('appendMessage auto-generates id and timestamp', () => {
        const { messages, appendMessage } = useMockMessages()
        appendMessage({
            userId: 'u-101',
            nickname: '小毛',
            avatarUrl: '/x.png',
            content: 'hi',
        })
        const last = messages.value[messages.value.length - 1]
        expect(last.id).toMatch(/^msg-/)
        expect(() => new Date(last.timestamp).toISOString()).not.toThrow()
    })

    it('returns the same singleton across calls', () => {
        const a = useMockMessages()
        const b = useMockMessages()
        a.appendMessage({
            userId: 'u-1',
            nickname: 'x',
            avatarUrl: '/x.png',
            content: 'shared',
        })
        expect(b.messages.value[b.messages.value.length - 1].content).toBe('shared')
    })
})
