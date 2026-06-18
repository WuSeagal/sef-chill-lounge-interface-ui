import request from '@/utils/request'
import type { FetchMessageHistoryParams, MessageResponse } from '@/types/message'

export async function fetchMessageHistory(params: FetchMessageHistoryParams): Promise<MessageResponse[]> {
    const response = await request.get('/messages', { params })
    return response.data
}

export async function deleteMessage(messageId: string): Promise<void> {
    await request.post('/messages/remove', { messageId })
}
