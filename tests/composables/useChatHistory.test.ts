import { describe, expect, it, vi, beforeEach } from 'vitest'
import * as messageApi from '@/api/messageApi'
import { useChatHistory } from '@/composables/useChatHistory'
import type { MessageResponse } from '@/types/message'

vi.mock('@/api/messageApi')

function makeMessage(overrides: Partial<MessageResponse>): MessageResponse {
    return {
        cursorId: 1,
        messageId: 'msg-001',
        userId: 'u-1',
        messageType: 'TEXT',
        furName: 'Fox',
        avatar: null,
        content: 'hello',
        imageUrls: [],
        stickerImageUrl: null,
        createdDate: '2026-05-25T10:00:00',
        ...overrides,
    }
}

describe('useChatHistory', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('loads initial history and normalizes into ascending order', async () => {
        vi.mocked(messageApi.fetchMessageHistory).mockResolvedValueOnce([
            makeMessage({ cursorId: 12, messageId: 'msg-002', createdDate: '2026-05-25T10:01:00', content: 'later' }),
            makeMessage({ cursorId: 11, messageId: 'msg-001', createdDate: '2026-05-25T10:00:00', content: 'earlier' }),
        ])

        const { messages, loadInitial } = useChatHistory()
        await loadInitial()

        expect(messages.value.map((item) => item.messageId)).toEqual(['msg-001', 'msg-002'])
    })

    it('prepends older history and keeps ascending order', async () => {
        const initialPage = Array.from({ length: 50 }, (_, index) =>
            makeMessage({
                cursorId: 100 - index,
                messageId: `msg-${String(100 - index).padStart(3, '0')}`,
                createdDate: `2026-05-25T10:${String(index).padStart(2, '0')}:00`,
                content: `message-${index}`,
            })
        ).reverse()

        vi.mocked(messageApi.fetchMessageHistory)
            .mockResolvedValueOnce(initialPage)
            .mockResolvedValueOnce([
                makeMessage({ cursorId: 11, messageId: 'msg-001', createdDate: '2026-05-25T10:00:00', content: 'oldest' }),
            ])

        const { messages, loadInitial, loadMore } = useChatHistory()
        await loadInitial()
        await loadMore()

        expect(messageApi.fetchMessageHistory).toHaveBeenLastCalledWith({
            before: '2026-05-25T10:00:00',
            beforeId: 100,
            limit: 50,
        })
        expect(messages.value[0].messageId).toBe('msg-001')
        expect(messages.value.at(-1)?.messageId).toBe('msg-051')
    })

    it('sets hasMore false when page size is smaller than 50', async () => {
        vi.mocked(messageApi.fetchMessageHistory).mockResolvedValueOnce([
            makeMessage({ cursorId: 11, messageId: 'msg-001' }),
        ])

        const { hasMore, loadInitial } = useChatHistory()
        await loadInitial()

        expect(hasMore.value).toBe(false)
    })

    it('passes before cursor to fetchMessageHistory when provided', async () => {
        vi.mocked(messageApi.fetchMessageHistory).mockResolvedValueOnce([])

        const { loadInitial } = useChatHistory()
        await loadInitial({ before: '2026-05-26T10:00:00' })

        expect(messageApi.fetchMessageHistory).toHaveBeenCalledWith({
            before: '2026-05-26T10:00:00',
            limit: 50,
        })
    })

    it('appendLive pushes message to tail', () => {
        const { messages, appendLive } = useChatHistory()

        appendLive(makeMessage({ cursorId: 11, messageId: 'msg-001', createdDate: '2026-05-25T10:00:00' }))
        appendLive(makeMessage({ cursorId: 12, messageId: 'msg-002', createdDate: '2026-05-25T10:01:00' }))

        expect(messages.value.map((item) => item.messageId)).toEqual(['msg-001', 'msg-002'])
    })
})
