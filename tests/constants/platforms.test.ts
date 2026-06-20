import { describe, it, expect } from 'vitest'
import { SOCIAL_PLATFORMS, PLATFORMS, PLATFORM_LIST, resolvePlatformMeta, type SocialPlatform } from '@/constants/platforms'

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
  it('恰好 16 個平台、含 FACEBOOK_PAGE/DISCORD_SERVER/PERSONAL/OTHER、不含 EMAIL', () => {
    expect(SOCIAL_PLATFORMS).toHaveLength(16)
    expect(SOCIAL_PLATFORMS).toContain('FACEBOOK_PAGE')
    expect(SOCIAL_PLATFORMS).toContain('DISCORD_SERVER')
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

describe('platform input/display metadata', () => {
  it('FACEBOOK_PAGE / DISCORD_SERVER 沿用本尊 icon 與品牌色', () => {
    expect(PLATFORMS.FACEBOOK_PAGE.icon).toBe(PLATFORMS.FACEBOOK.icon)
    expect(PLATFORMS.FACEBOOK_PAGE.brandColor).toBe(PLATFORMS.FACEBOOK.brandColor)
    expect(PLATFORMS.DISCORD_SERVER.icon).toBe(PLATFORMS.DISCORD.icon)
    expect(PLATFORMS.DISCORD_SERVER.brandColor).toBe(PLATFORMS.DISCORD.brandColor)
  })

  it('模式 A（template + handle）平台帶正確模板與顯示模式', () => {
    expect(PLATFORMS.INSTAGRAM.inputMode).toBe('template')
    expect(PLATFORMS.INSTAGRAM.displayMode).toBe('handle')
    expect(PLATFORMS.INSTAGRAM.urlTemplate).toBe('https://www.instagram.com/{{}}')
    expect(PLATFORMS.INSTAGRAM.fillPlaceholder).toBe('username')

    expect(PLATFORMS.LINKEDIN.urlTemplate).toBe('https://www.linkedin.com/in/{{}}')
    expect(PLATFORMS.LINKEDIN.fillPlaceholder).toBe('name')
    expect(PLATFORMS.THREADS.urlTemplate).toBe('https://www.threads.com/@{{}}')
    expect(PLATFORMS.BLUESKY.urlTemplate).toBe('https://bsky.app/profile/{{}}')
    expect(PLATFORMS.CAKERESUME.urlTemplate).toBe('https://www.cake.me/me/{{}}')
    expect(PLATFORMS.FACEBOOK.displayMode).toBe('handle')
    expect(PLATFORMS.FACEBOOK.urlTemplate).toBe('https://www.facebook.com/{{}}')
  })

  it('模式 B（template + fullUrl）平台帶正確模板與顯示模式', () => {
    expect(PLATFORMS.DISCORD.urlTemplate).toBe('https://discord.com/users/{{}}')
    expect(PLATFORMS.DISCORD.displayMode).toBe('fullUrl')
    expect(PLATFORMS.DISCORD_SERVER.urlTemplate).toBe('https://discord.gg/{{}}')
    expect(PLATFORMS.DISCORD_SERVER.fillPlaceholder).toBe('key')
    expect(PLATFORMS.FACEBOOK_PAGE.urlTemplate).toBe('https://www.facebook.com/profile.php?id={{}}')
    expect(PLATFORMS.FACEBOOK_PAGE.displayMode).toBe('fullUrl')
    expect(PLATFORMS.FACEBOOK_PAGE.fillPlaceholder).toBe('id')
  })

  it('STEAM（free + lastSegment）自由貼整條 URL、保留 host 鎖定、無模板', () => {
    expect(PLATFORMS.STEAM.inputMode).toBe('free')
    expect(PLATFORMS.STEAM.displayMode).toBe('lastSegment')
    expect(PLATFORMS.STEAM.urlTemplate).toBeUndefined()
    expect(PLATFORMS.STEAM.fillPlaceholder).toBeUndefined()
    // host 仍鎖 steamcommunity.com（free 不等同無 urlPattern）
    expect(PLATFORMS.STEAM.urlPattern).toBeDefined()
    expect(PLATFORMS.STEAM.urlPattern?.test('steamcommunity.com')).toBe(true)
  })

  it('模式 C（free + fullUrl）平台無模板', () => {
    expect(PLATFORMS.PERSONAL.inputMode).toBe('free')
    expect(PLATFORMS.PERSONAL.displayMode).toBe('fullUrl')
    expect(PLATFORMS.PERSONAL.urlTemplate).toBeUndefined()
    expect(PLATFORMS.OTHER.inputMode).toBe('free')
  })

  it('每個 template 平台 urlTemplate 含 {{}} 槽位、free 平台無模板', () => {
    for (const p of SOCIAL_PLATFORMS) {
      const meta = PLATFORMS[p]
      if (meta.inputMode === 'template') {
        expect(meta.urlTemplate).toContain('{{}}')
      } else {
        expect(meta.urlTemplate).toBeUndefined()
      }
    }
  })
})

describe('resolvePlatformMeta', () => {
  it('已知值（X）回傳正確的 X meta', () => {
    const meta = resolvePlatformMeta('X')
    expect(meta).toBe(PLATFORMS.X)
    expect(meta.label).toBe('X')
  })

  it('未知值（myspace）fallback 至 PLATFORMS.OTHER', () => {
    const meta = resolvePlatformMeta('myspace')
    expect(meta).toBe(PLATFORMS.OTHER)
    expect(meta.label).toBe('其他')
  })
})
