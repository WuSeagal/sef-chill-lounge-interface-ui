import { useChatHistory } from '@/composables/useChatHistory'
import { useChatWebSocket } from '@/composables/useChatWebSocket'
import type { ChatEnvelope, ChatMessageBroadcastPayload, ChatMessageSendPayload } from '@/types/chat'
import type { Ref } from 'vue'

function waitForConnectTime(connectTimeRef: Ref<number | null>): Promise<number> {
    return new Promise((resolve) => {
        if (connectTimeRef.value !== null) {
            resolve(connectTimeRef.value)
            return
        }
        const interval = setInterval(() => {
            if (connectTimeRef.value !== null) {
                clearInterval(interval)
                resolve(connectTimeRef.value)
            }
        }, 5)
    })
}

export function useChatMessages() {
    const history = useChatHistory()
    const socket = useChatWebSocket()

    async function init() {
        socket.connect()
        const startedAt = await waitForConnectTime(socket.connectTime)

        socket.onMessage((envelope: ChatEnvelope) => {
            if (envelope.type !== 'CHAT_MESSAGE') return
            const data = envelope.data as ChatMessageBroadcastPayload
            const last = history.messages.value.at(-1)
            if (last && last.messageId === data.messageId) {
                return
            }
            history.appendLive(data)
        })

        await history.loadInitial({ before: startedAt })
    }

    function sendChatMessage(content: string) {
        const trimmed = content.trim()
        if (!trimmed) return
        const payload: ChatMessageSendPayload = {
            messageType: 'TEXT',
            content: trimmed,
            imageUrls: [],
        }
        const envelope: ChatEnvelope<ChatMessageSendPayload> = {
            type: 'CHAT_MESSAGE',
            timestamp: Date.now(),
            data: payload,
        }
        socket.send(envelope)
    }

    return {
        messages: history.messages,
        loading: history.loading,
        hasMore: history.hasMore,
        loadMore: history.loadMore,
        init,
        sendChatMessage,
        kicked: socket.kicked,
        wsReconnecting: socket.wsReconnecting,
        wsFailed: socket.wsFailed,
    }
}
