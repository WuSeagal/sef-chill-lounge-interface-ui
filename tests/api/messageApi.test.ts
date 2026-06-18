import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/request', () => {
    const get = vi.fn()
    const post = vi.fn()
    return { default: { get, post } }
})

import service from '@/utils/request'
import { fetchMessageHistory, deleteMessage } from '@/api/messageApi'

describe('messageApi', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('fetches message history with before, beforeId and limit params', async () => {
        ;(service.get as any).mockResolvedValue({ data: [] })

        await fetchMessageHistory({
            before: '2026-05-25T10:00:00',
            beforeId: 11,
            limit: 50,
        })

        expect(service.get).toHaveBeenCalledWith('/messages', {
            params: {
                before: '2026-05-25T10:00:00',
                beforeId: 11,
                limit: 50,
            },
        })
    })

    it('fetches latest history when only limit is provided', async () => {
        ;(service.get as any).mockResolvedValue({ data: [] })

        await fetchMessageHistory({ limit: 20 })

        expect(service.get).toHaveBeenCalledWith('/messages', {
            params: {
                limit: 20,
            },
        })
    })

    it('deleteMessage POSTs to /messages/remove with the messageId in the body', async () => {
        ;(service.post as any).mockResolvedValue({})

        await deleteMessage('msg-001')

        expect(service.post).toHaveBeenCalledWith('/messages/remove', { messageId: 'msg-001' })
    })
})
