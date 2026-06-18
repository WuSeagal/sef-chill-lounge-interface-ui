import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/request', () => {
    const post = vi.fn()
    return { default: { post } }
})

import service from '@/utils/request'
import { setAnnouncement } from '@/api/announcementApi'

describe('announcementApi', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('setAnnouncement POSTs /announcement with text', async () => {
        ;(service.post as any).mockResolvedValue({})

        await setAnnouncement('18:00 抽獎')

        expect(service.post).toHaveBeenCalledWith('/announcement', { text: '18:00 抽獎' })
    })

    it('清除以空字串呼叫', async () => {
        ;(service.post as any).mockResolvedValue({})

        await setAnnouncement('')

        expect(service.post).toHaveBeenCalledWith('/announcement', { text: '' })
    })
})
