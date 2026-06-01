import type { ChatMessageBroadcastPayload } from '@/types/chat'
import type { DashboardMessage } from '@/types/dashboard'
import { assetUrl } from '@/utils/assetUrl'

/**
 * Map a live/replayed chat broadcast payload to the render-ready DashboardMessage.
 * Image and sticker URLs are asset-resolved here because FloatingBubble renders
 * `imageUrl` raw (avatar is resolved by the component via resolveAvatarSrc).
 */
export function toDashboardMessage(p: ChatMessageBroadcastPayload): DashboardMessage {
    const rawImage = p.messageType === 'STICKER'
        ? p.stickerImageUrl
        : (p.imageUrls.length > 0 ? p.imageUrls[0] : null)
    return {
        id: p.messageId,
        userId: p.userId,
        nickname: p.furName ?? '',
        avatarUrl: p.avatar ?? '',
        avatarColor: p.avatarColor,
        avatarBorder: p.avatarBorder,
        content: p.messageType === 'TEXT' ? (p.content ?? '') : '',
        imageUrl: rawImage ? assetUrl(rawImage) : undefined,
        timestamp: p.createdDate,
    }
}
