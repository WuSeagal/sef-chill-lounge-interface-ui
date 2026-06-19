import { ref, computed, watch, type Ref, type ComputedRef } from 'vue'
import type { Member } from '@/types/user'

// 黑名單 autofill：自由輸入 → 比對 furName 或 username（子字串、大小寫不敏感）。
// 與聊天 @mention 不同（非 @-token 觸發、furName-only），故獨立一支，不重用 useChatAutofiller（design D5）。
// 必須從候選選定真實 member（解析為 userId）才能送出；純文字對不到 member 不可送出。

export interface BlacklistCandidate {
    userId: string
    furName: string | null
    username: string
}

export interface UseBlacklistAutofill {
    candidates: ComputedRef<BlacklistCandidate[]>
    selectedUserId: Ref<string | null>
    canSubmit: ComputedRef<boolean>
    select(candidate: BlacklistCandidate): void
    reset(): void
}

export function useBlacklistAutofill(
    input: Ref<string>,
    members: Ref<Member[]>,
    excludeUserIds: Ref<Set<string>> = ref(new Set()),
): UseBlacklistAutofill {
    const selectedUserId = ref<string | null>(null)

    const candidates = computed<BlacklistCandidate[]>(() => {
        const q = input.value.trim().toLowerCase()
        if (q.length === 0) return []
        return members.value
            .filter(m => !excludeUserIds.value.has(m.userId))
            .filter(m => {
                const fur = (m.furName ?? '').toLowerCase()
                const user = (m.username ?? '').toLowerCase()
                return fur.includes(q) || user.includes(q)
            })
            .map(m => ({ userId: m.userId, furName: m.furName, username: m.username }))
    })

    const canSubmit = computed(() => selectedUserId.value !== null)

    // 選定 → 設 userId 並把輸入填成 furName（無 furName 退回 username），方便視覺確認。
    // 之後 watch input 會在使用者再次編輯時清除選取（見下）。
    let suppressClearOnNextInput = false
    function select(candidate: BlacklistCandidate): void {
        selectedUserId.value = candidate.userId
        suppressClearOnNextInput = true
        input.value = candidate.furName ?? candidate.username
    }

    // 編輯輸入即作廢先前選取：避免「選了 A、又改字、卻拿 A 的 userId 送出」。
    // sync flush：select() 同步把 input 設成 furName 時立即消費 suppress 旗標，
    // 後續使用者實際編輯（非 select 觸發）才會同步清除選取（與 useChatAutofiller 一致）。
    watch(input, () => {
        if (suppressClearOnNextInput) {
            suppressClearOnNextInput = false
            return
        }
        selectedUserId.value = null
    }, { flush: 'sync' })

    function reset(): void {
        suppressClearOnNextInput = true
        input.value = ''
        selectedUserId.value = null
    }

    return { candidates, selectedUserId, canSubmit, select, reset }
}
