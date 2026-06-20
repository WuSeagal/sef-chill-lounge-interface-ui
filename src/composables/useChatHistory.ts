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
            messages.value = [...sortAscending(result), ...messages.value]
            hasMore.value = result.length === 50
        } finally {
            loading.value = false
        }
    }

    // isAtBottom 預設 true 以沿用舊呼叫端行為；只有「貼底（不在讀歷史）」時才裁頭，
    // 永不抽走使用者正在看的歷史。裁頭後恢復 hasMore，確保更舊訊息仍可 loadMore 重載。
    function appendLive(message: MessageResponse, isAtBottom = true) {
        const next = [...messages.value, message]
        if (isAtBottom && next.length > MAX_MESSAGES) {
            messages.value = next.slice(next.length - MAX_MESSAGES)
            hasMore.value = true
            return
        }
        messages.value = next
    }

    return {
        messages,
        loading,
        initialized,
        hasMore,
        loadInitial,
        loadMore,
        appendLive,
    }
}
