<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import './UserPopup.css'
import PassportOverlay from './PassportOverlay.vue'
import { fetchProfileDetail } from '@/api/userApi'
import { buildAvatarRingStyle } from '@/utils/avatarRing'
import { resolveAvatarSrc } from '@/utils/avatarSource'
import { assetUrl } from '@/utils/assetUrl'
import type { UserProfile } from '@/types/user'

/**
 * /chat 點任一使用者頭像（含自己）開啟的唯讀個人 profile。
 * 抓取該使用者 profile 後，以共用的 PassportOverlay（放大護照）呈現——與 onboarding review 一致。
 * 唯讀：不提供就地編輯（編輯走設定面板）。
 */
const props = defineProps<{
    open: boolean
    userId: string | null
}>()

const emit = defineEmits<{
    (e: 'close'): void
}>()

const profile = ref<UserProfile | null>(null)
const loading = ref<boolean>(false)
const loadError = ref<string | null>(null)

const showPassport = computed(() => props.open && profile.value !== null)
const showStatus = computed(() => props.open && (loading.value || loadError.value !== null))

const furName = computed(() => profile.value?.furName || profile.value?.username || '')
const avatarSrc = computed(() => resolveAvatarSrc(profile.value?.avatar))
const avatarStyle = computed(() =>
    buildAvatarRingStyle(profile.value?.avatarColor ?? null, profile.value?.avatarBorder ?? false, 'lg'))
const passportTags = computed(() => profile.value?.tags ?? [])
const passportSocials = computed(() =>
    (profile.value?.socials ?? []).map(s => ({ platform: s.platform, links: s.links })))
const passportStickers = computed(() =>
    (profile.value?.stickers ?? [])
        .map(s => assetUrl(s.sticker))
        .filter((url): url is string => !!url))

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

// loading / error 狀態的 Escape 關閉（passport 顯示時由 PassportOverlay 自己處理 Escape）
function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && showStatus.value) {
        emit('close')
    }
}
watch(
    () => showStatus.value,
    (active) => {
        if (active) window.addEventListener('keydown', onKeydown)
        else window.removeEventListener('keydown', onKeydown)
    },
    { immediate: true },
)
onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
    <PassportOverlay
        v-if="showPassport"
        :open="true"
        :fur-name="furName"
        :avatar-src="avatarSrc"
        :avatar-style="avatarStyle"
        :tags="passportTags"
        :socials="passportSocials"
        :stickers="passportStickers"
        @close="emit('close')"
    />
    <Teleport to="body">
        <div v-if="showStatus" class="user-popup-status" @click.self="emit('close')">
            <div class="user-popup-status__box">
                <p>{{ loading ? '載入中...' : loadError }}</p>
            </div>
        </div>
    </Teleport>
</template>
