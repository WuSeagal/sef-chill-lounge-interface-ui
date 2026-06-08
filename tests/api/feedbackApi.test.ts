import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/request', () => {
    const post = vi.fn()
    return { default: { post } }
})

import service from '@/utils/request'
import { submitFeedback } from '@/api/feedbackApi'

describe('feedbackApi', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('posts feedback payload to /feedback with a 30s timeout', async () => {
        ;(service.post as any).mockResolvedValue({ data: null })

        await submitFeedback({ title: 't', content: 'c', username: 'u' })

        expect(service.post).toHaveBeenCalledWith(
            '/feedback',
            { title: 't', content: 'c', username: 'u' },
            { timeout: 30000 },
        )
    })
})
