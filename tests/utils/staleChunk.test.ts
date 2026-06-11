import { describe, it, expect, beforeEach, vi } from 'vitest'
import { isDynamicImportError, reloadForStaleChunk, STALE_CHUNK_RELOAD_KEY } from '@/utils/staleChunk'

describe('isDynamicImportError', () => {
    it('matches Vite/Chromium dynamic import failure messages', () => {
        expect(isDynamicImportError(new Error('Failed to fetch dynamically imported module: https://x/assets/ChatView-abc.js'))).toBe(true)
        expect(isDynamicImportError(new Error('error loading dynamically imported module'))).toBe(true)
        expect(isDynamicImportError(new Error('Importing a module script failed.'))).toBe(true)
        expect(isDynamicImportError(new Error('Failed to load module script: Expected a JavaScript-or-Wasm module script'))).toBe(true)
    })

    it('does not match unrelated errors', () => {
        expect(isDynamicImportError(new Error('TypeError: x is not a function'))).toBe(false)
        expect(isDynamicImportError(undefined)).toBe(false)
        expect(isDynamicImportError('some string')).toBe(false)
    })
})

describe('reloadForStaleChunk', () => {
    beforeEach(() => {
        sessionStorage.clear()
    })

    it('reloads on first call and records the timestamp', () => {
        const reload = vi.fn()
        const did = reloadForStaleChunk(reload, 1_000_000)
        expect(did).toBe(true)
        expect(reload).toHaveBeenCalledTimes(1)
        expect(sessionStorage.getItem(STALE_CHUNK_RELOAD_KEY)).toBe('1000000')
    })

    it('does NOT reload again within the guard window (prevents reload loop)', () => {
        const reload = vi.fn()
        reloadForStaleChunk(reload, 1_000_000)
        const did = reloadForStaleChunk(reload, 1_005_000) // 5s later, within 10s guard
        expect(did).toBe(false)
        expect(reload).toHaveBeenCalledTimes(1)
    })

    it('reloads again once the guard window has elapsed', () => {
        const reload = vi.fn()
        reloadForStaleChunk(reload, 1_000_000)
        const did = reloadForStaleChunk(reload, 1_011_000) // 11s later, past 10s guard
        expect(did).toBe(true)
        expect(reload).toHaveBeenCalledTimes(2)
    })
})
