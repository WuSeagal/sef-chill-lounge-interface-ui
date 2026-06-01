/** Render-ready message shape consumed by the dashboard floating bubbles. */
export type DashboardMessage = {
    id: string
    userId: string
    nickname: string
    /** Raw avatar path (FloatingBubble resolves via resolveAvatarSrc). */
    avatarUrl: string
    avatarColor?: string | null
    avatarBorder?: boolean
    content: string
    /** Already asset-resolved (assetUrl applied) image OR sticker URL, if any. */
    imageUrl?: string
    timestamp: string
}
