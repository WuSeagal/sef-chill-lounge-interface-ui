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
        hasMore,
        loadInitial,
        loadMore,
        appendLive,
    }
}
