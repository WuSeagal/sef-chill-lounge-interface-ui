<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import './IntroView.css'
import { fetchSelectableTags } from '@/api/userApi'
import { uploadAvatar } from '@/api/avatarUploadApi'
import AvatarCropModal from '@/components/AvatarCropModal.vue'
import StickerManager from '@/components/StickerManager.vue'
import LizardLoading from '@/components/LizardLoading.vue'
import { useUser } from '@/composables/useUser'
import { useAvatarUploadDraft } from '@/composables/useAvatarUploadDraft'
import { useTagEditorState } from '@/composables/useTagEditorState'
import { useAuthStore } from '@/stores/auth.ts'
import TagEditorPreview from '@/components/TagEditorPreview.vue'
import TagEditorModal from '@/components/TagEditorModal.vue'
import ToggleSwitch from '@/components/ToggleSwitch.vue'
import { TAG_TYPE_ORDER, TagType, type GroupedTags, type Tag } from '@/types/user'
import { buildAvatarRingStyle } from '@/utils/avatarRing'
import { resolveAvatarSrc } from '@/utils/avatarSource'
import { PLATFORM_LIST, PLATFORMS, type SocialPlatform } from '@/constants/platforms'
import { validateSocialUrl } from '@/utils/socialUrlValidation'
import lizardchiEgg from '@/assets/lizardchi.png'
import defaultAvatarImg from '@/assets/avatars/default-avatar.png'

const TAG_MAX = 20

type SocialDraft = {
    platform: SocialPlatform | ''
    links: string
}

const router = useRouter()
const { t } = useI18n()
const auth = useAuthStore()
const user = useUser()

const steps = [
    { key: 'nickname', optional: false },
    { key: 'avatar', optional: true },
    { key: 'tags', optional: true },
    { key: 'socials', optional: true },
    { key: 'stickers', optional: true },
    { key: 'review', optional: false },
    { key: 'topic', optional: false },
] as const

const currentStepIndex = ref(0)
const selectable = ref<GroupedTags>({
    [TagType.ROLE]: [], [TagType.LANGUAGE]: [], [TagType.FRAMEWORK]: [],
    [TagType.DATABASE]: [], [TagType.DEVOPS]: [], [TagType.CUSTOM]: [],
})
const tagsError = ref<string | null>(null)
const loadingTags = ref(false)
const tagEditorState = useTagEditorState({ maxPerUser: TAG_MAX })
const tagModalOpen = ref(false)

const furName = ref('')
const avatarColor = ref<string>('#ffffff')
const avatarBorder = ref<boolean>(false)
const avatarDraft = useAvatarUploadDraft()
const avatarInputRef = ref<HTMLInputElement | null>(null)
const selectedSocialLinks = ref<SocialDraft[]>([])
const stickerManagerRef = ref<InstanceType<typeof StickerManager> | null>(null)
const skippedStepKeys = ref<string[]>([])
const wizardActive = ref(false)
const submitting = ref(false)
const submitError = ref<string | null>(null)
const drawingTopic = ref(false)
const drawnTopicContent = ref<string | null>(null)
const drawError = ref<string | null>(null)
const drawCountdown = ref(5)
// 顯示用秒數:clamp 下限 1，避免 interval 在 t=5s 跑到 0 時閃「0 秒」才跳轉
const redirectCountdown = computed(() => Math.max(1, drawCountdown.value))

// 給 TagEditorPreview 用:把 staged draft 攤回 Tag[](real tagId + new custom 用合成 id)
const previewTags = computed<Tag[]>(() => {
    const result: Tag[] = []
    for (const type of TAG_TYPE_ORDER) {
        const arr = selectable.value[type] ?? []
        for (const tag of arr) {
            if (tagEditorState.selectedTagIds.value.has(tag.tagId)) result.push(tag)
        }
        for (const content of tagEditorState.newCustomTags.value.get(type) ?? []) {
            result.push({ tagId: `__new__${type}__${content}`, type, content, isCustom: true })
        }
    }
    return result
})

let redirectTimer: ReturnType<typeof setTimeout> | null = null
let countdownTimer: ReturnType<typeof setInterval> | null = null

const defaultFurName = computed(() => auth.user?.googleName ?? '')
const showOnboarding = computed(() => auth.isLogin && (user.needsOnboarding.value || wizardActive.value))
// 「同步中」fallback：已登入但尚未進 onboarding / 尚未被導去 /chat 的空檔（獨立整頁，無 intro-view 裝飾）
const showSyncFallback = computed(() => auth.isLogin && !showOnboarding.value)
const currentStep = computed(() => steps[currentStepIndex.value])
const currentStepTitle = computed(() => t(`intro.steps.${currentStep.value.key}.title`))
const currentStepDescription = computed(() => t(`intro.steps.${currentStep.value.key}.description`))
const isReviewStep = computed(() => currentStep.value.key === 'review')
const isTopicStep = computed(() => currentStep.value.key === 'topic')
const hasDrawnTopic = computed(() => !!drawnTopicContent.value)
const hasStagedAvatar = computed(() => avatarDraft.file.value !== null)
const avatarPreviewSrc = computed(() => avatarDraft.previewUrl.value ?? resolveAvatarSrc(null))
const avatarPreviewStyle = computed(() => buildAvatarRingStyle(avatarColor.value, avatarBorder.value, 'lg'))

// Per-row social validation
const socialRowValidations = computed(() =>
    selectedSocialLinks.value.map(row => {
        if (!row.platform) return { valid: false as const, reason: 'invalid_url' as const }
        if (!row.links.trim()) return { valid: false as const, reason: 'invalid_url' as const }
        return validateSocialUrl(row.platform, row.links.trim())
    })
)

const allSocialsValid = computed(() =>
    selectedSocialLinks.value.length > 0 &&
    socialRowValidations.value.every(r => r.valid)
)

// touched states per optional step
const touchedAvatar = computed(() => hasStagedAvatar.value || avatarBorder.value)
const touchedTags = computed(() => previewTags.value.length > 0)
const touchedSocials = computed(() => selectedSocialLinks.value.length > 0)
const touchedStickers = computed(() => !!(stickerManagerRef.value?.isDirty))

const currentTouched = computed(() => {
    switch (currentStep.value.key) {
        case 'avatar': return touchedAvatar.value
        case 'tags': return touchedTags.value
        case 'socials': return touchedSocials.value
        case 'stickers': return touchedStickers.value
        default: return false
    }
})


const canNext = computed(() => {
    switch (currentStep.value.key) {
        case 'nickname':
            return !!furName.value.trim()
        case 'socials':
            return allSocialsValid.value
        case 'review':
            return !submitting.value
        case 'topic':
            return false
        default:
            return true
    }
})

function handleGoogleLogin(): void {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    const redirectUri = `${window.location.origin}/oauth2/callback`
    const scope = 'openid email profile'
    const url =
        `https://accounts.google.com/o/oauth2/v2/auth` +
        `?client_id=${clientId}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=code` +
        `&scope=${encodeURIComponent(scope)}`
    window.location.href = url
}

function clearTimers(): void {
    if (redirectTimer) {
        clearTimeout(redirectTimer)
        redirectTimer = null
    }
    if (countdownTimer) {
        clearInterval(countdownTimer)
        countdownTimer = null
    }
}

function markCurrentStepSkipped(): void {
    if (!skippedStepKeys.value.includes(currentStep.value.key)) {
        skippedStepKeys.value = [...skippedStepKeys.value, currentStep.value.key]
    }
}

function clearCurrentStepSkipped(): void {
    skippedStepKeys.value = skippedStepKeys.value.filter(key => key !== currentStep.value.key)
}

// 邊框顏色 hex 文字輸入:原生 <input type=color> 的 RGB/Hex 分頁是 OS chrome 無法控制，
// 故額外提供可編輯 hex 欄位讓 user 直接打/貼。hexInput 跟著 avatarColor（picker 選色或 reset）同步，
// 只有在輸入符合 #RRGGBB 時才寫回 avatarColor，避免打到一半（如 #ab）就清空 swatch。
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/
const hexInput = ref<string>(avatarColor.value)
watch(avatarColor, value => { hexInput.value = value })
function onHexInput(raw: string): void {
    hexInput.value = raw
    if (!HEX_COLOR_RE.test(raw)) return
    avatarColor.value = raw
    clearCurrentStepSkipped()
}

function goNext(): void {
    if (!canNext.value || isReviewStep.value || isTopicStep.value) return
    clearCurrentStepSkipped()
    currentStepIndex.value += 1
}

function goPrev(): void {
    if (currentStepIndex.value === 0 || submitting.value || drawingTopic.value) return
    clearTimers()
    if (isTopicStep.value) {
        drawnTopicContent.value = null
        drawError.value = null
        drawCountdown.value = 5
    }
    currentStepIndex.value -= 1
}

/** Clear current page's draft but stay on this page and do NOT mark skipped */
function resetCurrentStep(): void {
    if (currentStep.value.key === 'avatar') {
        avatarDraft.clearDraft()
        avatarColor.value = '#ffffff'
        avatarBorder.value = false
    }
    if (currentStep.value.key === 'tags') {
        tagEditorState.reset([])
    }
    if (currentStep.value.key === 'socials') {
        selectedSocialLinks.value = []
    }
    if (currentStep.value.key === 'stickers') {
        stickerManagerRef.value?.clearStaging()
    }
}

/** Skip: clear draft + mark skipped + advance */
function skipCurrentStep(): void {
    if (!currentStep.value.optional) return
    resetCurrentStep()
    markCurrentStepSkipped()
    currentStepIndex.value += 1
}

function addSocialRow(): void {
    selectedSocialLinks.value = [...selectedSocialLinks.value, { platform: '', links: '' }]
}

function removeSocialRow(idx: number): void {
    selectedSocialLinks.value.splice(idx, 1)
}

function getSocialErrorMsg(validation: ReturnType<typeof validateSocialUrl>): string {
    if (validation.valid) return ''
    switch (validation.reason) {
        case 'invalid_url': return t('intro.social.invalidUrl')
        case 'unsafe_url': return t('intro.social.unsafe')
        case 'platform_mismatch': return t('intro.social.mismatch')
    }
}

async function loadTags(): Promise<void> {
    loadingTags.value = true
    tagsError.value = null
    try {
        selectable.value = await fetchSelectableTags()
    } catch {
        tagsError.value = t('intro.tags.loadFailed')
    } finally {
        loadingTags.value = false
    }
}

function onTagModalClose(): void {
    tagModalOpen.value = false
    if (previewTags.value.length > 0) clearCurrentStepSkipped()
}

function openAvatarPicker(): void {
    avatarInputRef.value?.click()
}

function onAvatarFileChange(event: Event): void {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    avatarDraft.setCropSource(file)
    input.value = ''
}

async function onAvatarCropConfirm(file: File, cropState?: import('@/types/avatar').AvatarCropState): Promise<void> {
    await avatarDraft.setCroppedResult(file, cropState)
    clearCurrentStepSkipped()
}

async function confirmProfileSetup(): Promise<void> {
    if (submitting.value) return
    submitting.value = true
    submitError.value = null
    try {
        let avatarPath: string | undefined
        const avatarStepConfigured = !skippedStepKeys.value.includes('avatar')
        if (avatarDraft.file.value) {
            avatarPath = (await uploadAvatar(avatarDraft.file.value)).avatarPath
        }

        await user.createProfile({
            furName: furName.value.trim(),
            avatar: avatarPath,
            avatarColor: avatarStepConfigured ? avatarColor.value : undefined,
            avatarBorder: avatarStepConfigured ? avatarBorder.value : undefined,
        })

        const { toAdd, toCreate } = tagEditorState.diff([])
        for (const tagId of toAdd) {
            await user.addTag({ tagId })
        }
        for (const t of toCreate) {
            await user.addTag({ type: t.type, content: t.content })
        }

        for (const socialLink of selectedSocialLinks.value) {
            if (socialLink.platform) {
                await user.addSocialLink({ platform: socialLink.platform, links: socialLink.links })
            }
        }

        if (!skippedStepKeys.value.includes('stickers') && stickerManagerRef.value?.isDirty) {
            await stickerManagerRef.value.saveAll()
        }

        await user.fetchProfile()

        // redrawTopicCard 內部會吞錯並設 user.error（不 rethrow），故改讀結果判斷成敗：
        // 抽卡失敗（topic 為 null）時設 drawError，讓 topic step 顯示錯誤 + 手動進入按鈕，
        // 而非卡在「抽獎中…」。/user/topic-card 已加入 interceptor 白名單故不會被導去 /error。
        await user.redrawTopicCard()
        const topicContent = user.profile.value?.topic?.content ?? null
        if (!topicContent) {
            drawError.value = user.error.value ?? '抽話題卡失敗'
        }
        drawnTopicContent.value = topicContent

        avatarDraft.clearDraft()
        currentStepIndex.value = steps.findIndex(step => step.key === 'topic')

        if (topicContent) {
            drawCountdown.value = 5
            countdownTimer = setInterval(() => {
                drawCountdown.value -= 1
            }, 1000)
            redirectTimer = setTimeout(() => {
                clearTimers()
                router.push('/chat')
            }, 5000)
        }
    } catch {
        submitError.value = user.error.value ?? '建立資料失敗'
    } finally {
        submitting.value = false
    }
}


async function initializeOnboarding(): Promise<void> {
    clearTimers()
    wizardActive.value = true
    currentStepIndex.value = 0
    furName.value = defaultFurName.value
    avatarDraft.clearDraft()
    avatarColor.value = '#ffffff'
    avatarBorder.value = false
    tagEditorState.reset([])
    selectedSocialLinks.value = []
    skippedStepKeys.value = []
    submitError.value = null
    drawnTopicContent.value = null
    drawError.value = null
    drawCountdown.value = 5
    await loadTags()
}

watch(showOnboarding, (visible) => {
    if (!visible) return
    void initializeOnboarding()
}, { immediate: true })

watch(defaultFurName, (nextFurName) => {
    if (!showOnboarding.value) return
    if (currentStep.value.key !== 'nickname') return
    furName.value = nextFurName
})

onBeforeUnmount(() => {
    wizardActive.value = false
    avatarDraft.clearDraft()
    clearTimers()
})
</script>

<template>
    <!-- 「同步中」：獨立整頁（同 GoogleCallback），不套 intro-view 的 stage / 彩蛋 / focus 裝飾 -->
    <LizardLoading v-if="showSyncFallback" message="同步中" :refresh-after-ms="5000" />

    <div v-else class="intro-view" :class="{ 'intro-view--focus': !showOnboarding }">
        <div class="intro-view__stage" :class="{ 'intro-view__stage--focus': !showOnboarding }">
            <img
                v-if="!showOnboarding"
                class="intro-view__easter-egg"
                :src="lizardchiEgg"
                alt=""
                aria-hidden="true"
            />
            <div class="intro-view__panel" :class="{ 'intro-view__panel--focus': !showOnboarding }">
            <div v-if="!auth.isLogin" class="intro-view__login-card">
                <h1 class="intro-view__title">{{ t('intro.login.brand') }}</h1>
                <p class="intro-view__subtitle">{{ t('intro.login.subtitle') }}</p>

                <button class="intro-view__google-btn" @click="handleGoogleLogin">
                    <svg class="intro-view__google-icon" viewBox="0 0 48 48" aria-hidden="true">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                    </svg>
                    <span class="intro-view__google-text">
                        <strong class="intro-view__google-action">{{ t('intro.login.googleAction') }}</strong>
                        <small class="intro-view__google-tagline">{{ t('intro.login.googleTagline') }}</small>
                    </span>
                </button>
            </div>

            <div v-else-if="showOnboarding" class="intro-view__onboarding-card" data-test="onboarding-card">
                <!-- Wizard header -->
                <header class="intro-view__wizard-header">
                    <h1 class="intro-view__wz-title">{{ currentStepTitle }}</h1>
                    <p class="intro-view__wz-sub">
                        {{ currentStepDescription }}
                        <template v-if="currentStep.key === 'nickname'"><br>{{ t('intro.steps.nickname.note') }}</template>
                    </p>
                </header>

                <!-- Nickname step -->
                <section v-if="currentStep.key === 'nickname'" class="intro-view__step-card">
                    <div class="intro-view__nick-wrap">
                        <input
                            data-test="furName"
                            class="intro-view__nick-input"
                            v-model="furName"
                            maxlength="30"
                            autocomplete="nickname"
                            :placeholder="t('intro.placeholders.displayName')" />
                    </div>
                </section>

                <!-- Avatar step -->
                <section v-else-if="currentStep.key === 'avatar'" class="intro-view__step-card">
                    <div class="intro-view__av-grid">
                        <!-- Left: circular avatar with + overlay -->
                        <div class="intro-view__av-photo-wrap" title="點擊上傳/更換" @click="openAvatarPicker">
                            <img
                                class="intro-view__av-photo intro-view__avatar-preview"
                                :src="hasStagedAvatar ? avatarPreviewSrc : defaultAvatarImg"
                                alt="avatar preview"
                                :style="avatarPreviewStyle"
                            />
                            <span v-if="!hasStagedAvatar" class="intro-view__av-plus"><b>＋</b></span>
                        </div>
                        <input
                            ref="avatarInputRef"
                            class="intro-view__file-input"
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            @change="onAvatarFileChange"
                        />

                        <!-- Right: avatar border config -->
                        <div class="intro-view__av-right">
                            <div class="intro-view__av-row">
                                <span class="intro-view__av-lbl">{{ t('intro.options.avatarBorder') }}</span>
                                <div class="intro-view__av-toggle">
                                    <ToggleSwitch
                                        data-test="avatar-border-toggle"
                                        :aria-label="t('intro.options.avatarBorder')"
                                        :model-value="avatarBorder"
                                        @update:model-value="(v: boolean) => { avatarBorder = v; clearCurrentStepSkipped() }"
                                    />
                                </div>
                            </div>
                            <div v-if="avatarBorder" class="intro-view__av-row">
                                <span class="intro-view__av-lbl">{{ t('intro.options.avatarBorderColor') }}</span>
                                <div class="intro-view__swatch">
                                    <input
                                        class="intro-view__color-input intro-view__swatch-circle"
                                        type="color"
                                        :value="avatarColor"
                                        @input="avatarColor = ($event.target as HTMLInputElement).value; clearCurrentStepSkipped()"
                                    />
                                    <input
                                        class="intro-view__color-value intro-view__hex-input"
                                        type="text"
                                        data-test="avatar-border-hex"
                                        :aria-label="t('intro.options.avatarBorderColor')"
                                        :value="hexInput"
                                        maxlength="7"
                                        spellcheck="false"
                                        autocapitalize="off"
                                        placeholder="#RRGGBB"
                                        @input="onHexInput(($event.target as HTMLInputElement).value)"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Tags step -->
                <section v-else-if="currentStep.key === 'tags'" class="intro-view__step-card">
                    <div v-if="loadingTags" class="intro-view__state-text">{{ t('intro.tags.loading') }}</div>
                    <div v-else-if="tagsError" class="intro-view__error-block">
                        <p>{{ tagsError }}</p>
                        <button type="button" @click="loadTags">{{ t('intro.actions.retry') }}</button>
                    </div>
                    <TagEditorPreview
                        v-else
                        :tags="previewTags"
                        @edit="tagModalOpen = true"
                    />
                </section>

                <!-- Socials step -->
                <section v-else-if="currentStep.key === 'socials'" class="intro-view__step-card" data-field="social-links">
                    <div
                        v-for="(row, idx) in selectedSocialLinks"
                        :key="idx"
                        class="intro-view__so-row-wrap"
                    >
                        <div class="intro-view__so-row">
                            <select
                                class="intro-view__so-sel"
                                :data-test="`social-platform-${idx}`"
                                :value="row.platform"
                                @change="row.platform = ($event.target as HTMLSelectElement).value as SocialPlatform | ''"
                            >
                                <option value="">{{ t('intro.social.selectPlatform') }}</option>
                                <option
                                    v-for="p in PLATFORM_LIST"
                                    :key="p.value"
                                    :value="p.value"
                                >{{ p.label }}</option>
                            </select>
                            <input
                                class="intro-view__so-url"
                                :class="{
                                    'intro-view__so-url--ok': row.platform && row.links && socialRowValidations[idx]?.valid,
                                    'intro-view__so-url--bad': row.platform && row.links && !socialRowValidations[idx]?.valid
                                }"
                                type="url"
                                inputmode="url"
                                :data-test="`social-url-${idx}`"
                                v-model="row.links"
                                :placeholder="t('intro.placeholders.socialUrl')"
                            />
                            <button
                                type="button"
                                class="intro-view__so-x"
                                :data-test="`remove-social-${idx}`"
                                @click="removeSocialRow(idx)"
                            >✕</button>
                        </div>
                        <div
                            v-if="row.platform && row.links && !socialRowValidations[idx]?.valid"
                            class="intro-view__so-msg intro-view__so-msg--bad"
                            :data-test="`social-error-${idx}`"
                        >{{ getSocialErrorMsg(socialRowValidations[idx]) }}</div>
                        <div
                            v-else-if="row.platform && row.links && socialRowValidations[idx]?.valid"
                            class="intro-view__so-msg intro-view__so-msg--ok"
                        >✓ 連結有效</div>
                    </div>

                    <button
                        type="button"
                        class="intro-view__so-add"
                        data-test="add-social-link"
                        @click="addSocialRow"
                    >＋ 新增</button>
                </section>

                <!-- Review step: passport layout -->
                <section v-else-if="currentStep.key === 'review'" class="intro-view__step-card intro-view__step-card--passport" data-test="review-passport">
                    <div class="passport">
                        <!-- Inner dashed frame via ::before -->
                        <div class="ps-head">
                            <span class="ps-brand">SEF·CLI</span>
                            <span class="ps-kind">
                                ✈ BOARDING&nbsp;PASS
                                <span class="ps-bars">
                                    <i></i><i></i><i></i><i></i><i></i><i></i>
                                    <i></i><i></i><i></i><i></i><i></i><i></i>
                                </span>
                            </span>
                        </div>

                        <div class="ps-body">
                            <!-- LEFT: avatar + tags -->
                            <div class="ps-left">
                                <div class="ps-photo-wrap" data-test="review-avatar">
                                    <img
                                        class="ps-photo"
                                        :src="avatarPreviewSrc"
                                        alt="avatar"
                                        :style="avatarPreviewStyle"
                                    />
                                    <span class="ps-photo-tick tick-tl"></span>
                                    <span class="ps-photo-tick tick-br"></span>
                                </div>
                                <div class="ps-tags" v-if="previewTags.length > 0">
                                    <p class="ps-tags-label">TAGS</p>
                                    <div class="ps-chiprow">
                                        <span
                                            v-for="tag in previewTags"
                                            :key="tag.tagId"
                                            class="ps-chip"
                                        >{{ tag.content }}</span>
                                    </div>
                                </div>
                            </div>

                            <!-- RIGHT: furname / socials / stickers -->
                            <div class="ps-right">
                                <div>
                                    <p class="ps-furname-label">FUR NAME</p>
                                    <h3 class="ps-furname" data-test="review-furname">{{ furName }}</h3>
                                </div>
                                <div class="ps-section-line"></div>
                                <div v-if="selectedSocialLinks.filter(l => l.platform).length > 0">
                                    <p class="ps-social-label">SOCIAL LINKS</p>
                                    <ul class="ps-social" data-test="review-socials">
                                        <li
                                            v-for="link in selectedSocialLinks.filter(l => l.platform).slice(0, 3)"
                                            :key="link.platform + link.links"
                                        >
                                            <span
                                                class="ps-ic"
                                                :style="{ background: (PLATFORMS[link.platform as SocialPlatform] ?? PLATFORMS.OTHER).brandColor }"
                                                v-html="(PLATFORMS[link.platform as SocialPlatform] ?? PLATFORMS.OTHER).icon"
                                            ></span>
                                            <span class="ps-handle">{{ link.links }}</span>
                                        </li>
                                        <li
                                            v-if="selectedSocialLinks.filter(l => l.platform).length > 3"
                                            class="ps-more"
                                            data-test="review-socials-more"
                                        >more...</li>
                                    </ul>
                                </div>
                                <div v-if="stickerManagerRef?.previews?.length">
                                    <p class="ps-stk-label">STICKERS</p>
                                    <div class="ps-stickers">
                                        <img
                                            v-for="(url, i) in stickerManagerRef.previews"
                                            :key="i"
                                            class="ps-sticker"
                                            :src="url"
                                            alt="sticker"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="ps-stamp" aria-hidden="true">
                            <span class="ps-stamp-l1">SEF-CLI</span>
                            <span class="ps-stamp-l2">for UTFG</span>
                            <span class="ps-stamp-l3">環遊世界</span>
                        </div>
                    </div>
                    <p v-if="submitError" class="intro-view__error-inline">{{ submitError }}</p>
                </section>

                <!-- Topic step: auto-drawn topic card -->
                <section v-else-if="currentStep.key === 'topic'" class="intro-view__step-card intro-view__topic-step">
                    <div v-if="hasDrawnTopic" class="intro-view__topic-result">
                        <p class="tp-eyebrow">{{ t('intro.topic.eyebrow') }}</p>
                        <p class="tp-quote" data-test="topic-content">
                            <b>"</b>{{ drawnTopicContent }}<b>"</b>
                        </p>
                        <p class="tp-tail">{{ t('intro.topic.tail') }}</p>
                        <div class="tp-btn-wrap">
                            <p class="tp-countdown" data-test="topic-countdown">
                                {{ t('intro.topic.redirect', { seconds: redirectCountdown }) }}
                            </p>
                            <button
                                type="button"
                                class="intro-view__wz-btn intro-view__wz-btn--primary"
                                data-test="topic-manual-redirect"
                                @click="router.push('/chat')"
                            >{{ t('intro.topic.manualRedirect') }}</button>
                        </div>
                    </div>

                    <div v-else-if="!drawError" class="intro-view__topic-result">
                        <p class="tp-eyebrow">{{ t('intro.topic.eyebrow') }}</p>
                        <p class="intro-view__state-text">{{ t('intro.topic.drawing') }}</p>
                    </div>

                    <p v-if="drawError" class="intro-view__error-inline" data-test="topic-draw-error">{{ drawError }}</p>
                    <div v-if="drawError" class="tp-btn-wrap">
                        <button
                            type="button"
                            class="intro-view__wz-btn intro-view__wz-btn--primary"
                            data-test="topic-manual-redirect"
                            @click="router.push('/chat')"
                        >{{ t('intro.topic.manualRedirect') }}</button>
                    </div>
                </section>

                <!-- Stickers step (v-show to keep ref alive) -->
                <section v-show="currentStep.key === 'stickers'" class="intro-view__step-card">
                    <StickerManager ref="stickerManagerRef" :initial="[]" />
                </section>

                <!-- Footer action bar -->
                <footer v-if="showOnboarding" class="intro-view__wz-foot">
                    <!-- Left: prev button -->
                    <button
                        v-if="currentStepIndex > 0 && !hasDrawnTopic"
                        type="button"
                        class="intro-view__wz-btn intro-view__wz-btn--ghost"
                        data-test="prev-step"
                        @click="goPrev">
                        {{ t('intro.actions.previous') }}
                    </button>
                    <span v-else></span>

                    <!-- Right: context-sensitive action buttons -->
                    <div class="intro-view__wz-foot-right">
                        <!-- Nickname: single 下一步 (disabled when empty) -->
                        <template v-if="currentStep.key === 'nickname'">
                            <button
                                type="button"
                                class="intro-view__wz-btn intro-view__wz-btn--primary"
                                data-test="next-step"
                                :disabled="!canNext"
                                @click="goNext">
                                {{ t('intro.actions.next') }}
                            </button>
                        </template>

                        <!-- Optional steps (avatar/tags/socials/stickers) -->
                        <template v-else-if="currentStep.optional && !isReviewStep && !isTopicStep">
                            <!-- Untouched: single later-edit/later-fill button -->
                            <template v-if="!currentTouched">
                                <button
                                    v-if="currentStep.key === 'socials'"
                                    type="button"
                                    class="intro-view__wz-btn intro-view__wz-btn--primary"
                                    data-test="later-fill"
                                    @click="skipCurrentStep">
                                    {{ t('intro.actions.laterFill') }}
                                </button>
                                <button
                                    v-else
                                    type="button"
                                    class="intro-view__wz-btn intro-view__wz-btn--primary"
                                    data-test="later-edit"
                                    @click="skipCurrentStep">
                                    {{ t('intro.actions.laterEdit') }}
                                </button>
                            </template>
                            <!-- Touched: reset (ghost) + 下一步 (primary) -->
                            <template v-else>
                                <button
                                    type="button"
                                    class="intro-view__wz-btn intro-view__wz-btn--ghost"
                                    data-test="reset-step"
                                    @click="resetCurrentStep">
                                    {{ t('intro.actions.reset') }}
                                </button>
                                <button
                                    type="button"
                                    class="intro-view__wz-btn intro-view__wz-btn--primary"
                                    data-test="next-step"
                                    :disabled="!canNext"
                                    @click="goNext">
                                    {{ t('intro.actions.next') }}
                                </button>
                            </template>
                        </template>

                        <!-- Review step: 建立資料 -->
                        <template v-else-if="isReviewStep">
                            <button
                                type="button"
                                class="intro-view__wz-btn intro-view__wz-btn--primary"
                                data-test="confirm-create"
                                :disabled="submitting"
                                @click="confirmProfileSetup">
                                {{ submitting ? '建立中...' : t('intro.actions.createProfile') }}
                            </button>
                        </template>

                        <!-- Topic step: no footer buttons -->
                    </div>
                </footer>
            </div>
            </div>
        </div>

        <TagEditorModal
            :open="tagModalOpen"
            :selectable="selectable"
            :state="tagEditorState"
            :max-per-user="TAG_MAX"
            @close="onTagModalClose"
        />

        <AvatarCropModal
            :open="avatarDraft.cropOpen.value"
            :source-url="avatarDraft.sourceUrl.value"
            :initial-zoom="avatarDraft.modalCropState.value?.zoom ?? 1"
            :initial-offset-x="avatarDraft.modalCropState.value?.offsetX ?? 0"
            :initial-offset-y="avatarDraft.modalCropState.value?.offsetY ?? 0"
            output-file-name="avatar.png"
            @close="avatarDraft.cancelCrop()"
            @confirm="onAvatarCropConfirm"
        />
    </div>
</template>
