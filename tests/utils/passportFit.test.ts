import { describe, it, expect } from 'vitest'
import { computeFitScale } from '@/utils/passportFit'

describe('computeFitScale', () => {
    it('full: caps at 1 when screen is larger than the passport', () => {
        const s = computeFitScale({ availW: 2000, availH: 2000, natW: 800, natH: 600, full: true })
        expect(s).toBe(1)
    })

    it('full: width-bound on a narrow portrait screen', () => {
        const s = computeFitScale({ availW: 360, availH: 2000, natW: 800, natH: 600, full: true })
        expect(s).toBeCloseTo(0.45, 5) // 360/800
    })

    it('full: height-bound on a short landscape screen', () => {
        const s = computeFitScale({ availW: 2000, availH: 300, natW: 800, natH: 600, full: true })
        expect(s).toBeCloseTo(0.5, 5) // 300/600
    })

    it('full: takes the stricter of width/height', () => {
        // width ratio 480/800 = 0.6, height ratio 300/600 = 0.5 -> height is stricter
        const s = computeFitScale({ availW: 480, availH: 300, natW: 800, natH: 600, full: true })
        expect(s).toBeCloseTo(0.5, 5)
    })

    it('non-full: width-only, ignores height', () => {
        const s = computeFitScale({ availW: 400, availH: 60, natW: 800, natH: 600, full: false })
        expect(s).toBeCloseTo(0.5, 5) // 400/800; height 60 would give 0.1 but is ignored
    })

    it('guards against zero natural width -> fallback 1', () => {
        const s = computeFitScale({ availW: 400, availH: 300, natW: 0, natH: 600, full: true })
        expect(s).toBe(1)
    })

    it('guards against NaN/Infinity available dims -> ignores that dim', () => {
        const s = computeFitScale({ availW: Number.NaN, availH: 300, natW: 800, natH: 600, full: true })
        expect(s).toBeCloseTo(0.5, 5) // width ignored, height 300/600
    })

    it('guards against non-positive available dims -> fallback 1', () => {
        const s = computeFitScale({ availW: -10, availH: -10, natW: 800, natH: 600, full: true })
        expect(s).toBe(1)
    })
})
