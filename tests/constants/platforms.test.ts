import { describe, it, expect } from 'vitest'
import { SOCIAL_PLATFORMS, PLATFORMS, PLATFORM_LIST, type SocialPlatform } from '@/constants/platforms'

describe('urlPattern host matching', () => {
  const host = (p: SocialPlatform, h: string) => PLATFORMS[p].urlPattern!.test(h)

  it('FACEBOOK 接受主網域與 m./www./fb.com、拒絕子網域偽裝', () => {
    expect(host('FACEBOOK', 'facebook.com')).toBe(true)
    expect(host('FACEBOOK', 'www.facebook.com')).toBe(true)
    expect(host('FACEBOOK', 'm.facebook.com')).toBe(true)
    expect(host('FACEBOOK', 'fb.com')).toBe(true)
    expect(host('FACEBOOK', 'evil.facebook.com')).toBe(false)
    expect(host('FACEBOOK', 'notfacebook.com')).toBe(false)
  })
  it('STEAM 接受 www 與非 www', () => {
    expect(host('STEAM', 'steamcommunity.com')).toBe(true)
    expect(host('STEAM', 'www.steamcommunity.com')).toBe(true)
  })
  it('CAKERESUME 接受 cake.me 與 cakeresume.com', () => {
    expect(host('CAKERESUME', 'cake.me')).toBe(true)
    expect(host('CAKERESUME', 'www.cakeresume.com')).toBe(true)
  })
  it('THREADS 接受 .net 與 .com', () => {
    expect(host('THREADS', 'threads.net')).toBe(true)
    expect(host('THREADS', 'www.threads.com')).toBe(true)
  })
  it('GITHUB 拒絕非 github 網域', () => {
    expect(host('GITHUB', 'github.com')).toBe(true)
    expect(host('GITHUB', 'x.com')).toBe(false)
  })
})

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
