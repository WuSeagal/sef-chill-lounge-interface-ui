import { describe, it, expect } from 'vitest'
import { buildAvatarRingStyle } from '@/utils/avatarRing'

describe('buildAvatarRingStyle', () => {
  it('returns ring box-shadow when border on and color present (sm)', () => {
    expect(buildAvatarRingStyle('#7b9b8f', true, 'sm')).toEqual({
      boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.2), 0 0 0 3px #7b9b8f',
    })
  })

  it('returns larger ring for lg size', () => {
    expect(buildAvatarRingStyle('#c9826b', true, 'lg')).toEqual({
      boxShadow: 'inset 0 0 0 1.5px rgba(0,0,0,0.2), 0 0 0 4px #c9826b',
    })
  })

  it('returns empty style when border off', () => {
    expect(buildAvatarRingStyle('#7b9b8f', false, 'sm')).toEqual({})
  })

  it('returns empty style when color null/empty even if border on (null-guard)', () => {
    expect(buildAvatarRingStyle(null, true, 'sm')).toEqual({})
    expect(buildAvatarRingStyle('', true, 'sm')).toEqual({})
    expect(buildAvatarRingStyle(undefined, true, 'lg')).toEqual({})
  })
})
