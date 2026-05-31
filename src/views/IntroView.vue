<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import './IntroView.css'
import { fetchSelectableTags } from '@/api/userApi'
import { uploadAvatar } from '@/api/avatarUploadApi'
import AvatarCropModal from '@/components/AvatarCropModal.vue'
import StickerManager from '@/components/StickerManager.vue'
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

const TAG_MAX = 20

type SocialDraft = {
    platform: string
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
const socialPlatformInput = ref('')
const socialUrlInput = ref('')
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
const currentStep = computed(() => steps[currentStepIndex.value])
const currentStepTitle = computed(() => t(`intro.steps.${currentStep.value.key}.title`))
const currentStepDescription = computed(() => t(`intro.steps.${currentStep.value.key}.description`))
const isReviewStep = computed(() => currentStep.value.key === 'review')
const isTopicStep = computed(() => currentStep.value.key === 'topic')
const canSkipCurrent = computed(() => currentStep.value.optional)
const hasDrawnTopic = computed(() => !!drawnTopicContent.value)
const hasStagedAvatar = computed(() => avatarDraft.file.value !== null)
const avatarPreviewSrc = computed(() => avatarDraft.previewUrl.value ?? resolveAvatarSrc(null))
const avatarButtonLabel = computed(() => hasStagedAvatar.value ? '更換圖片' : '上傳圖片')
const avatarPreviewStyle = computed(() => buildAvatarRingStyle(avatarColor.value, avatarBorder.value, 'lg'))
const avatarPreviewHeadline = computed(() => hasStagedAvatar.value ? '這就是你目前的頭像預覽' : '先調整好你的頭像外觀')
const avatarPreviewDescription = computed(() =>
    hasStagedAvatar.value
        ? '拖曳與縮放後的結果會先暫存，完成註冊時才會正式套用。'
        : '拖曳與縮放，調整你的頭像顯示範圍。你也可以只設定預設頭像與頭像框。')
const reviewAvatarSummary = computed(() => {
    if (skippedStepKeys.value.includes('avatar')) return '這一步已先略過'
    if (hasStagedAvatar.value) return avatarBorder.value ? `已設定裁切頭像與頭像框 ${avatarColor.value}` : '已設定裁切頭像'
    return avatarBorder.value ? `使用預設頭像與頭像框 ${avatarColor.value}` : '使用預設頭像'
})

const reviewRows = computed(() => [
    {
        label: t('intro.review.displayName'),
        value: furName.value.trim() || t('intro.review.unfilled'),
    },
    {
        label: t('intro.review.tags'),
        value: previewTags.value.length
            ? previewTags.value.map(tag => tag.content).join('、')
            : skippedStepKeys.value.includes('tags') ? t('intro.review.skipped') : t('intro.review.empty'),
    },
    {
        label: t('intro.review.socials'),
        value: selectedSocialLinks.value.length
            ? selectedSocialLinks.value.map(link => `${link.platform}: ${link.links}`).join(' / ')
            : skippedStepKeys.value.includes('socials') ? t('intro.review.skipped') : t('intro.review.empty'),
    },
    {
        label: t('intro.review.stickers'),
        value: skippedStepKeys.value.includes('stickers')
            ? t('intro.review.skipped')
            : stickerManagerRef.value?.isDirty
                ? t('intro.review.stickersSelected')
                : t('intro.review.empty'),
    },
])

const canNext = computed(() => {
    switch (currentStep.value.key) {
        case 'nickname':
            return !!furName.value.trim()
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

function skipCurrentStep(): void {
    if (!canSkipCurrent.value) return
    if (currentStep.value.key === 'avatar') {
        avatarDraft.clearDraft()
        avatarColor.value = '#ffffff'
        avatarBorder.value = false
    }
    if (currentStep.value.key === 'tags') {
        tagEditorState.reset([])
    }
    if (currentStep.value.key === 'socials') {
        socialPlatformInput.value = ''
        socialUrlInput.value = ''
        selectedSocialLinks.value = []
    }
    if (currentStep.value.key === 'stickers') {
        stickerManagerRef.value?.clearStaging()
    }
    markCurrentStepSkipped()
    currentStepIndex.value += 1
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

function addSocialLink(): void {
    const platform = socialPlatformInput.value.trim()
    const links = socialUrlInput.value.trim()
    if (!platform || !links) return
    selectedSocialLinks.value = [...selectedSocialLinks.value, { platform, links }]
    socialPlatformInput.value = ''
    socialUrlInput.value = ''
    clearCurrentStepSkipped()
}

function removeSocialLink(idx: number): void {
    selectedSocialLinks.value.splice(idx, 1)
}

function openAvatarPicker(): void {
    avatarInputRef.value?.click()
}

function reopenAvatarCrop(): void {
    avatarDraft.reopenCrop()
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
            await user.addSocialLink(socialLink)
        }

        if (!skippedStepKeys.value.includes('stickers') && stickerManagerRef.value?.isDirty) {
            await stickerManagerRef.value.saveAll()
        }

        await user.fetchProfile()
        avatarDraft.clearDraft()
        currentStepIndex.value = steps.findIndex(step => step.key === 'topic')
    } catch {
        submitError.value = user.error.value ?? '建立資料失敗'
    } finally {
        submitting.value = false
    }
}

async function drawTopicCard(): Promise<void> {
    if (drawingTopic.value) return
    drawingTopic.value = true
    drawError.value = null
    clearTimers()
    try {
        await user.redrawTopicCard()
        const topicContent = user.profile.value?.topic?.content
        if (!topicContent) {
            drawError.value = user.error.value ?? '抽話題卡失敗'
            return
        }
        drawnTopicContent.value = topicContent
        drawCountdown.value = 5
        countdownTimer = setInterval(() => {
            drawCountdown.value -= 1
        }, 1000)
        redirectTimer = setTimeout(() => {
            clearTimers()
            router.push('/chat')
        }, 5000)
    } finally {
        drawingTopic.value = false
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
    socialPlatformInput.value = ''
    socialUrlInput.value = ''
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
    <div class="intro-view">
        <div class="intro-view__panel">
            <div v-if="!auth.isLogin" class="intro-view__login-card">
                <h1 class="intro-view__title">{{ t('intro.login.brand') }}</h1>
                <p class="intro-view__subtitle">{{ t('intro.login.subtitle') }}</p>

                <button class="intro-view__google-btn" @click="handleGoogleLogin">
                    <img src="https://www.google.com/favicon.ico" alt="Google" />
                    <span>{{ t('intro.login.googleAction') }}</span>
                </button>
            </div>

            <div v-else-if="showOnboarding" class="intro-view__onboarding-card" data-test="onboarding-card">
                <header class="intro-view__wizard-header">
                    <h1 class="intro-view__title">{{ currentStepTitle }}</h1>
                    <p class="intro-view__copy">{{ currentStepDescription }}</p>
                </header>

                <section v-if="currentStep.key === 'nickname'" class="intro-view__step-card">
                    <label class="intro-view__field">
                        <span>{{ t('intro.fields.displayName') }} <span class="intro-view__required">*</span></span>
                        <input
                            data-test="furName"
                            v-model="furName"
                            maxlength="30"
                            autocomplete="nickname"
                            :placeholder="t('intro.placeholders.displayName')" />
                    </label>
                </section>

                <section v-else-if="currentStep.key === 'avatar'" class="intro-view__step-card">
                    <div class="intro-view__option-group">
                        <h2>{{ t('intro.options.avatar') }}</h2>
                        <div class="intro-view__avatar-editor">
                            <div class="intro-view__avatar-stage">
                                <img
                                    class="intro-view__avatar-preview"
                                    :src="avatarPreviewSrc"
                                    alt="avatar preview"
                                    :style="avatarPreviewStyle"
                                />
                            </div>
                            <div class="intro-view__avatar-config">
                                <div class="intro-view__avatar-copy">
                                    <strong>{{ avatarPreviewHeadline }}</strong>
                                    <span>{{ avatarPreviewDescription }}</span>
                                </div>
                                <button
                                    type="button"
                                    class="intro-view__choice-card intro-view__choice-card--upload"
                                    @click="openAvatarPicker"
                                >
                                    <strong>{{ avatarButtonLabel }}</strong>
                                    <span>{{ hasStagedAvatar ? '改用另一張圖片重新裁切' : '支援 PNG / JPG / WEBP' }}</span>
                                </button>
                                <button
                                    v-if="hasStagedAvatar"
                                    type="button"
                                    class="intro-view__choice-card intro-view__choice-card--upload intro-view__choice-card--secondary"
                                    @click="reopenAvatarCrop"
                                >
                                    <strong>重新裁切</strong>
                                    <span>延續目前結果再微調位置與縮放</span>
                                </button>
                                <input
                                    ref="avatarInputRef"
                                    class="intro-view__file-input"
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    @change="onAvatarFileChange"
                                />
                            </div>
                        </div>
                    </div>

                    <div class="intro-view__option-group">
                        <h2>{{ t('intro.options.avatarBorder') }}</h2>
                        <div class="intro-view__border-row">
                            <div class="intro-view__border-enable">
                                <span class="intro-view__sublabel">{{ t('intro.options.avatarBorderEnable') }}</span>
                                <ToggleSwitch
                                    data-test="avatar-border-toggle"
                                    :aria-label="t('intro.options.avatarBorder')"
                                    :model-value="avatarBorder"
                                    @update:model-value="(v: boolean) => { avatarBorder = v; clearCurrentStepSkipped() }"
                                />
                            </div>
                            <div v-if="avatarBorder" class="intro-view__border-color">
                                <span class="intro-view__sublabel">{{ t('intro.options.avatarBorderColor') }}</span>
                                <input
                                    class="intro-view__color-input"
                                    type="color"
                                    :value="avatarColor"
                                    @input="avatarColor = ($event.target as HTMLInputElement).value; clearCurrentStepSkipped()"
                                />
                                <span class="intro-view__color-value">{{ avatarColor }}</span>
                            </div>
                        </div>
                    </div>
                </section>

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

                <section v-else-if="currentStep.key === 'socials'" class="intro-view__step-card" data-field="social-links">
                    <div class="intro-view__social-inputs">
                        <div class="intro-view__inline-inputs intro-view__inline-inputs--double">
                            <input v-model="socialPlatformInput" :placeholder="t('intro.placeholders.socialPlatform')" />
                            <input v-model="socialUrlInput" :placeholder="t('intro.placeholders.socialUrl')" type="url" inputmode="url" />
                        </div>
                        <button type="button" data-test="add-social-link" @click="addSocialLink">{{ t('intro.actions.addSocialLink') }}</button>
                    </div>

                    <ul class="intro-view__social-list">
                        <li v-for="(link, idx) in selectedSocialLinks" :key="`${link.platform}-${idx}`">
                            <span>{{ link.platform }}: {{ link.links }}</span>
                            <button
                                type="button"
                                :data-test="`remove-social-${idx}`"
                                @click="removeSocialLink(idx)">{{ t('intro.actions.remove') }}</button>
                        </li>
                    </ul>
                </section>

                <section v-else-if="currentStep.key === 'review'" class="intro-view__step-card">
                    <div class="intro-view__review-avatar-card" data-test="review-avatar">
                        <img
                            class="intro-view__review-avatar-image"
                            :src="avatarPreviewSrc"
                            alt="review avatar preview"
                            :style="avatarPreviewStyle"
                        />
                        <div class="intro-view__review-avatar-copy">
                            <span>頭像預覽</span>
                            <strong>{{ reviewAvatarSummary }}</strong>
                        </div>
                    </div>
                    <ul class="intro-view__review-list">
                        <li v-for="row in reviewRows" :key="row.label">
                            <span>{{ row.label }}</span>
                            <strong>{{ row.value }}</strong>
                        </li>
                    </ul>
                    <p v-if="submitError" class="intro-view__error-inline">{{ submitError }}</p>
                </section>

                <section v-else-if="currentStep.key === 'topic'" class="intro-view__step-card intro-view__topic-step">
                    <div v-if="!hasDrawnTopic" class="intro-view__topic-prompt">
                        <p>{{ t('intro.topic.prompt') }}</p>
                        <button type="button" data-test="draw-topic" :disabled="drawingTopic" @click="drawTopicCard">
                            {{ drawingTopic ? t('intro.topic.drawing') : t('intro.topic.drawButton') }}
                        </button>
                    </div>

                    <div v-else class="intro-view__topic-result">
                        <span class="intro-view__eyebrow">{{ t('intro.topic.result') }}</span>
                        <p class="intro-view__topic-content">{{ drawnTopicContent }}</p>
                        <p class="intro-view__state-text">{{ t('intro.topic.redirect', { seconds: drawCountdown }) }}</p>
                    </div>

                    <p v-if="drawError" class="intro-view__error-inline">{{ drawError }}</p>
                </section>

                <section v-show="currentStep.key === 'stickers'" class="intro-view__step-card">
                    <StickerManager ref="stickerManagerRef" :initial="[]" />
                </section>

                <footer v-if="showOnboarding" class="intro-view__wizard-footer">
                    <button
                        v-if="currentStepIndex > 0 && !hasDrawnTopic"
                        type="button"
                        class="intro-view__ghost-btn"
                        data-test="prev-step"
                        @click="goPrev">
                        {{ t('intro.actions.previous') }}
                    </button>

                    <div class="intro-view__footer-actions">
                        <button
                            v-if="canSkipCurrent"
                            type="button"
                            class="intro-view__ghost-btn"
                            data-test="skip-step"
                            @click="skipCurrentStep">
                            {{ t('intro.actions.skip') }}
                        </button>

                        <button
                            v-if="!isReviewStep && !isTopicStep"
                            type="button"
                            class="intro-view__primary-btn"
                            data-test="next-step"
                            :disabled="!canNext"
                            @click="goNext">
                            {{ t('intro.actions.next') }}
                        </button>

                        <button
                            v-if="isReviewStep"
                            type="button"
                            class="intro-view__primary-btn"
                            data-test="confirm-create"
                            :disabled="submitting"
                            @click="confirmProfileSetup">
                            {{ submitting ? '建立中...' : t('intro.actions.confirmCreate') }}
                        </button>
                    </div>
                </footer>
            </div>

            <div v-else class="intro-view__login-card">
                <div class="intro-view__state-text">同步中...</div>
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
