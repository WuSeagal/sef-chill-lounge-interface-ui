import { describe, it, expect } from 'vitest'
import { resolveAvatarSrc } from '@/utils/avatarSource'

describe('resolveAvatarSrc', () => {
    it('returns default avatar when avatar is null', () => {
        expect(resolveAvatarSrc(null)).toContain('default-avatar.png')
    })

    it('passes blob url through unchanged', () => {
        expect(resolveAvatarSrc('blob:http://localhost/demo')).toBe('blob:http://localhost/demo')
    })

    it('passes mock frontend avatar paths through unchanged', () => {
        expect(resolveAvatarSrc('/mock-images/avatar-default.png')).toBe('/mock-images/avatar-default.png')
    })
})
