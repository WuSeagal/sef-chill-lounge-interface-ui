import { computed, isRef, type ComputedRef, type Ref } from 'vue'
import { mockMembers } from '@/mocks/mockMembers'
import type { MockUser } from '@/mocks/mockUser'

type UserIdInput = string | Ref<string>

export function useMockMember(userId: UserIdInput): ComputedRef<MockUser | undefined> {
    return computed<MockUser | undefined>(() => {
        const id = isRef(userId) ? userId.value : userId
        return mockMembers.find((m) => m.id === id)
    })
}
