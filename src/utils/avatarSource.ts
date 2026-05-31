import defaultAvatar from '@/assets/avatars/default-avatar.png'
import { assetUrl } from '@/utils/assetUrl'

export function resolveAvatarSrc(url: string | null | undefined): string {
    if (!url) return defaultAvatar
    if (url.startsWith('/mock-images/')) return url
    return assetUrl(url)
}
