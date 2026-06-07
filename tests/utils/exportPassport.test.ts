import { describe, it, expect, vi, beforeEach } from 'vitest'

// mock html-to-image：預設回傳一個假 blob
const toBlobMock = vi.fn()
vi.mock('html-to-image', () => ({ toBlob: (...args: unknown[]) => toBlobMock(...args) }))

import { buildPassportFileName, exportPassportToPng } from '@/utils/exportPassport'

describe('buildPassportFileName', () => {
    it('slugifies furName and keeps CJK / digits', () => {
        expect(buildPassportFileName('毛毛 Fox 123')).toBe('passport-毛毛_Fox_123.png')
    })
    it('falls back to passport.png for empty/blank', () => {
        expect(buildPassportFileName('')).toBe('passport.png')
        expect(buildPassportFileName('   ')).toBe('passport.png')
        expect(buildPassportFileName(null)).toBe('passport.png')
        expect(buildPassportFileName(undefined)).toBe('passport.png')
    })
})

describe('exportPassportToPng', () => {
    beforeEach(() => {
        toBlobMock.mockReset()
        ;(URL as any).createObjectURL = vi.fn(() => 'blob:fake')
        ;(URL as any).revokeObjectURL = vi.fn()
    })

    function makeCard(): HTMLElement {
        const card = document.createElement('div')
        card.className = 'passport'
        document.body.appendChild(card)
        return card
    }

    it('adds export-mode during capture and removes it afterwards; calls toBlob with the card', async () => {
        const blob = new Blob(['x'], { type: 'image/png' })
        let classDuringCapture = false
        toBlobMock.mockImplementation((node: HTMLElement) => {
            classDuringCapture = node.classList.contains('export-mode')
            return Promise.resolve(blob)
        })
        const card = makeCard()
        const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

        await exportPassportToPng(card, { fileName: 'passport-foo.png' })

        expect(toBlobMock).toHaveBeenCalledTimes(1)
        expect(toBlobMock.mock.calls[0][0]).toBe(card)
        expect(classDuringCapture).toBe(true)
        expect(card.classList.contains('export-mode')).toBe(false)
        expect(clickSpy).toHaveBeenCalled()
        clickSpy.mockRestore()
        card.remove()
    })

    it('throws and still removes export-mode when blob is null', async () => {
        toBlobMock.mockResolvedValue(null)
        const card = makeCard()
        await expect(exportPassportToPng(card, { fileName: 'passport.png' })).rejects.toThrow()
        expect(card.classList.contains('export-mode')).toBe(false)
        card.remove()
    })

    function addScroller(card: HTMLElement, cls: string, scrollTop: number): HTMLElement {
        const sc = document.createElement('div')
        sc.className = cls
        const child = document.createElement('div')
        sc.appendChild(child)
        card.appendChild(sc)
        // jsdom 無 layout，scrollTop 預設恆 0；用 defineProperty 模擬已捲動
        Object.defineProperty(sc, 'scrollTop', { value: scrollTop, writable: true, configurable: true })
        return child
    }

    it('bakes current scrollTop into negative margin during capture and restores it after', async () => {
        const blob = new Blob(['x'], { type: 'image/png' })
        const card = makeCard()
        const child = addScroller(card, 'ps-tag-scroll', 40)
        let marginDuringCapture: string | undefined
        toBlobMock.mockImplementation(() => {
            marginDuringCapture = child.style.marginTop
            return Promise.resolve(blob)
        })
        vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

        await exportPassportToPng(card, { fileName: 'passport.png' })

        expect(marginDuringCapture).toBe('-40px') // 擷取時把 scrollTop 烤進負 margin
        expect(child.style.marginTop).toBe('')     // 之後還原
        card.remove()
    })

    it('restores the live scroller scrollTop after capture (even if baking clamps it)', async () => {
        const blob = new Blob(['x'], { type: 'image/png' })
        const card = makeCard()
        const child = addScroller(card, 'ps-tag-scroll', 120)
        const scroller = child.parentElement as HTMLElement
        toBlobMock.mockImplementation(() => {
            // 模擬：負 margin 縮短 scrollHeight → 瀏覽器把 live scrollTop 夾回 0
            scroller.scrollTop = 0
            return Promise.resolve(blob)
        })
        vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

        await exportPassportToPng(card, { fileName: 'passport.png' })

        expect(scroller.scrollTop).toBe(120) // 匯出後還原回原捲動位置，不殘留被夾的 0
        card.remove()
    })

    it('restores export-mode and scroller margins when toBlob rejects (e.g. taint)', async () => {
        const card = makeCard()
        const child = addScroller(card, 'ps-social-scroll', 25)
        toBlobMock.mockRejectedValue(new Error('tainted'))

        await expect(exportPassportToPng(card, { fileName: 'passport.png' })).rejects.toThrow()

        expect(card.classList.contains('export-mode')).toBe(false)
        expect(child.style.marginTop).toBe('') // reject 路徑也還原
        card.remove()
    })

    it('inlines <img> as a data URL (by real blob type) during capture and restores src after', async () => {
        const png = new Blob(['x'], { type: 'image/png' })
        // 模擬「URL 是 .png、但後端回退 SVG」：fetch 回 image/svg+xml blob
        const svgBlob = new Blob(['<svg/>'], { type: 'image/svg+xml' })
        const fetchMock = vi.fn(() => Promise.resolve({ blob: () => Promise.resolve(svgBlob) }))
        vi.stubGlobal('fetch', fetchMock)

        const card = makeCard()
        const img = document.createElement('img')
        img.className = 'ps-photo'
        img.setAttribute('src', 'http://backend/user/seagal.png')
        card.appendChild(img)

        let srcDuringCapture: string | null = null
        toBlobMock.mockImplementation(() => {
            srcDuringCapture = img.getAttribute('src')
            return Promise.resolve(png)
        })
        vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

        await exportPassportToPng(card, { fileName: 'passport.png' })

        expect(fetchMock).toHaveBeenCalledWith('http://backend/user/seagal.png', { mode: 'cors' })
        expect(srcDuringCapture?.startsWith('data:')).toBe(true)        // 擷取時已內嵌成 data URL
        expect(img.getAttribute('src')).toBe('http://backend/user/seagal.png') // 之後還原原 src
        vi.unstubAllGlobals()
        card.remove()
    })

    it('does not break export when an image fetch fails (best-effort, leaves src)', async () => {
        const png = new Blob(['x'], { type: 'image/png' })
        vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('network'))))
        const card = makeCard()
        const img = document.createElement('img')
        img.setAttribute('src', 'http://backend/user/missing.png')
        card.appendChild(img)
        toBlobMock.mockResolvedValue(png)
        vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

        await expect(exportPassportToPng(card, { fileName: 'passport.png' })).resolves.toBeUndefined()

        expect(img.getAttribute('src')).toBe('http://backend/user/missing.png') // 失敗則留原樣
        vi.unstubAllGlobals()
        card.remove()
    })
})
