<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import './UserPopup.css'
import { fetchProfileDetail } from '@/api/userApi'
import type { UserProfile } from '@/types/user'

const props = defineProps<{
    open: boolean
    userId: string | null
}>()

const emit = defineEmits<{
    (e: 'close'): void
}>()

const rootEl = ref<HTMLElement | null>(null)
const profile = ref<UserProfile | null>(null)
const loading = ref<boolean>(false)
const loadError = ref<string | null>(null)

const visible = computed(() => props.open && (profile.value !== null || loading.value || loadError.value !== null))

async function loadProfile(userId: string): Promise<void> {
    loading.value = true
    loadError.value = null
    profile.value = null
    try {
        profile.value = await fetchProfileDetail(userId)
    } catch (e: any) {
        loadError.value = e?.response?.data?.message ?? '載入失敗'
    } finally {
        loading.value = false
    }
}

watch(
    () => [props.open, props.userId] as const,
    ([open, userId]) => {
        if (open && userId) {
            loadProfile(userId)
        } else {
            profile.value = null
            loadError.value = null
        }
    },
    { immediate: true },
)

function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && visible.value) {
        emit('close')
    }
}

function onOutsideClick(event: MouseEvent) {
    if (!visible.value) return
    const target = event.target as Node | null
    if (target && rootEl.value && rootEl.value.contains(target)) {
        return
    }
    emit('close')
}

function onSelfClick(event: MouseEvent) {
    event.stopPropagation()
}

watch(
    () => props.open,
    (open) => {
        if (open) {
            window.addEventListener('keydown', onKeydown)
            window.addEventListener('click', onOutsideClick)
        } else {
            window.removeEventListener('keydown', onKeydown)
            window.removeEventListener('click', onOutsideClick)
        }
    },
    { immediate: true },
)

onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKeydown)
    window.removeEventListener('click', onOutsideClick)
})
</script>

<template>
    <div v-if="visible" ref="rootEl" class="user-popup" @click="onSelfClick">
        <template v-if="loading">
            <p>載入中...</p>
        </template>
        <template v-else-if="loadError">
            <p>{{ loadError }}</p>
        </template>
        <template v-else-if="profile">
            <h3 class="user-popup__nickname">{{ profile.furName || profile.username }}</h3>
            <ul v-if="profile.tags && profile.tags.length > 0" class="user-popup__tags">
                <li v-for="tag in profile.tags" :key="tag.tagId" class="user-popup__tag">{{ tag.content }}</li>
            </ul>
            <ul v-if="profile.socials && profile.socials.length > 0" class="user-popup__socials">
                <li v-for="link in profile.socials" :key="link.id">
                    <a
                        class="user-popup__social-link"
                        :href="link.links"
                        target="_blank"
                        rel="noopener noreferrer"
                    >{{ link.platform }} →</a>
                </li>
            </ul>
        </template>
    </div>
</template>
