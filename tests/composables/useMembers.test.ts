import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/api/userApi', () => ({ fetchMembers: vi.fn() }))

import * as api from '@/api/userApi'
import { useMembers, resetMembersStateForTest } from '@/composables/useMembers'

describe('useMembers', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        resetMembersStateForTest()
    })

    it('refetch fills members.value on success', async () => {
        ;(api.fetchMembers as any).mockResolvedValue([{ userId: 'a' }, { userId: 'b' }])
        const m = useMembers()
        await m.refetch()
        expect(m.members.value.length).toBe(2)
        expect(m.loading.value).toBe(false)
    })

    it('refetch sets error.value on rejection', async () => {
        ;(api.fetchMembers as any).mockRejectedValue({
            response: { data: { message: 'boom' } },
        })
        const m = useMembers()
        await m.refetch()
        expect(m.error.value).toBe('boom')
    })

    it('shares singleton state across calls', async () => {
        ;(api.fetchMembers as any).mockResolvedValue([{ userId: 'a' }])
        const m1 = useMembers()
        await m1.refetch()
        const m2 = useMembers()
        expect(m2.members.value.length).toBe(1)
    })
})
