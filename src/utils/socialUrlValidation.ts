import { PLATFORMS, type SocialPlatform } from '@/constants/platforms'

export type UrlValidationReason = 'invalid_url' | 'unsafe_url' | 'platform_mismatch' | 'too_long'
export type UrlValidationResult = { valid: true } | { valid: false; reason: UrlValidationReason }

/** 社群連結最大長度（與後端 SocialUrlValidator.MAX_LINKS_LENGTH 一致） */
export const MAX_SOCIAL_LINK_LENGTH = 200

const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/

function isIpLiteral(host: string): boolean {
  return IPV4.test(host) || (host.startsWith('[') && host.endsWith(']'))
}

function isUnsafeHost(host: string): boolean {
  const h = host.toLowerCase()
  if (h === 'localhost' || h.endsWith('.localhost')) return true
  if (isIpLiteral(h)) return true
  return false
}

export function validateSafeUrl(raw: string): UrlValidationResult {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return { valid: false, reason: 'invalid_url' }
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { valid: false, reason: 'unsafe_url' }
  }
  if (isUnsafeHost(url.hostname)) {
    return { valid: false, reason: 'unsafe_url' }
  }
  return { valid: true }
}

export function validateSocialUrl(platform: SocialPlatform, raw: string): UrlValidationResult {
  if (raw.length > MAX_SOCIAL_LINK_LENGTH) return { valid: false, reason: 'too_long' }
  const safe = validateSafeUrl(raw)
  if (!safe.valid) return safe

  const pattern = PLATFORMS[platform].urlPattern
  if (!pattern) return { valid: true }

  const host = new URL(raw).hostname
  return pattern.test(host) ? { valid: true } : { valid: false, reason: 'platform_mismatch' }
}
