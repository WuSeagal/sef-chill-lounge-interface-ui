import { describe, it, expect } from 'vitest'
import { computeScrollEdges } from '@/utils/scrollEdges'

describe('computeScrollEdges', () => {
    it('reports no overflow when content fits', () => {
        const e = computeScrollEdges({ scrollTop: 0, scrollHeight: 100, clientHeight: 100 })
        expect(e.overflowing).toBe(false)
        expect(e.atTop).toBe(true)
        expect(e.atBottom).toBe(true)
    })

    it('at top when scrollTop is 0 and content overflows', () => {
        const e = computeScrollEdges({ scrollTop: 0, scrollHeight: 300, clientHeight: 100 })
        expect(e.overflowing).toBe(true)
        expect(e.atTop).toBe(true)
        expect(e.atBottom).toBe(false)
    })

    it('in the middle: neither top nor bottom', () => {
        const e = computeScrollEdges({ scrollTop: 100, scrollHeight: 300, clientHeight: 100 })
        expect(e.atTop).toBe(false)
        expect(e.atBottom).toBe(false)
    })

    it('at bottom when scrolled to the end', () => {
        const e = computeScrollEdges({ scrollTop: 200, scrollHeight: 300, clientHeight: 100 })
        expect(e.atTop).toBe(false)
        expect(e.atBottom).toBe(true)
    })

    it('treats sub-pixel gaps within threshold as the edge', () => {
        const e = computeScrollEdges({ scrollTop: 199.6, scrollHeight: 300, clientHeight: 100 })
        expect(e.atBottom).toBe(true)
    })
})
