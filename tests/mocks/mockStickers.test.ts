import { describe, it, expect } from 'vitest'
import { mockStickers } from '@/mocks/mockStickers'

describe('mockStickers', () => {
    it('exports exactly 5 default sticker URLs', () => {
        expect(mockStickers.length).toBe(5)
    })

    it('every entry is a non-empty string', () => {
        for (const url of mockStickers) {
            expect(typeof url).toBe('string')
            expect(url.length).toBeGreaterThan(0)
        }
    })
})
