import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { assetUrl } from '@/utils/assetUrl'

describe('assetUrl', () => {
    const originalEnv = import.meta.env.VITE_ENDPOINT

    beforeEach(() => {
        vi.stubEnv('VITE_ENDPOINT', 'http://localhost:9041')
    })

    afterEach(() => {
        vi.stubEnv('VITE_ENDPOINT', originalEnv ?? '')
        vi.unstubAllEnvs()
    })

    it('prepends endpoint to a server-relative chat image path', () => {
        expect(assetUrl('/image/abc-260526143000-x7K.png'))
            .toBe('http://localhost:9041/image/abc-260526143000-x7K.png')
    })

    it('prepends endpoint to avatar and sticker paths', () => {
        expect(assetUrl('/user/u-1.jpg')).toBe('http://localhost:9041/user/u-1.jpg')
        expect(assetUrl('/sticker/u-1/3.png')).toBe('http://localhost:9041/sticker/u-1/3.png')
    })

    it('returns http(s) URLs untouched', () => {
        expect(assetUrl('https://cdn.example.com/x.jpg')).toBe('https://cdn.example.com/x.jpg')
        expect(assetUrl('http://other/y.png')).toBe('http://other/y.png')
    })

    it('returns blob: and data: URLs untouched', () => {
        expect(assetUrl('blob:http://localhost:9045/abc')).toBe('blob:http://localhost:9045/abc')
        expect(assetUrl('data:image/png;base64,iVBORw0K')).toBe('data:image/png;base64,iVBORw0K')
    })

    it('returns empty string for null / undefined / empty', () => {
        expect(assetUrl(null)).toBe('')
        expect(assetUrl(undefined)).toBe('')
        expect(assetUrl('')).toBe('')
    })

    it('falls back to no prefix when VITE_ENDPOINT is unset', () => {
        vi.stubEnv('VITE_ENDPOINT', '')
        expect(assetUrl('/image/x.png')).toBe('/image/x.png')
    })
})
