import type { MessageResponse } from '@/types/message'

export type ChatEventType =
    | 'CHAT_MESSAGE'
    | 'PRESENCE_SNAPSHOT'
    | 'PROFILE_UPDATED'
    | 'PING'
    | 'PONG'
    | 'KICKED'
    | 'ERROR'
    | 'RATE_LIMITED'
    | 'MESSAGE_DELETED'
    | 'ANNOUNCEMENT'
    | 'TYPING'

export interface ChatEnvelope<T = unknown> {
    type: ChatEventType
    timestamp: number
    data: T
}

export interface PresenceSnapshotPayload {
    onlineUserIds: string[]
}

export type ChatMessageSendPayload =
    | { messageType: 'TEXT'; content: string; imageUrls: string[]; replyToMessageId?: string }
    | { messageType: 'STICKER'; stickerImageUrl: string; replyToMessageId?: string }

export type ChatMessageBroadcastPayload = MessageResponse

export interface ErrorPayload {
    code: string
    message: string
}

export interface ProfileUpdatedPayload {
    userId: string
    furName: string | null
    avatar: string | null
    avatarColor: string | null
    avatarBorder: boolean
}

export interface RateLimitedPayload {
    retryAfterMs: number
}

export interface MessageDeletedPayload {
    messageId: string
}

export interface AnnouncementPayload {
    text: string | null
}

export interface TypingPayload {
    userId: string
    furName: string | null
    avatar: string | null
    avatarColor: string | null
}
