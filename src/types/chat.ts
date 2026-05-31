import type { MessageResponse } from '@/types/message'

export type ChatEventType =
    | 'CHAT_MESSAGE'
    | 'PRESENCE_SNAPSHOT'
    | 'PROFILE_UPDATED'
    | 'PING'
    | 'PONG'
    | 'KICKED'
    | 'ERROR'

export interface ChatEnvelope<T = unknown> {
    type: ChatEventType
    timestamp: number
    data: T
}

export interface PresenceSnapshotPayload {
    onlineUserIds: string[]
}

export type ChatMessageSendPayload =
    | { messageType: 'TEXT'; content: string; imageUrls: string[] }
    | { messageType: 'STICKER'; stickerImageUrl: string }

export type ChatMessageBroadcastPayload = MessageResponse

export interface ErrorPayload {
    code: string
    message: string
}

export interface ProfileUpdatedPayload {
    userId: string
    furName: string | null
    avatar: string | null
}
