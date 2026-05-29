export type MessageType = 'TEXT' | 'STICKER'

export type MessageResponse = {
    cursorId: number
    messageId: string
    userId: string
    messageType: MessageType
    furName: string | null
    avatar: string | null
    avatarColor: string | null
    avatarBorder: boolean
    content: string | null
    imageUrls: string[]
    stickerImageUrl: string | null
    createdDate: string
}

export type FetchMessageHistoryParams = {
    before?: string
    beforeId?: number
    limit?: number
}
