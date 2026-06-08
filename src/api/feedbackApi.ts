import request from '@/utils/request'
import type { FeedbackRequest } from '@/types/feedback'

export async function submitFeedback(payload: FeedbackRequest): Promise<void> {
    await request.post('/feedback', payload, { timeout: 30000 })
}
