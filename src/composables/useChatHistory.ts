import { ref } from 'vue'
import { fetchMessageHistory } from '@/api/messageApi'
import type { MessageResponse } from '@/types/message'

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

    function appendLive(message: MessageResponse) {
        messages.value = [...messages.value, message]
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
