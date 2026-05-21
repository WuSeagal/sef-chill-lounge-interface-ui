import { describe, it, expect } from 'vitest'
import { ref, isRef } from 'vue'
import { useMockMember } from '@/composables/useMockMember'

describe('useMockMember', () => {
    it('returns a ref-like (computed) object', () => {
        const member = useMockMember('u-101')
        expect(isRef(member)).toBe(true)
    })

    it('returns the matching member for a known userId', () => {
        const member = useMockMember('u-101')
        expect(member.value).toBeDefined()
        expect(member.value!.id).toBe('u-101')
        expect(member.value!.nickname).toBe('小毛')
    })

    it('returns undefined for an unknown userId', () => {
        const member = useMockMember('u-999')
        expect(member.value).toBeUndefined()
    })

    it('updates when the userId argument is a reactive ref', () => {
        const id = ref<string>('u-101')
        const member = useMockMember(id)
        expect(member.value!.nickname).toBe('小毛')

        id.value = 'u-102'
        expect(member.value!.nickname).toBe('Foxy')
    })

    it('returns undefined when the reactive userId switches to an unknown id', () => {
        const id = ref<string>('u-101')
        const member = useMockMember(id)
        expect(member.value).toBeDefined()

        id.value = 'u-NOPE'
        expect(member.value).toBeUndefined()
    })
})
