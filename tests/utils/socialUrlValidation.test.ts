import { describe, it, expect } from 'vitest'
import { validateSafeUrl, validateSocialUrl } from '@/utils/socialUrlValidation'

describe('validateSafeUrl（通用安全層）', () => {
  it('合法 https 通過', () => {
    expect(validateSafeUrl('https://example.com/me')).toEqual({ valid: true })
  })
  it('非 url 字串 → invalid_url', () => {
    expect(validateSafeUrl('not a url')).toEqual({ valid: false, reason: 'invalid_url' })
  })
  it('非 http(s) scheme → unsafe_url', () => {
    expect(validateSafeUrl('ftp://example.com')).toEqual({ valid: false, reason: 'unsafe_url' })
    expect(validateSafeUrl('javascript:alert(1)')).toEqual({ valid: false, reason: 'unsafe_url' })
  })
  it('localhost → unsafe_url', () => {
    expect(validateSafeUrl('http://localhost:3000')).toEqual({ valid: false, reason: 'unsafe_url' })
  })
  it('裸 IPv4 / 私有 IP → unsafe_url', () => {
    expect(validateSafeUrl('http://127.0.0.1')).toEqual({ valid: false, reason: 'unsafe_url' })
    expect(validateSafeUrl('https://192.168.0.10/x')).toEqual({ valid: false, reason: 'unsafe_url' })
  })
})

describe('validateSocialUrl（含平台層）', () => {
  it('X 接受 x.com 與 twitter.com', () => {
    expect(validateSocialUrl('X', 'https://x.com/maomao')).toEqual({ valid: true })
    expect(validateSocialUrl('X', 'https://twitter.com/maomao')).toEqual({ valid: true })
  })
  it('THREADS 接受 .com 與 .net', () => {
    expect(validateSocialUrl('THREADS', 'https://threads.com/@a')).toEqual({ valid: true })
    expect(validateSocialUrl('THREADS', 'https://www.threads.net/@a')).toEqual({ valid: true })
  })
  it('GitHub 配 x.com → platform_mismatch', () => {
    expect(validateSocialUrl('GITHUB', 'https://x.com/maomao')).toEqual({ valid: false, reason: 'platform_mismatch' })
  })
  it('PERSONAL 接受任意安全 URL（不檢查 pattern）', () => {
    expect(validateSocialUrl('PERSONAL', 'https://my-portfolio.example.com')).toEqual({ valid: true })
  })
  it('平台層之前先過安全層：PERSONAL + localhost → unsafe_url', () => {
    expect(validateSocialUrl('PERSONAL', 'http://localhost')).toEqual({ valid: false, reason: 'unsafe_url' })
  })
})
