// 部署後，保留的舊分頁持有舊 chunk hash；新版上線後舊檔不存在，nginx SPA fallback
// 回傳 index.html（text/html）→ lazy import（route 或 component）失敗 → 路由卡住、畫面一直轉圈。
// 偵測這類 dynamic import 失敗後強制 reload 抓新版；以 sessionStorage 時間戳 once-guard 防無限 reload。

export const STALE_CHUNK_RELOAD_KEY = 'staleChunkReloadAt'
const RELOAD_GUARD_MS = 10_000

const DYNAMIC_IMPORT_ERROR_RE = /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|failed to load module script/i

/** 判斷錯誤是否為「動態載入模組失敗」（stale chunk 典型訊息，跨 Chromium/Firefox/Safari 措辭）。 */
export function isDynamicImportError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : typeof error === 'string' ? error : ''
    return DYNAMIC_IMPORT_ERROR_RE.test(message)
}

/**
 * 因 stale chunk 強制 reload，並以 sessionStorage 時間戳防止無限 reload loop。
 * @returns 是否真的觸發了 reload（被 guard 擋下時為 false）。
 * reload / now 可注入以利測試。
 */
export function reloadForStaleChunk(
    reload: () => void = () => window.location.reload(),
    now: number = Date.now(),
): boolean {
    const last = Number(sessionStorage.getItem(STALE_CHUNK_RELOAD_KEY) || '0')
    if (now - last < RELOAD_GUARD_MS) return false
    sessionStorage.setItem(STALE_CHUNK_RELOAD_KEY, String(now))
    reload()
    return true
}
