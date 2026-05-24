import { ref, type Ref } from 'vue'
import * as userApi from '@/api/userApi'
import type { Member } from '@/types/user'

const members = ref<Member[]>([])
const loading = ref<boolean>(false)
const error = ref<string | null>(null)

export type UseMembersReturn = {
    members: Ref<Member[]>
    loading: Ref<boolean>
    error: Ref<string | null>
    refetch: () => Promise<void>
}

export function useMembers(): UseMembersReturn {
    async function refetch(): Promise<void> {
        loading.value = true
        error.value = null
        try {
            members.value = await userApi.fetchMembers()
        } catch (e: any) {
            error.value = e?.response?.data?.message ?? '載入成員列表失敗'
        } finally {
            loading.value = false
        }
    }

    return { members, loading, error, refetch }
}

export function resetMembersStateForTest(): void {
    members.value = []
    loading.value = false
    error.value = null
}
