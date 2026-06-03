import { describe, it, expect } from 'vitest'
import { SOCIAL_PLATFORMS, PLATFORMS, PLATFORM_LIST, type SocialPlatform } from '@/constants/platforms'

describe('platforms registry', () => {
  it('恰好 14 個平台、含 PERSONAL/OTHER、不含 EMAIL', () => {
    expect(SOCIAL_PLATFORMS).toHaveLength(14)
    expect(SOCIAL_PLATFORMS).toContain('PERSONAL')
    expect(SOCIAL_PLATFORMS).toContain('OTHER')
    expect(SOCIAL_PLATFORMS as readonly string[]).not.toContain('EMAIL')
  })
  it('每個平台都有 label / icon / brandColor', () => {
    for (const p of SOCIAL_PLATFORMS) {
      const meta = PLATFORMS[p]
      expect(meta.value).toBe(p)
      expect(meta.label.length).toBeGreaterThan(0)
      expect(meta.icon.length).toBeGreaterThan(0)
      expect(meta.brandColor).toMatch(/^#/)
    }
  })
  it('品牌平台有 urlPattern、PERSONAL/OTHER 沒有', () => {
    expect(PLATFORMS.GITHUB.urlPattern).toBeInstanceOf(RegExp)
    expect(PLATFORMS.X.urlPattern).toBeInstanceOf(RegExp)
    expect(PLATFORMS.PERSONAL.urlPattern).toBeUndefined()
    expect(PLATFORMS.OTHER.urlPattern).toBeUndefined()
  })
  it('PLATFORM_LIST 順序與 SOCIAL_PLATFORMS 一致', () => {
    expect(PLATFORM_LIST.map(m => m.value)).toEqual([...SOCIAL_PLATFORMS])
  })
})
