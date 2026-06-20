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

    it('initialized 初始為 false，loadInitial 完成後為 true', async () => {
        vi.mocked(messageApi.fetchMessageHistory).mockResolvedValueOnce([])

        const { initialized, loadInitial } = useChatHistory()
        expect(initialized.value).toBe(false)

        await loadInitial()

        expect(initialized.value).toBe(true)
    })

    it('loadInitial 失敗時 initialized 仍翻為 true（不會永遠卡在載入中）', async () => {
        vi.mocked(messageApi.fetchMessageHistory).mockRejectedValueOnce(new Error('boom'))

        const { initialized, loadInitial } = useChatHistory()

        await expect(loadInitial()).rejects.toThrow('boom')
        expect(initialized.value).toBe(true)
    })

    it('appendLive pushes message to tail', () => {
        const { messages, appendLive } = useChatHistory()

        appendLive(makeMessage({ cursorId: 11, messageId: 'msg-001', createdDate: '2026-05-25T10:00:00' }))
        appendLive(makeMessage({ cursorId: 12, messageId: 'msg-002', createdDate: '2026-05-25T10:01:00' }))

        expect(messages.value.map((item) => item.messageId)).toEqual(['msg-001', 'msg-002'])
    })

    // ── D7：訊息工作集上限與貼底裁頭 ──────────────────────────────

    function fillMessages(history: ReturnType<typeof useChatHistory>, count: number, isAtBottom = true) {
        for (let i = 0; i < count; i++) {
            history.appendLive(
                makeMessage({
                    cursorId: i + 1,
                    messageId: `msg-${String(i + 1).padStart(5, '0')}`,
                    createdDate: '2026-05-25T10:00:00',
                }),
                isAtBottom,
            )
        }
    }

    it('貼底時 appendLive 超過 MAX_MESSAGES(1000) 從開頭裁切至 1000 並設 hasMore=true', () => {
        const history = useChatHistory()
        history.hasMore.value = false // 證明裁頭會把 hasMore 翻回 true

        fillMessages(history, 1001, true)

        expect(history.messages.value).toHaveLength(1000)
        // 最舊一則（msg-00001）被裁掉，剩餘從 msg-00002 開始
        expect(history.messages.value[0].messageId).toBe('msg-00002')
        expect(history.messages.value.at(-1)?.messageId).toBe('msg-01001')
        expect(history.hasMore.value).toBe(true)
    })

    it('恰好等於 MAX_MESSAGES(1000) 時不裁切', () => {
        const history = useChatHistory()
        history.hasMore.value = false

        fillMessages(history, 1000, true)

        expect(history.messages.value).toHaveLength(1000)
        expect(history.messages.value[0].messageId).toBe('msg-00001')
        // 未超過上限，hasMore 不被裁頭邏輯改動
        expect(history.hasMore.value).toBe(false)
    })

    it('非貼底時不裁切（不抽走使用者正在看的歷史）', () => {
        const history = useChatHistory()
        history.hasMore.value = false

        fillMessages(history, 1001, false)

        expect(history.messages.value).toHaveLength(1001)
        expect(history.messages.value[0].messageId).toBe('msg-00001')
        expect(history.hasMore.value).toBe(false)
    })

    it('appendLive 預設視為貼底（不傳 isAtBottom 時沿用舊行為並裁頭）', () => {
        const history = useChatHistory()

        for (let i = 0; i < 1001; i++) {
            history.appendLive(
                makeMessage({
                    cursorId: i + 1,
                    messageId: `msg-${String(i + 1).padStart(5, '0')}`,
                    createdDate: '2026-05-25T10:00:00',
                }),
            )
        }

        expect(history.messages.value).toHaveLength(1000)
        expect(history.hasMore.value).toBe(true)
    })

    it('裁頭後 loadMore 以當前最舊訊息為游標向伺服器載入更舊訊息', async () => {
        const history = useChatHistory()
        fillMessages(history, 1001, true) // 觸發裁頭，最舊變 msg-00002，hasMore=true

        vi.mocked(messageApi.fetchMessageHistory).mockResolvedValueOnce([
            makeMessage({ cursorId: 0, messageId: 'older-1', createdDate: '2026-05-25T09:00:00' }),
        ])

        await history.loadMore()

        const oldest = { messageId: 'msg-00002', cursorId: 2, createdDate: '2026-05-25T10:00:00' }
        expect(messageApi.fetchMessageHistory).toHaveBeenCalledWith({
            before: oldest.createdDate,
            beforeId: oldest.cursorId,
            limit: 50,
        })
        expect(history.messages.value[0].messageId).toBe('older-1')
    })

    it('loadMore 不觸發裁切（即使結果使長度超過上限亦然）', async () => {
        const history = useChatHistory()
        fillMessages(history, 1000, true) // 剛好 1000，未裁

        // loadMore 預讀 50 筆更舊 → 總長 1050，但 loadMore 不應裁頭
        vi.mocked(messageApi.fetchMessageHistory).mockResolvedValueOnce(
            Array.from({ length: 50 }, (_, i) =>
                makeMessage({ cursorId: -i, messageId: `older-${i}`, createdDate: '2026-05-25T09:00:00' }),
            ),
        )

        await history.loadMore()

        expect(history.messages.value).toHaveLength(1050)
    })
})
