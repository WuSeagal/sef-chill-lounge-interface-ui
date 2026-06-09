import { describe, it, expect } from 'vitest'
import { composeSocialUrl, parseSocialHandle, formatSocialDisplay } from '@/utils/socialUrl'

const LINKEDIN_NAME = '鈺盛-徐-a6b25a415'
const LINKEDIN_ENCODED = `https://www.linkedin.com/in/${encodeURIComponent(LINKEDIN_NAME)}`

describe('composeSocialUrl', () => {
  it('模式 A 套模板補前綴', () => {
    expect(composeSocialUrl('INSTAGRAM', 'maomao')).toBe('https://www.instagram.com/maomao')
    expect(composeSocialUrl('GITHUB', 'maomao')).toBe('https://github.com/maomao')
    expect(composeSocialUrl('THREADS', 'maomao')).toBe('https://www.threads.com/@maomao')
  })

  it('模式 B 套模板（含 query 槽位）', () => {
    expect(composeSocialUrl('FACEBOOK_PAGE', '12345')).toBe('https://www.facebook.com/profile.php?id=12345')
    expect(composeSocialUrl('DISCORD', '999')).toBe('https://discord.com/users/999')
    expect(composeSocialUrl('DISCORD_SERVER', 'abc')).toBe('https://discord.gg/abc')
    expect(composeSocialUrl('STEAM', '76561198000000000')).toBe('https://steamcommunity.com/profiles/76561198000000000')
  })

  it('中文 / 非 ASCII 槽位 percent-encode', () => {
    expect(composeSocialUrl('LINKEDIN', LINKEDIN_NAME)).toBe(LINKEDIN_ENCODED)
  })

  it('去除前後空白', () => {
    expect(composeSocialUrl('INSTAGRAM', '  maomao  ')).toBe('https://www.instagram.com/maomao')
  })

  it('模式 C（free）原樣回傳', () => {
    expect(composeSocialUrl('PERSONAL', 'https://my.example.com')).toBe('https://my.example.com')
    expect(composeSocialUrl('OTHER', 'https://linktr.ee/x')).toBe('https://linktr.ee/x')
  })

  it('使用者自打開頭 @ 時去除一個（避免 @%40 雙重）', () => {
    expect(composeSocialUrl('THREADS', '@maomao')).toBe('https://www.threads.com/@maomao')
    expect(composeSocialUrl('X', '@maomao')).toBe('https://x.com/maomao')
  })

  it('template 模式空槽回空字串（沿用上層空值處理）', () => {
    expect(composeSocialUrl('INSTAGRAM', '')).toBe('')
    expect(composeSocialUrl('INSTAGRAM', '   ')).toBe('')
    expect(composeSocialUrl('THREADS', '@')).toBe('')
  })
})

describe('parseSocialHandle', () => {
  it('去前綴取帳號', () => {
    expect(parseSocialHandle('INSTAGRAM', 'https://www.instagram.com/maomao')).toBe('maomao')
    expect(parseSocialHandle('THREADS', 'https://www.threads.com/@maomao')).toBe('maomao')
    expect(parseSocialHandle('FACEBOOK_PAGE', 'https://www.facebook.com/profile.php?id=12345')).toBe('12345')
  })

  it('容忍 www. 有無', () => {
    expect(parseSocialHandle('INSTAGRAM', 'https://instagram.com/maomao')).toBe('maomao')
    expect(parseSocialHandle('GITHUB', 'https://www.github.com/maomao')).toBe('maomao')
  })

  it('LinkedIn 還原 percent-encode 為原語言', () => {
    expect(parseSocialHandle('LINKEDIN', LINKEDIN_ENCODED)).toBe(LINKEDIN_NAME)
  })

  it('Discord 舊網域 discordapp.com 正規化後可反解', () => {
    expect(parseSocialHandle('DISCORD', 'https://discordapp.com/users/999')).toBe('999')
    expect(parseSocialHandle('DISCORD', 'https://discord.com/users/999')).toBe('999')
  })

  it('非 URL（裸帳號）回 null', () => {
    expect(parseSocialHandle('INSTAGRAM', 'maomao')).toBeNull()
  })

  it('帳號為單一 path segment：切掉尾斜線 / query / 多餘路徑', () => {
    expect(parseSocialHandle('LINKEDIN', `${LINKEDIN_ENCODED}/`)).toBe(LINKEDIN_NAME)
    expect(parseSocialHandle('INSTAGRAM', 'https://www.instagram.com/maomao/')).toBe('maomao')
    expect(parseSocialHandle('INSTAGRAM', 'https://www.instagram.com/maomao/?hl=en')).toBe('maomao')
    expect(parseSocialHandle('INSTAGRAM', 'https://www.instagram.com/maomao?utm=x')).toBe('maomao')
  })

  it('模式 B query 槽位切掉額外參數', () => {
    expect(parseSocialHandle('FACEBOOK_PAGE', 'https://www.facebook.com/profile.php?id=12345&ref=x')).toBe('12345')
  })

  it('前綴不符回 null', () => {
    expect(parseSocialHandle('INSTAGRAM', 'https://example.com/maomao')).toBeNull()
  })

  it('free 模式回 null', () => {
    expect(parseSocialHandle('PERSONAL', 'https://www.instagram.com/maomao')).toBeNull()
  })
})

describe('formatSocialDisplay', () => {
  it('模式 A 顯示 @帳號', () => {
    expect(formatSocialDisplay('INSTAGRAM', 'https://www.instagram.com/maomao')).toBe('@maomao')
    expect(formatSocialDisplay('LINKEDIN', LINKEDIN_ENCODED)).toBe(`@${LINKEDIN_NAME}`)
  })

  it('模式 B / C 顯示完整 URL', () => {
    expect(formatSocialDisplay('STEAM', 'https://steamcommunity.com/profiles/123')).toBe('https://steamcommunity.com/profiles/123')
    expect(formatSocialDisplay('DISCORD', 'https://discord.com/users/999')).toBe('https://discord.com/users/999')
    expect(formatSocialDisplay('PERSONAL', 'https://my.example.com')).toBe('https://my.example.com')
  })

  it('模式 A 反解失敗 fallback 顯示完整 URL', () => {
    expect(formatSocialDisplay('INSTAGRAM', 'https://broken.example/foo')).toBe('https://broken.example/foo')
  })
})
