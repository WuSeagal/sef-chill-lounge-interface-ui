import { PLATFORMS, type SocialPlatform, type PlatformMeta } from '@/constants/platforms'

const SLOT = '{{}}'

/** 安全取得平台 metadata（未知平台回 undefined，供 guard） */
function metaOf(platform: string): PlatformMeta | undefined {
  return (PLATFORMS as Record<string, PlatformMeta>)[platform]
}

/** Discord 舊網域 → 正規化為現行網域 */
function normalizeKnownAlias(url: string): string {
  return url.replace(/discordapp\.com/gi, 'discord.com')
}

/** 拆模板：槽位之前 / 之後（本專案模板槽位皆在尾端，suffix 多為空字串） */
function splitTemplate(template: string): { prefix: string; suffix: string } {
  const i = template.indexOf(SLOT)
  return { prefix: template.slice(0, i), suffix: template.slice(i + SLOT.length) }
}

/** 取 host（去 www.、小寫）+ path（含 query） */
function hostPath(raw: string): { host: string; path: string } | null {
  try {
    const u = new URL(raw)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    return { host: u.hostname.toLowerCase().replace(/^www\./, ''), path: u.pathname + u.search }
  } catch {
    return null
  }
}

/**
 * 組社群連結完整 URL：template 模式套模板（槽位 percent-encode）；free 模式原樣回傳。
 */
export function composeSocialUrl(platform: string, raw: string): string {
  const meta = metaOf(platform)
  const value = raw.trim()
  if (!meta || meta.inputMode === 'free' || !meta.urlTemplate) return value
  // 使用者習慣自打開頭 @（Threads/X），去除一個避免與模板的 @ 重複或被編碼成 %40
  const slot = value.replace(/^@/, '')
  // 空槽 → 空字串，沿用上層既有「空值未填」處理（避免一選平台就把裸前綴當成已填）
  if (slot === '') return ''
  return meta.urlTemplate.replace(SLOT, encodeURIComponent(slot))
}

/**
 * 從完整 URL 反解槽位值（供編輯回填與顯示）。
 * 容忍 www. 有無、Discord 舊網域；前綴不符或非 template 模式回 null。回傳值已 decode。
 */
export function parseSocialHandle(platform: string, rawUrl: string): string | null {
  const meta = metaOf(platform)
  if (!meta || meta.inputMode !== 'template' || !meta.urlTemplate) return null

  const { prefix, suffix } = splitTemplate(meta.urlTemplate)
  const target = hostPath(normalizeKnownAlias(rawUrl.trim()))
  const tmpl = hostPath(prefix)
  if (!target || !tmpl) return null
  if (target.host !== tmpl.host) return null
  if (!target.path.startsWith(tmpl.path)) return null

  let mid = target.path.slice(tmpl.path.length)
  if (suffix) {
    if (!mid.endsWith(suffix)) return null
    mid = mid.slice(0, mid.length - suffix.length)
  }
  // 帳號/槽位為單一 path segment 或 query 值：切掉尾斜線、後續路徑、額外 query 參數
  mid = mid.split(/[/?#&]/)[0]
  if (mid === '') return null

  try {
    return decodeURIComponent(mid)
  } catch {
    return mid
  }
}

/**
 * 顯示文字：handle 模式回 `@帳號`（反解失敗 fallback 完整 URL）；fullUrl 模式回完整 URL。
 */
export function formatSocialDisplay(platform: string, url: string): string {
  const meta = metaOf(platform)
  if (meta?.displayMode === 'handle') {
    const handle = parseSocialHandle(platform, url)
    return handle !== null ? `@${handle}` : url
  }
  return url
}
