<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import './UserPopup.css'
import { fetchProfileDetail } from '@/api/userApi'
import { buildAvatarRingStyle } from '@/utils/avatarRing'
import { resolveAvatarSrc } from '@/utils/avatarSource'
import { TagType, TAG_TYPE_ORDER, TAG_TYPE_PREFIX, type Tag, type UserProfile } from '@/types/user'
import { resolvePlatformMeta } from '@/constants/platforms'

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

const groupedTags = computed<Record<TagType, Tag[]>>(() => {
    const acc: Record<TagType, Tag[]> = {
        [TagType.ROLE]: [], [TagType.LANGUAGE]: [], [TagType.FRAMEWORK]: [],
        [TagType.DATABASE]: [], [TagType.DEVOPS]: [], [TagType.CUSTOM]: [],
    }
    for (const t of (profile.value?.tags ?? [])) {
        if (acc[t.type]) acc[t.type].push(t)
    }
    return acc
})
const visibleTagTypes = computed(() => TAG_TYPE_ORDER.filter(type => groupedTags.value[type].length > 0))
const hasAnyTags = computed(() => (profile.value?.tags?.length ?? 0) > 0)

const avatarHeaderStyle = computed(() => ({
    backgroundImage: `url(${resolveAvatarSrc(profile.value?.avatar)})`,
    ...buildAvatarRingStyle(profile.value?.avatarColor ?? null, profile.value?.avatarBorder ?? false, 'lg'),
}))

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
            <div class="user-popup__header">
                <div class="user-popup__avatar" :style="avatarHeaderStyle" aria-hidden="true"></div>
                <h3 class="user-popup__nickname">{{ profile.furName || profile.username }}</h3>
            </div>
            <div v-if="hasAnyTags" class="user-popup__tag-block">
                <span class="user-popup__tag-title">TAG</span>
                <div
                    v-for="type in visibleTagTypes"
                    :key="type"
                    class="user-popup__tag-row"
                    :class="{ 'user-popup__tag-row--custom': type === TagType.CUSTOM }"
                >
                    <span
                        v-if="type !== TagType.CUSTOM"
                        class="user-popup__tag-row-label"
                    >{{ TAG_TYPE_PREFIX[type] }}</span>
                    <div class="user-popup__tag-row-chips">
                        <span
                            v-for="tag in groupedTags[type]"
                            :key="tag.tagId"
                            class="user-popup__tag-chip"
                        >{{ tag.content }}</span>
                    </div>
                </div>
            </div>
            <ul v-if="profile.socials && profile.socials.length > 0" class="user-popup__socials">
                <li v-for="link in profile.socials" :key="link.id">
                    <a
                        class="user-popup__social-link"
                        :href="link.links"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <span
                            class="user-popup__social-icon"
                            :style="{ backgroundColor: resolvePlatformMeta(link.platform).brandColor }"
                            v-html="resolvePlatformMeta(link.platform).icon"
                            aria-hidden="true"
                        ></span>
                        <span class="user-popup__social-label">{{ resolvePlatformMeta(link.platform).label }}</span>
                    </a>
                </li>
            </ul>
        </template>
    </div>
</template>
