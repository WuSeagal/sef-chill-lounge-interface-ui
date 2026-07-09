import { describe, it, expect } from 'vitest'
import { snippetOf } from '@/utils/messageSnippet'

describe('snippetOf', () => {
    it('純文字訊息直接回原文', () => {
        expect(snippetOf({ messageType: 'TEXT', content: '看看這張' })).toBe('看看這張')
    })

    it('超過 50 字截斷並加省略號', () => {
        const long = 'a'.repeat(60)
        expect(snippetOf({ messageType: 'TEXT', content: long })).toBe('a'.repeat(50) + '…')
    })

    it('恰好 50 字不截斷', () => {
        const exact = 'a'.repeat(50)
        expect(snippetOf({ messageType: 'TEXT', content: exact })).toBe(exact)
    })

    it('無文字的圖片訊息回 [圖片]', () => {
        expect(snippetOf({ messageType: 'TEXT', content: null })).toBe('[圖片]')
        expect(snippetOf({ messageType: 'TEXT', content: '' })).toBe('[圖片]')
    })

    it('貼圖訊息回 [貼圖]', () => {
        expect(snippetOf({ messageType: 'STICKER', content: null })).toBe('[貼圖]')
    })
})
