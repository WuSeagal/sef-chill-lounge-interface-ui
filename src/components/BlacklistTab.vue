<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import './BlacklistTab.css'
import { push } from 'notivue'
import { fetchBlacklist, banUser, removeFromBlacklist } from '@/api/blacklistApi'
import { useMembers } from '@/composables/useMembers'
import { useBlacklistAutofill } from '@/composables/useBlacklistAutofill'
import { HOST_PROVIDER_USER_ID } from '@/utils/host'
import type { BlacklistEntry } from '@/types/blacklist'
import type { BlacklistCandidate } from '@/composables/useBlacklistAutofill'

// host 專屬黑名單分頁：autofill 封禁（必須選到真實 member）+ 目前黑名單清單逐一解封。
// autofill 來源沿用既有 GET /members（不新增列表 API，見 design D4）。

const blacklist = ref<BlacklistEntry[]>([])
const submitting = ref(false)
const showCandidates = ref(false)

const { members, refetch: refetchMembers } = useMembers()

const input = ref('')
// 候選排除：已在黑名單者（避免重複封禁）+ host 本人（究極保護：host 不能自 ban，鏡像後端守門）。
const excludeIds = computed(() => new Set([...blacklist.value.map(e => e.userId), HOST_PROVIDER_USER_ID]))
const { candidates, selectedUserId, canSubmit, select, reset } = useBlacklistAutofill(
    input,
    members,
    excludeIds,
)

async function loadBlacklist(): Promise<void> {
    try {
        blacklist.value = await fetchBlacklist()
    } catch {
        push.error('載入黑名單失敗，請稍後再試')
    }
}

onMounted(async () => {
    await Promise.all([loadBlacklist(), refetchMembers()])
})

function onInput(): void {
    showCandidates.value = true
}

function onSelectCandidate(candidate: BlacklistCandidate): void {
    select(candidate)
    showCandidates.value = false
}

async function onBan(): Promise<void> {
    if (!canSubmit.value || selectedUserId.value === null) return
    submitting.value = true
    try {
        await banUser(selectedUserId.value)
        reset()
        showCandidates.value = false
        await loadBlacklist()
    } catch {
        push.error('封禁失敗，請稍後再試')
    } finally {
        submitting.value = false
    }
}

async function onUnban(userId: string): Promise<void> {
    submitting.value = true
    try {
        await removeFromBlacklist(userId)
        await loadBlacklist()
    } catch {
        push.error('解封失敗，請稍後再試')
    } finally {
        submitting.value = false
    }
}
</script>

<template>
    <div class="blacklist-tab" data-test="blacklist-tab">
        <h3 class="blacklist-tab__title">黑名單</h3>
        <p class="blacklist-tab__hint">輸入暱稱或帳號，從清單選定後封禁。被封禁者無法進入聊天室。</p>

        <div class="blacklist-tab__search">
            <input
                v-model="input"
                class="blacklist-tab__input"
                type="text"
                placeholder="輸入暱稱或帳號"
                autocomplete="off"
                data-test="blacklist-input"
                @input="onInput"
                @focus="onInput"
            />
            <div
                v-if="showCandidates && candidates.length > 0"
                class="blacklist-tab__candidates"
                role="listbox"
            >
                <button
                    v-for="c in candidates"
                    :key="c.userId"
                    type="button"
                    class="blacklist-tab__candidate"
                    role="option"
                    :data-test="`blacklist-candidate-${c.userId}`"
                    @mousedown.prevent="onSelectCandidate(c)"
                >
                    <span class="blacklist-tab__candidate-fur">{{ c.furName ?? c.username }}</span>
                    <span class="blacklist-tab__candidate-username">{{ c.username }}</span>
                </button>
            </div>
            <button
                type="button"
                class="blacklist-tab__submit"
                :disabled="!canSubmit || submitting"
                data-test="blacklist-submit"
                @click="onBan"
            >封禁</button>
        </div>

        <h4 class="blacklist-tab__list-title">目前黑名單</h4>
        <p v-if="blacklist.length === 0" class="blacklist-tab__empty">目前沒有被封禁的使用者</p>
        <ul v-else class="blacklist-tab__list">
            <li
                v-for="entry in blacklist"
                :key="entry.userId"
                class="blacklist-tab__item"
                :data-test="`blacklist-item-${entry.userId}`"
            >
                <span class="blacklist-tab__item-names">
                    <span class="blacklist-tab__item-fur">{{ entry.furName ?? entry.username }}</span>
                    <span class="blacklist-tab__item-username">{{ entry.username }}</span>
                </span>
                <button
                    type="button"
                    class="blacklist-tab__unban"
                    :disabled="submitting"
                    :data-test="`blacklist-unban-${entry.userId}`"
                    @click="onUnban(entry.userId)"
                >解封</button>
            </li>
        </ul>
    </div>
</template>
