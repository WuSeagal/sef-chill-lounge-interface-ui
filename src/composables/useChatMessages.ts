import { useChatHistory } from '@/composables/useChatHistory'
import { useChatWebSocket } from '@/composables/useChatWebSocket'
import type {
    ChatEnvelope,
    ChatMessageBroadcastPayload,
    ChatMessageSendPayload,
    ProfileUpdatedPayload,
} from '@/types/chat'
import type { Ref } from 'vue'

const WAIT_CONNECT_TIMEOUT_MS = 30_000

function waitForConnectTime(connectTimeRef: Ref<number | null>): Promise<number> {
    return new Promise((resolve, reject) => {
        if (connectTimeRef.value !== null) {
            resolve(connectTimeRef.value)
            return
        }
        const interval = setInterval(() => {
            if (connectTimeRef.value !== null) {
                clearInterval(interval)
                clearTimeout(timeout)
                resolve(connectTimeRef.value)
            }
        }, 5)
        const timeout = setTimeout(() => {
            clearInterval(interval)
            reject(new Error('waitForConnectTime timed out'))
        }, WAIT_CONNECT_TIMEOUT_MS)
    })
}

function toLocalIsoSeconds(ms: number): string {
    const d = new Date(ms)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function isValidChatMessage(data: unknown): data is ChatMessageBroadcastPayload {
    return !!data
        && typeof data === 'object'
        && typeof (data as ChatMessageBroadcastPayload).messageId === 'string'
}

function isValidProfileUpdate(data: unknown): data is ProfileUpdatedPayload {
    return !!data
        && typeof data === 'object'
        && typeof (data as ProfileUpdatedPayload).userId === 'string'
}

export function useChatMessages() {
    const history = useChatHistory()
    const socket = useChatWebSocket()

    let currentUnsub: (() => void) | null = null
    const pendingLive: ChatMessageBroadcastPayload[] = []
    let historyLoaded = false

    function subscribe() {
        // Replace any prior subscription so init / reconnect can be called
        // multiple times without accumulating handlers in the singleton.
        if (currentUnsub) {
            currentUnsub()
            currentUnsub = null
        }
        currentUnsub = socket.onMessage((envelope: ChatEnvelope) => {
            if (envelope.type === 'CHAT_MESSAGE') {
                if (!isValidChatMessage(envelope.data)) return
                const data = envelope.data
                if (!historyLoaded) {
                    // Buffer live messages that arrive between subscription
                    // and history-load completion; they'd otherwise be wiped
                    // by loadInitial's full messages.value replacement.
                    pendingLive.push(data)
                    return
                }
                const last = history.messages.value.at(-1)
                if (last && last.messageId === data.messageId) return
                history.appendLive(data)
                return
            }
            if (envelope.type === 'PROFILE_UPDATED') {
                if (!isValidProfileUpdate(envelope.data)) return
                const data = envelope.data
                history.messages.value = history.messages.value.map((m) =>
                    m.userId === data.userId
                        ? { ...m, furName: data.furName, avatar: data.avatar, avatarColor: data.avatarColor, avatarBorder: data.avatarBorder }
                        : m
                )
                return
            }
        })
    }

    function flushPendingLive() {
        const seen = new Set(history.messages.value.map((m) => m.messageId))
        for (const msg of pendingLive) {
            if (seen.has(msg.messageId)) continue
            history.appendLive(msg)
            seen.add(msg.messageId)
        }
        pendingLive.length = 0
    }

    async function init() {
        historyLoaded = false
        socket.connect()
        const startedAt = await waitForConnectTime(socket.connectTime)
        subscribe()
        await history.loadInitial({ before: toLocalIsoSeconds(startedAt) })
        flushPendingLive()
        historyLoaded = true
    }

    async function reconnect() {
        historyLoaded = false
        socket.connect()
        const startedAt = await waitForConnectTime(socket.connectTime)
        subscribe()
        await history.loadInitial({ before: toLocalIsoSeconds(startedAt) })
        flushPendingLive()
        historyLoaded = true
    }

    function dispose() {
        if (currentUnsub) {
            currentUnsub()
            currentUnsub = null
        }
        pendingLive.length = 0
        historyLoaded = false
    }

    function sendChatMessage(content: string, imageUrls: string[] = []) {
        const trimmed = content.trim()
        if (!trimmed && imageUrls.length === 0) return
        const payload: ChatMessageSendPayload = {
            messageType: 'TEXT',
            content: trimmed,
            imageUrls,
        }
        const envelope: ChatEnvelope<ChatMessageSendPayload> = {
            type: 'CHAT_MESSAGE',
            timestamp: Date.now(),
            data: payload,
        }
        socket.send(envelope)
    }

    function sendStickerMessage(stickerImageUrl: string) {
        const trimmed = stickerImageUrl.trim()
        if (!trimmed) return
        const payload: ChatMessageSendPayload = {
            messageType: 'STICKER',
            stickerImageUrl: trimmed,
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
        dispose,
        sendChatMessage,
        sendStickerMessage,
        kicked: socket.kicked,
        wsReconnecting: socket.wsReconnecting,
        wsFailed: socket.wsFailed,
    }
}
