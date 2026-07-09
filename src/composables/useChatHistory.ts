import { ref } from 'vue'
import { fetchMessageHistory } from '@/api/messageApi'
import type { MessageResponse } from '@/types/message'

// 前端訊息工作集上限（D7）：數小時 long-run 的 /chat 若無限 appendLive 會讓 DOM
// 無限膨脹。貼底（不在讀歷史）時，超過此上限即從最舊端裁切，並恢復 hasMore 讓更舊
// 訊息仍可由 loadMore 自伺服器（完整持久化）重載。初始載入則數與往上捲 lazy load 不受影響。
const MAX_MESSAGES = 1000

function sortAscending(messages: MessageResponse[]) {
    return [...messages].sort((a, b) => {
        if (a.createdDate === b.createdDate) {
            return a.cursorId - b.cursorId
        }
        return a.createdDate.localeCompare(b.createdDate)
    })
}

export function useChatHistory() {
    const messages = ref<MessageResponse[]>([])
    const loading = ref(false)
    const hasMore = ref(true)
    // 「首次載入是否完成過」的單向旗標：初始 false，首次 loadInitial 結束（成功或失敗）
    // 後翻 true。與 loading 不同——loading 會在 loadMore（捲動載入歷史）反覆切換；
    // initialized 只關心首次載入，供畫面區分「載入中」與「載入完成但無訊息」。
    const initialized = ref(false)

    async function loadInitial(options: { before?: string } = {}) {
        loading.value = true
        try {
            const params: { before?: string; limit: number } = { limit: 50 }
            if (options.before) {
                params.before = options.before
            }
            const result = await fetchMessageHistory(params)
            messages.value = sortAscending(result)
            hasMore.value = result.length === 50
        } finally {
            loading.value = false
            initialized.value = true
        }
    }

    async function loadMore() {
        if (!messages.value.length || loading.value || !hasMore.value) {
            return
        }

        loading.value = true
        try {
            const oldest = messages.value[0]
            const result = await fetchMessageHistory({
                before: oldest.createdDate,
                beforeId: oldest.cursorId,
                limit: 50,
            })
            // 以工作集既有 messageId 集合去重：jump-load 會連續大量 prepend，避免與 live 到達的
            // 訊息重疊時插入重複列。hasMore 判斷仍以「伺服器實際回幾筆」為準，不受去重後筆數影響。
            const existingIds = new Set(messages.value.map((m) => m.messageId))
            const fresh = sortAscending(result).filter((m) => !existingIds.has(m.messageId))
            messages.value = [...fresh, ...messages.value]
            hasMore.value = result.length === 50
        } finally {
            loading.value = false
        }
    }

    // jump-load（跳轉至被回覆訊息）進行中時抑制頂端裁切，避免裁掉剛載入、使用者正要跳去看的
    // 舊訊息；期間若有 live 新訊息抵達仍正常附加，只是暫時不裁頭。用計數器而非布林值：只要
    // 還有任何一個 jump-load 在「排隊等待」或「執行中」，就必須持續抑制（見 jumpToMessage
    // 的序列化佇列——排隊期間也不可裁切，否則佇列中的目標可能被裁掉）。
    let jumpingCount = 0

    // isAtBottom 預設 true 以沿用舊呼叫端行為；只有「貼底（不在讀歷史）」時才裁頭，
    // 永不抽走使用者正在看的歷史。裁頭後恢復 hasMore，確保更舊訊息仍可 loadMore 重載。
    function appendLive(message: MessageResponse, isAtBottom = true) {
        if (messages.value.some((m) => m.messageId === message.messageId)) return
        const next = [...messages.value, message]
        if (jumpingCount === 0 && isAtBottom && next.length > MAX_MESSAGES) {
            messages.value = next.slice(next.length - MAX_MESSAGES)
            hasMore.value = true
            return
        }
        messages.value = next
    }

    const MAX_JUMP_BATCHES = 20

    // 所有 jump-load 共用同一份 loading 狀態；若兩個不同目標的跳轉同時進行，第二個的
    // loadMore 呼叫會因 loading 為 true 而一路 no-op、瞬間耗盡批次上限而誤判為 unresolvable。
    // 用 promise chain 序列化：同一時間只有一個 jump-load 真正在跑，其餘排隊依序執行。
    let jumpQueue: Promise<unknown> = Promise.resolve()

    // 跳轉至被回覆訊息：目標不在工作集時序列化反覆 loadMore，直到找到、或觸發任一失敗條件
    // （已到底 / 超過批次上限 / 已載入早於目標建立時間仍未見到——判定不存在）。
    // 回報結果讓 UI 決定 scroll+highlight 或標記示意塊為「無法載入訊息」，不使用 toast。
    async function jumpToMessage(targetMessageId: string, targetCreatedDate: string): Promise<'found' | 'unresolvable'> {
        if (messages.value.some((m) => m.messageId === targetMessageId)) {
            return 'found'
        }

        // jumpingCount 在任何 await 之前同步 +1：即使接下來要排隊等待前一個 jump-load，
        // 裁切抑制也必須從這一刻就生效（呼叫端可能緊接著同步呼叫 appendLive）。
        jumpingCount++
        const previous = jumpQueue
        let release: () => void = () => {}
        jumpQueue = new Promise<void>((resolve) => { release = resolve })
        try {
            // 只有偵測到「當下已有其他 jump-load 在跑」（jumpingCount > 1）才需要排隊等待；
            // 唯一/第一個呼叫直接同步進入迴圈，不引入多餘的 await（維持原本一次 tick 內即可
            // 觸及第一次 loadMore 的行為，避免不必要地延遲）。
            if (jumpingCount > 1) {
                // previous 只會由 release() 觸發 resolve，不會 reject，故不需要 .catch()
                // 包一層——多包一層會多一次 microtask hop，讓下一個排隊者的 loadMore 延後
                // 一個 tick 才觸發，時序上會與呼叫端「await 前一個結果後緊接著檢查」的預期不符。
                await previous
                // 排隊等待期間，目標可能已被前一個 jump-load 順帶載入。
                if (messages.value.some((m) => m.messageId === targetMessageId)) {
                    return 'found'
                }
            }

            for (let batch = 0; batch < MAX_JUMP_BATCHES; batch++) {
                if (!hasMore.value) return 'unresolvable'
                await loadMore()
                if (messages.value.some((m) => m.messageId === targetMessageId)) {
                    return 'found'
                }
                const oldest = messages.value[0]
                if (oldest && oldest.createdDate < targetCreatedDate) {
                    return 'unresolvable'
                }
            }
            return 'unresolvable'
        } finally {
            release()
            jumpingCount--
        }
    }

    return {
        messages,
        loading,
        initialized,
        hasMore,
        loadInitial,
        loadMore,
        appendLive,
        jumpToMessage,
    }
}
