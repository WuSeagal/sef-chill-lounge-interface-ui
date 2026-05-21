import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useDashboardBubbles } from '@/composables/useDashboardBubbles'
import type { MockMessage } from '@/mocks/mockMessages'

function makeMockMsg(id: string, content = 'hello'): MockMessage {
    return {
        id,
        userId: 'u-101',
        nickname: 'Test',
        avatarUrl: '/mock-images/avatar-default.png',
        content,
        timestamp: '2026-05-21T00:00:00.000Z',
    }
}

describe('useDashboardBubbles — addBubble basics', () => {
    it('starts with an empty array', () => {
        const { bubbles } = useDashboardBubbles()
        expect(bubbles.value).toHaveLength(0)
    })

    it('addBubble pushes a bubble with the correct message', () => {
        const { bubbles, addBubble } = useDashboardBubbles()
        const msg = makeMockMsg('msg-001')
        addBubble(msg)
        expect(bubbles.value).toHaveLength(1)
        expect(bubbles.value[0].message).toEqual(msg)
    })

    it('bubble id is prefixed with "bubble-"', () => {
        const { bubbles, addBubble } = useDashboardBubbles()
        addBubble(makeMockMsg('msg-042'))
        expect(bubbles.value[0].id).toBe('bubble-msg-042')
    })

    it('bubble direction is "left" or "right"', () => {
        const { bubbles, addBubble } = useDashboardBubbles()
        addBubble(makeMockMsg('msg-001'))
        expect(['left', 'right']).toContain(bubbles.value[0].direction)
    })

    it('x is within viewport bounds', () => {
        const { bubbles, addBubble } = useDashboardBubbles()
        for (let i = 0; i < 20; i++) {
            addBubble(makeMockMsg(`msg-${i}`))
        }
        for (const b of bubbles.value) {
            expect(b.x).toBeGreaterThanOrEqual(0)
            expect(b.x).toBeLessThanOrEqual(window.innerWidth)
        }
    })

    it('y is within viewport bounds', () => {
        const { bubbles, addBubble } = useDashboardBubbles()
        for (let i = 0; i < 20; i++) {
            addBubble(makeMockMsg(`msg-${i}`))
        }
        for (const b of bubbles.value) {
            expect(b.y).toBeGreaterThanOrEqual(0)
            expect(b.y).toBeLessThanOrEqual(window.innerHeight)
        }
    })

    it('dx and dy are non-zero velocities', () => {
        const { bubbles, addBubble } = useDashboardBubbles()
        for (let i = 0; i < 20; i++) {
            addBubble(makeMockMsg(`msg-${i}`))
        }
        for (const b of bubbles.value) {
            expect(Math.abs(b.dx)).toBeGreaterThanOrEqual(30)
            expect(Math.abs(b.dx)).toBeLessThanOrEqual(60)
            expect(Math.abs(b.dy)).toBeGreaterThanOrEqual(30)
            expect(Math.abs(b.dy)).toBeLessThanOrEqual(60)
        }
    })

    it('isExiting starts as false', () => {
        const { bubbles, addBubble } = useDashboardBubbles()
        addBubble(makeMockMsg('msg-001'))
        expect(bubbles.value[0].isExiting).toBe(false)
    })
})

describe('useDashboardBubbles — z-index', () => {
    it('z-index increases monotonically across addBubble calls', () => {
        const { bubbles, addBubble } = useDashboardBubbles()
        addBubble(makeMockMsg('msg-001'))
        addBubble(makeMockMsg('msg-002'))
        addBubble(makeMockMsg('msg-003'))
        const zValues = bubbles.value.map(b => b.zIndex)
        expect(zValues[0]).toBeLessThan(zValues[1])
        expect(zValues[1]).toBeLessThan(zValues[2])
    })

    it('each composable instance has its own z-counter', () => {
        const a = useDashboardBubbles()
        const b = useDashboardBubbles()
        a.addBubble(makeMockMsg('msg-a1'))
        b.addBubble(makeMockMsg('msg-b1'))
        expect(a.bubbles.value[0].zIndex).toBe(1)
        expect(b.bubbles.value[0].zIndex).toBe(1)
    })
})

describe('useDashboardBubbles — FIFO eviction', () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('adding the 31st bubble marks the oldest as isExiting', () => {
        const { bubbles, addBubble } = useDashboardBubbles()
        for (let i = 1; i <= 30; i++) {
            addBubble(makeMockMsg(`msg-${i}`))
        }
        expect(bubbles.value).toHaveLength(30)
        expect(bubbles.value[0].isExiting).toBe(false)

        addBubble(makeMockMsg('msg-31'))
        expect(bubbles.value).toHaveLength(31)
        expect(bubbles.value[0].isExiting).toBe(true)
    })

    it('exiting bubble is removed from array after 500ms', () => {
        const { bubbles, addBubble } = useDashboardBubbles()
        for (let i = 1; i <= 31; i++) {
            addBubble(makeMockMsg(`msg-${i}`))
        }
        expect(bubbles.value).toHaveLength(31)

        vi.advanceTimersByTime(500)
        expect(bubbles.value).toHaveLength(30)
        expect(bubbles.value[0].id).toBe('bubble-msg-2')
    })

    it('new bubble and exiting bubble coexist during the 500ms window', () => {
        const { bubbles, addBubble } = useDashboardBubbles()
        for (let i = 1; i <= 30; i++) {
            addBubble(makeMockMsg(`msg-${i}`))
        }
        addBubble(makeMockMsg('msg-31'))

        expect(bubbles.value).toHaveLength(31)
        const exitingCount = bubbles.value.filter(b => b.isExiting).length
        expect(exitingCount).toBe(1)

        vi.advanceTimersByTime(250)
        expect(bubbles.value).toHaveLength(31)

        vi.advanceTimersByTime(250)
        expect(bubbles.value).toHaveLength(30)
    })

    it('rapid additions evict multiple oldest bubbles', () => {
        const { bubbles, addBubble } = useDashboardBubbles()
        for (let i = 1; i <= 30; i++) {
            addBubble(makeMockMsg(`msg-${i}`))
        }
        addBubble(makeMockMsg('msg-31'))
        addBubble(makeMockMsg('msg-32'))
        addBubble(makeMockMsg('msg-33'))

        expect(bubbles.value).toHaveLength(33)
        const exitingIds = bubbles.value.filter(b => b.isExiting).map(b => b.id)
        expect(exitingIds).toEqual([
            'bubble-msg-1',
            'bubble-msg-2',
            'bubble-msg-3',
        ])

        vi.advanceTimersByTime(500)
        expect(bubbles.value).toHaveLength(30)
    })

    it('cleanup cancels pending exit timers', () => {
        const { bubbles, addBubble, cleanup } = useDashboardBubbles()
        for (let i = 1; i <= 31; i++) {
            addBubble(makeMockMsg(`msg-${i}`))
        }
        expect(bubbles.value[0].isExiting).toBe(true)

        cleanup()
        vi.advanceTimersByTime(500)
        expect(bubbles.value).toHaveLength(31)
    })
})
