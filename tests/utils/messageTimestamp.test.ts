import { describe, it, expect } from 'vitest'
import { formatMessageTimestamp, formatDateDivider, isSameCalendarDay } from '@/utils/messageTimestamp'

describe('formatMessageTimestamp', () => {
    it('今天的訊息顯示「今天 HH:mm」', () => {
        const now = new Date(2026, 6, 7, 15, 0, 0) // 2026/07/07
        const createdDate = '2026-07-07T09:02:00'
        expect(formatMessageTimestamp(createdDate, now)).toBe('今天 09:02')
    })

    it('昨天的訊息顯示「昨天 HH:mm」', () => {
        const now = new Date(2026, 6, 7, 0, 30, 0) // 2026/07/07 剛過午夜
        const createdDate = '2026-07-06T23:59:00'
        expect(formatMessageTimestamp(createdDate, now)).toBe('昨天 23:59')
    })

    it('更早的訊息顯示完整日期「YYYY/MM/DD HH:mm」', () => {
        const now = new Date(2026, 6, 7, 15, 0, 0)
        const createdDate = '2026-07-01T21:10:00'
        expect(formatMessageTimestamp(createdDate, now)).toBe('2026/07/01 21:10')
    })

    it('跨年的更早訊息也顯示完整日期', () => {
        const now = new Date(2026, 6, 7, 15, 0, 0)
        const createdDate = '2025-12-31T23:00:00'
        expect(formatMessageTimestamp(createdDate, now)).toBe('2025/12/31 23:00')
    })

    it('午夜邊界：now 剛跨日，前一天最後一刻的訊息算「昨天」而非「今天」', () => {
        const now = new Date(2026, 6, 8, 0, 0, 1) // 2026/07/08 00:00:01
        const createdDate = '2026-07-07T23:59:59'
        expect(formatMessageTimestamp(createdDate, now)).toBe('昨天 23:59')
    })

    it('分鐘/小時個位數補零', () => {
        const now = new Date(2026, 6, 7, 15, 0, 0)
        const createdDate = '2026-07-07T09:05:00'
        expect(formatMessageTimestamp(createdDate, now)).toBe('今天 09:05')
    })
})

describe('formatDateDivider', () => {
    it('固定回傳完整日期 YYYY/MM/DD，不論今天/昨天', () => {
        expect(formatDateDivider('2026-07-07T09:02:00')).toBe('2026/07/07')
        expect(formatDateDivider('2026-01-01T00:00:00')).toBe('2026/01/01')
    })
})

describe('isSameCalendarDay', () => {
    it('同一天但不同時間 → true', () => {
        expect(isSameCalendarDay('2026-07-07T09:02:00', '2026-07-07T23:59:00')).toBe(true)
    })

    it('跨日（即使只差一分鐘） → false', () => {
        expect(isSameCalendarDay('2026-07-07T23:59:00', '2026-07-08T00:00:00')).toBe(false)
    })

    it('跨年 → false', () => {
        expect(isSameCalendarDay('2025-12-31T23:00:00', '2026-01-01T00:00:00')).toBe(false)
    })
})
