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
    replyToMessageId: string | null
    replyToUserId: string | null
    replyToFurName: string | null
    replyToContentSnippet: string | null
    replyToCreatedDate: string | null
}

export type FetchMessageHistoryParams = {
    before?: string
    beforeId?: number
    limit?: number
}
