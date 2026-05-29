import type { CSSProperties } from 'vue'

export type AvatarRingSize = 'sm' | 'lg'

/**
 * B2「內緣暗邊」色環。avatarBorder 關閉或無顏色時回傳空 style（不渲染 ring）。
 * 不可在 color 為 null 時 emit 'null' 字串（legacy/seed row 可能無 avatarColor）。
 */
export function buildAvatarRingStyle(
  avatarColor: string | null | undefined,
  avatarBorder: boolean,
  size: AvatarRingSize,
): CSSProperties {
  if (!avatarBorder || !avatarColor) return {}
  if (size === 'lg') {
    return { boxShadow: `inset 0 0 0 1.5px rgba(0,0,0,0.2), 0 0 0 4px ${avatarColor}` }
  }
  return { boxShadow: `inset 0 0 0 1px rgba(0,0,0,0.2), 0 0 0 3px ${avatarColor}` }
}
