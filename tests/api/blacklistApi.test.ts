import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/utils/request', () => {
    const get = vi.fn()
    const post = vi.fn()
    return { default: { get, post } }
})

import service from '@/utils/request'
import * as blacklistApi from '@/api/blacklistApi'

describe('blacklistApi', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('fetchBlacklist GETs /blacklist and unwraps data', async () => {
        ;(service.get as any).mockResolvedValue({
            data: [{ userId: 'u-1', furName: '小狐狸', username: 'fox' }],
        })

        const r = await blacklistApi.fetchBlacklist()

        expect(service.get).toHaveBeenCalledWith('/blacklist')
        expect(r).toEqual([{ userId: 'u-1', furName: '小狐狸', username: 'fox' }])
    })

    it('banUser POSTs /blacklist with { userId }', async () => {
        ;(service.post as any).mockResolvedValue({})

        await blacklistApi.banUser('u-2')

        expect(service.post).toHaveBeenCalledWith('/blacklist', { userId: 'u-2' })
    })

    it('removeFromBlacklist POSTs /blacklist/remove with { userId }', async () => {
        ;(service.post as any).mockResolvedValue({})

        await blacklistApi.removeFromBlacklist('u-3')

        expect(service.post).toHaveBeenCalledWith('/blacklist/remove', { userId: 'u-3' })
    })
})
