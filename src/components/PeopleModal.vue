<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import './PeopleModal.css'
import { useMembers } from '@/composables/useMembers'
import { resolveAvatarSrc } from '@/utils/avatarSource'
import type { Member } from '@/types/user'

/**
 * People 名單 modal（people-directory）：由線上人數計數器開啟，列出與會者（頭像 + 顯示名稱 +
 * 興趣 TAG，TAG 單行截斷），可搜尋顯示名稱、前端分頁每頁 50。點某人 emit select(userId)，
 * 由父層以既有 UserPopup/PassportOverlay 管線開啟唯讀護照。X / 點遮罩外 / Esc 關閉。
 */
const PAGE_SIZE = 50

const props = defineProps<{ open: boolean; onlineIds?: string[]; suspended?: boolean }>()
const emit = defineEmits<{
    (e: 'close'): void
    (e: 'select', userId: string): void
}>()

const { members, loading, error, refetch } = useMembers()

const query = ref('')
const page = ref(1)
const panelRef = ref<HTMLElement | null>(null)
let lastFocused: HTMLElement | null = null

const filtered = computed<Member[]>(() => {
    const q = query.value.trim().toLowerCase()
    if (!q) return members.value
    return members.value.filter((m) => (m.furName || m.username || '').toLowerCase().includes(q))
})
// 在線優先排序：先在線（保留原順序）再離線；離線列淡化顯示。
const onlineSet = computed(() => new Set(props.onlineIds ?? []))
function isOnline(m: Member): boolean {
    return onlineSet.value.has(m.userId)
}
const sorted = computed<Member[]>(() => {
    const online: Member[] = []
    const offline: Member[] = []
    for (const m of filtered.value) {
        if (isOnline(m)) online.push(m)
        else offline.push(m)
    }
    return [...online, ...offline]
})
const totalPages = computed(() => Math.max(1, Math.ceil(sorted.value.length / PAGE_SIZE)))
const pageItems = computed<Member[]>(() => {
    const start = (page.value - 1) * PAGE_SIZE
    return sorted.value.slice(start, start + PAGE_SIZE)
})

// 搜尋變動 → 回第 1 頁
watch(query, () => { page.value = 1 })

function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
        // 有子層 overlay（如點成員開的護照）疊在其上時暫停 Esc，讓最上層先關（與
        // PassportOverlay 對內層 lightbox 的 `lightboxUrl !== null` 禮讓一致）。
        if (props.suspended) return
        event.stopPropagation()
        emit('close')
    }
}

watch(
    () => props.open,
    (open) => {
        if (open) {
            lastFocused = (document.activeElement as HTMLElement | null)
            query.value = ''
            page.value = 1
            refetch()
            window.addEventListener('keydown', onKeydown)
            nextTick(() => panelRef.value?.focus())
        } else {
            window.removeEventListener('keydown', onKeydown)
            lastFocused?.focus?.()
        }
    },
    { immediate: true },
)

onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

function displayName(m: Member): string {
    return m.furName || m.username || ''
}
function prevPage(): void {
    if (page.value > 1) page.value -= 1
}
function nextPage(): void {
    if (page.value < totalPages.value) page.value += 1
}
</script>

<template>
    <Teleport to="body">
        <div v-if="open" class="people-modal" data-test="people-modal" @click.self="emit('close')">
            <div
                ref="panelRef"
                class="people-modal__panel"
                role="dialog"
                aria-modal="true"
                aria-label="參加成員"
                tabindex="-1"
            >
                <header class="people-modal__head">
                    <h2 class="people-modal__title">參加成員</h2>
                    <button type="button" class="people-modal__close" aria-label="關閉" @click="emit('close')">×</button>
                </header>

                <input
                    v-model="query"
                    type="text"
                    class="people-modal__search"
                    placeholder="搜尋顯示名稱…"
                    aria-label="搜尋顯示名稱"
                />

                <div class="people-modal__body">
                    <p v-if="loading" class="people-modal__status">載入中…</p>
                    <p v-else-if="error" class="people-modal__status">{{ error }}</p>
                    <p v-else-if="filtered.length === 0" class="people-modal__status">找不到符合的成員</p>
                    <ul v-else class="people-modal__list">
                        <li v-for="m in pageItems" :key="m.userId">
                            <button
                                type="button"
                                class="people-row"
                                :class="{ 'people-row--offline': !isOnline(m) }"
                                @click="emit('select', m.userId)"
                            >
                                <img class="people-row__avatar" :src="resolveAvatarSrc(m.avatar)" alt="" />
                                <span class="people-row__main">
                                    <span class="people-row__name">{{ displayName(m) }}</span>
                                    <span class="people-row__tags">
                                        <span
                                            v-for="t in (m.tags ?? [])"
                                            :key="t.tagId"
                                            class="people-row__tag"
                                        >{{ t.content }}</span>
                                    </span>
                                </span>
                            </button>
                        </li>
                    </ul>
                </div>

                <footer v-if="!loading && !error && filtered.length > 0" class="people-modal__foot">
                    <button
                        type="button"
                        class="people-modal__page-btn"
                        :disabled="page <= 1"
                        aria-label="上一頁"
                        @click="prevPage"
                    >‹</button>
                    <span class="people-modal__page-info">{{ page }} / {{ totalPages }}</span>
                    <button
                        type="button"
                        class="people-modal__page-btn"
                        :disabled="page >= totalPages"
                        aria-label="下一頁"
                        @click="nextPage"
                    >›</button>
                </footer>
            </div>
        </div>
    </Teleport>
</template>
