/**
 * Prepend the backend endpoint to a server-relative asset URL (chat image,
 * avatar, sticker, ...). Returns absolute/data/blob URLs unchanged.
 *
 * Why a helper: chat / avatar / sticker URLs are stored as paths like
 * `/image/...` so the value is portable across environments. The browser
 * resolves `<img src>` against the current origin (dev: 9045), so we have to
 * prepend the backend endpoint at render time.
 */
export function assetUrl(url: string | null | undefined): string {
    if (!url) return ''
    if (/^(https?:|data:|blob:)/i.test(url)) return url
    const base = import.meta.env.VITE_ENDPOINT ?? ''
    return base + url
}
