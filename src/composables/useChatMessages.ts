import { useChatHistory } from '@/composables/useChatHistory'
import { useChatWebSocket } from '@/composables/useChatWebSocket'
import type {
    ChatEnvelope,
    ChatMessageBroadcastPayload,
    ChatMessageSendPayload,
    ProfileUpdatedPayload,
} from '@/types/chat'
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

function toLocalIsoSeconds(ms: number): string {
    const d = new Date(ms)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export function useChatMessages() {
    const history = useChatHistory()
    const socket = useChatWebSocket()

    async function init() {
        socket.connect()
        const startedAt = await waitForConnectTime(socket.connectTime)

        socket.onMessage((envelope: ChatEnvelope) => {
            if (envelope.type === 'CHAT_MESSAGE') {
                const data = envelope.data as ChatMessageBroadcastPayload
                const last = history.messages.value.at(-1)
                if (last && last.messageId === data.messageId) {
                    return
                }
                history.appendLive(data)
                return
            }
            if (envelope.type === 'PROFILE_UPDATED') {
                const data = envelope.data as ProfileUpdatedPayload
                history.messages.value = history.messages.value.map((m) =>
                    m.userId === data.userId
                        ? { ...m, furName: data.furName, avatar: data.avatar }
                        : m
                )
                return
            }
        })

        await history.loadInitial({ before: toLocalIsoSeconds(startedAt) })
    }

    async function reconnect() {
        socket.connect()
        const startedAt = await waitForConnectTime(socket.connectTime)
        await history.loadInitial({ before: toLocalIsoSeconds(startedAt) })
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
        reconnect,
        sendChatMessage,
        kicked: socket.kicked,
        wsReconnecting: socket.wsReconnecting,
        wsFailed: socket.wsFailed,
    }
}
