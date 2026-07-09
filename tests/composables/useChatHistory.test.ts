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

    it('loadMore prepend 以工作集既有 messageId 去重，不重複插入已存在的訊息', async () => {
        const { messages, loadMore, appendLive } = useChatHistory()
        // hasMore 預設 true；直接用 appendLive 依時間順序建置工作集（沿用本檔既有慣例，不透過 loadInitial）。
        appendLive(makeMessage({ cursorId: 10, messageId: 'msg-010', createdDate: '2026-05-25T10:10:00' }))
        appendLive(makeMessage({ cursorId: 20, messageId: 'msg-020', createdDate: '2026-05-25T10:20:00' }))

        vi.mocked(messageApi.fetchMessageHistory).mockResolvedValueOnce([
            // msg-010 已存在於工作集中（例如與 live 到達的訊息重疊），msg-005 才是真正新的舊訊息。
            makeMessage({ cursorId: 10, messageId: 'msg-010', createdDate: '2026-05-25T10:10:00' }),
            makeMessage({ cursorId: 5, messageId: 'msg-005', createdDate: '2026-05-25T10:05:00' }),
        ])

        await loadMore()

        const ids = messages.value.map((m) => m.messageId)
        expect(ids.filter((id) => id === 'msg-010')).toHaveLength(1)
        expect(ids).toEqual(['msg-005', 'msg-010', 'msg-020'])
    })

    // ── 跳轉至被回覆訊息（載入到底）──────────────────────────────

    it('jumpToMessage 目標已在工作集時直接回報 found，不呼叫 loadMore', async () => {
        const { appendLive, jumpToMessage } = useChatHistory()
        appendLive(makeMessage({ cursorId: 100, messageId: 'target-msg', createdDate: '2026-05-25T10:00:00' }))

        const result = await jumpToMessage('target-msg', '2026-05-25T10:00:00')

        expect(result).toBe('found')
        expect(messageApi.fetchMessageHistory).not.toHaveBeenCalled()
    })

    it('jumpToMessage 目標不在工作集時反覆 loadMore 直到找到', async () => {
        const { messages, appendLive, jumpToMessage } = useChatHistory()
        appendLive(makeMessage({ cursorId: 100, messageId: 'msg-100', createdDate: '2026-05-25T10:00:00' }))

        let call = 0
        vi.mocked(messageApi.fetchMessageHistory).mockImplementation(async () => {
            call += 1
            if (call === 1) {
                // 第一批滿 50 筆才會讓 hasMore 保持 true，迴圈才會繼續進第二批。
                return Array.from({ length: 50 }, (_, i) =>
                    makeMessage({ cursorId: 50 - i, messageId: `msg-b1-${50 - i}`, createdDate: '2026-05-25T09:59:00' }))
            }
            return [makeMessage({ cursorId: 98, messageId: 'target-msg', createdDate: '2026-05-25T09:58:00' })]
        })

        const result = await jumpToMessage('target-msg', '2026-05-25T09:58:00')

        expect(result).toBe('found')
        expect(messages.value.map((m) => m.messageId)).toContain('target-msg')
        expect(messageApi.fetchMessageHistory).toHaveBeenCalledTimes(2)
    })

    it('jumpToMessage 超過上限 20 批仍找不到 → unresolvable，不無限迴圈', async () => {
        const { appendLive, jumpToMessage } = useChatHistory()
        appendLive(makeMessage({ cursorId: 1000, messageId: 'msg-1000', createdDate: '2026-05-25T10:00:00' }))

        let call = 0
        vi.mocked(messageApi.fetchMessageHistory).mockImplementation(async () => {
            call += 1
            // 每批固定回 50 筆維持 hasMore=true；createdDate 恆晚於 target，讓「提早依時間判定不存在」
            // 這條路徑永不觸發，藉此單獨驗證「達上限」這一條終止路徑。
            return Array.from({ length: 50 }, (_, i) =>
                makeMessage({
                    cursorId: 100000 - call * 50 - i,
                    messageId: `batch-${call}-${i}`,
                    createdDate: '2026-06-01T00:00:00',
                }))
        })

        const result = await jumpToMessage('does-not-exist', '2026-01-01T00:00:00')

        expect(result).toBe('unresolvable')
        expect(messageApi.fetchMessageHistory).toHaveBeenCalledTimes(20)
    })

    it('jumpToMessage 工作集最舊已早於目標建立時間仍未找到 → 提前判定 unresolvable', async () => {
        const { appendLive, jumpToMessage } = useChatHistory()
        appendLive(makeMessage({ cursorId: 100, messageId: 'msg-100', createdDate: '2026-05-25T10:00:00' }))

        vi.mocked(messageApi.fetchMessageHistory).mockResolvedValueOnce([
            makeMessage({ cursorId: 50, messageId: 'msg-050', createdDate: '2026-05-20T00:00:00' }),
        ])

        // target 建立時間（05-22）介於工作集原最舊（05-25）與新載入最舊（05-20）之間，
        // 代表往回掃過這個時間點卻找不到 → 判定不存在，只跑 1 批就提早停止。
        const result = await jumpToMessage('does-not-exist', '2026-05-22T00:00:00')

        expect(result).toBe('unresolvable')
        expect(messageApi.fetchMessageHistory).toHaveBeenCalledTimes(1)
    })

    it('jumpToMessage 已到底（hasMore=false）仍未找到 → unresolvable', async () => {
        const { appendLive, jumpToMessage } = useChatHistory()
        appendLive(makeMessage({ cursorId: 100, messageId: 'msg-100', createdDate: '2026-05-25T10:00:00' }))

        // 回傳筆數 < 50 → hasMore 翻 false；createdDate 刻意設晚於 target，避免提早以時間判定結束，
        // 單獨驗證「到底」這一條終止路徑。
        vi.mocked(messageApi.fetchMessageHistory).mockResolvedValueOnce([
            makeMessage({ cursorId: 50, messageId: 'msg-050', createdDate: '2026-06-01T00:00:00' }),
        ])

        const result = await jumpToMessage('does-not-exist', '2026-01-01T00:00:00')

        expect(result).toBe('unresolvable')
        expect(messageApi.fetchMessageHistory).toHaveBeenCalledTimes(1)
    })

    it('jump-load 期間 appendLive 不從頂端裁切，即使超過 MAX_MESSAGES(1000)', async () => {
        const { messages, appendLive, jumpToMessage } = useChatHistory()
        for (let i = 0; i < 1000; i++) {
            appendLive(makeMessage({ cursorId: i + 1, messageId: `msg-${i + 1}`, createdDate: '2026-05-25T10:00:00' }), true)
        }
        expect(messages.value).toHaveLength(1000)

        let resolveFetch: ((v: MessageResponse[]) => void) | null = null
        vi.mocked(messageApi.fetchMessageHistory).mockImplementation(
            () => new Promise((resolve) => { resolveFetch = resolve }))

        const jumpPromise = jumpToMessage('target-msg', '2026-05-25T09:00:00')
        // jump-load 進行中收到一則 live 新訊息（模擬貼底時他人剛好送出）；
        // 若未抑制裁切，這裡會把最舊的 msg-1 裁掉。
        appendLive(makeMessage({ cursorId: 2000, messageId: 'live-during-jump', createdDate: '2026-05-25T11:00:00' }), true)
        expect(messages.value).toHaveLength(1001)
        expect(messages.value[0].messageId).toBe('msg-1')

        resolveFetch!([makeMessage({ cursorId: 0, messageId: 'target-msg', createdDate: '2026-05-25T09:00:00' })])
        await jumpPromise

        expect(messages.value.some((m) => m.messageId === 'msg-1')).toBe(true)
    })

    it('同時對兩個不同目標 jumpToMessage 會序列化執行，不因共用 loading 狀態互相誤判為 unresolvable', async () => {
        const { appendLive, jumpToMessage } = useChatHistory()
        appendLive(makeMessage({ cursorId: 100, messageId: 'msg-100', createdDate: '2026-05-25T10:00:00' }))

        const pendingResolvers: Array<(v: MessageResponse[]) => void> = []
        vi.mocked(messageApi.fetchMessageHistory).mockImplementation(
            () => new Promise((resolve) => { pendingResolvers.push(resolve) }))

        // 幾乎同時對兩個不同、皆未在工作集中的目標發起跳轉。
        const jumpA = jumpToMessage('target-A', '2026-05-25T09:00:00')
        const jumpB = jumpToMessage('target-B', '2026-05-25T08:00:00')

        // 序列化：B 不應在 A 完成前就發出自己的 fetch（只會有 1 個 pending resolver）。
        await Promise.resolve()
        await Promise.resolve()
        expect(pendingResolvers).toHaveLength(1)

        // A 的這批回滿 50 筆（含 target-A），讓 hasMore 保持 true——否則 B 排隊輪到自己時，
        // 迴圈開頭的 !hasMore.value 檢查會直接短路回 unresolvable，連 B 自己的 loadMore 都不會呼叫到。
        const fullBatch = Array.from({ length: 49 }, (_, i) =>
            makeMessage({ cursorId: 50 + i, messageId: `filler-A-${i}`, createdDate: '2026-05-25T08:30:00' }))
        fullBatch.push(makeMessage({ cursorId: 99, messageId: 'target-A', createdDate: '2026-05-25T09:00:00' }))
        pendingResolvers[0](fullBatch)
        expect(await jumpA).toBe('found')

        // A 完成後，B 才輪到自己發出 fetch。
        pendingResolvers[1]([makeMessage({ cursorId: 98, messageId: 'target-B', createdDate: '2026-05-25T08:00:00' })])
        expect(await jumpB).toBe('found')

        expect(messageApi.fetchMessageHistory).toHaveBeenCalledTimes(2)
    })
})
