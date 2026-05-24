<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import './IntroView.css'
import { fetchDefaultTags } from '@/api/userApi'
import { useUser } from '@/composables/useUser'
import { useAuthStore } from '@/stores/auth.ts'
import type { Tag } from '@/types/user'

type SocialDraft = {
    platform: string
    links: string
}

const router = useRouter()
const auth = useAuthStore()
const user = useUser()

const steps = [
    { key: 'nickname', title: '顯示名稱', optional: false },
    { key: 'avatar', title: '頭像與顏色', optional: true },
    { key: 'tags', title: 'TAG', optional: true },
    { key: 'socials', title: '社群連結', optional: true },
    { key: 'stickers', title: '自訂貼圖', optional: true },
    { key: 'review', title: '確認你的設定', optional: false },
    { key: 'topic', title: '話題卡抽獎', optional: false },
] as const

const avatarChoices = [
    { id: 'mock-otter', label: 'Otter' },
    { id: 'mock-fox', label: 'Fox' },
    { id: 'mock-bear', label: 'Bear' },
]

const avatarColorChoices = ['#8c8672', '#c9826b', '#7b9b8f', '#8b78b6']
const stickerChoices = [
    { id: 'mock-bubble-pack', label: '對話泡泡包' },
    { id: 'mock-soft-pack', label: '柔軟貼圖包' },
    { id: 'mock-night-pack', label: '夜聊貼圖包' },
]

const currentStepIndex = ref(0)
const defaultTags = ref<Tag[]>([])
const tagsError = ref<string | null>(null)
const loadingTags = ref(false)

const furName = ref('')
const selectedAvatarId = ref<string | null>(null)
const avatarColor = ref<string>('#8c8672')
const selectedDefaultTagIds = ref<string[]>([])
const customTagInput = ref('')
const selectedCustomTags = ref<string[]>([])
const socialPlatformInput = ref('')
const socialUrlInput = ref('')
const selectedSocialLinks = ref<SocialDraft[]>([])
const selectedStickerId = ref<string | null>(null)
const skippedStepKeys = ref<string[]>([])
const wizardActive = ref(false)
const submitting = ref(false)
const submitError = ref<string | null>(null)
const drawingTopic = ref(false)
const drawnTopicContent = ref<string | null>(null)
const drawError = ref<string | null>(null)
const drawCountdown = ref(5)

let redirectTimer: ReturnType<typeof setTimeout> | null = null
let countdownTimer: ReturnType<typeof setInterval> | null = null

const defaultFurName = computed(() => auth.user?.googleName ?? '')
const showOnboarding = computed(() => auth.isLogin && (user.needsOnboarding.value || wizardActive.value))
const currentStep = computed(() => steps[currentStepIndex.value])
const isReviewStep = computed(() => currentStep.value.key === 'review')
const isTopicStep = computed(() => currentStep.value.key === 'topic')
const canSkipCurrent = computed(() => currentStep.value.optional)
const hasDrawnTopic = computed(() => !!drawnTopicContent.value)

const reviewRows = computed(() => [
    {
        label: '顯示名稱',
        value: furName.value.trim() || '未填寫',
    },
    {
        label: '頭像與顏色',
        value: skippedStepKeys.value.includes('avatar')
            ? '先略過'
            : selectedAvatarId.value
                ? `${selectedAvatarId.value} / ${avatarColor.value}`
                : '未設定',
    },
    {
        label: 'TAG',
        value: selectedDefaultTagIds.value.length || selectedCustomTags.value.length
            ? [
                ...selectedDefaultTagIds.value.map(tagId =>
                    defaultTags.value.find(tag => tag.tagId === tagId)?.content ?? tagId),
                ...selectedCustomTags.value,
            ].join('、')
            : skippedStepKeys.value.includes('tags') ? '先略過' : '未設定',
    },
    {
        label: '社群連結',
        value: selectedSocialLinks.value.length
            ? selectedSocialLinks.value.map(link => `${link.platform}: ${link.links}`).join(' / ')
            : skippedStepKeys.value.includes('socials') ? '先略過' : '未設定',
    },
    {
        label: '自訂貼圖',
        value: selectedStickerId.value ?? (skippedStepKeys.value.includes('stickers') ? '先略過' : '未設定'),
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
        selectedAvatarId.value = null
        avatarColor.value = '#8c8672'
    }
    if (currentStep.value.key === 'tags') {
        selectedDefaultTagIds.value = []
        selectedCustomTags.value = []
        customTagInput.value = ''
    }
    if (currentStep.value.key === 'socials') {
        socialPlatformInput.value = ''
        socialUrlInput.value = ''
        selectedSocialLinks.value = []
    }
    if (currentStep.value.key === 'stickers') {
        selectedStickerId.value = null
    }
    markCurrentStepSkipped()
    currentStepIndex.value += 1
}

async function loadTags(): Promise<void> {
    loadingTags.value = true
    tagsError.value = null
    try {
        defaultTags.value = await fetchDefaultTags()
    } catch {
        tagsError.value = '載入失敗（可略過或重試）'
    } finally {
        loadingTags.value = false
    }
}

function addCustomTag(): void {
    const tag = customTagInput.value.trim()
    if (!tag) return
    selectedCustomTags.value = [...selectedCustomTags.value, tag]
    customTagInput.value = ''
    clearCurrentStepSkipped()
}

function removeCustomTag(idx: number): void {
    selectedCustomTags.value.splice(idx, 1)
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

async function confirmProfileSetup(): Promise<void> {
    if (submitting.value) return
    submitting.value = true
    submitError.value = null
    try {
        await user.createProfile({
            furName: furName.value.trim(),
            avatar: selectedAvatarId.value ?? undefined,
            avatarColor: selectedAvatarId.value ? avatarColor.value : undefined,
        })

        for (const tagId of selectedDefaultTagIds.value) {
            await user.addTag({ tagId })
        }

        for (const content of selectedCustomTags.value) {
            await user.addTag({ type: 'custom', content })
        }

        for (const socialLink of selectedSocialLinks.value) {
            await user.addSocialLink(socialLink)
        }

        await user.fetchProfile()
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
    selectedAvatarId.value = null
    avatarColor.value = '#8c8672'
    selectedDefaultTagIds.value = []
    customTagInput.value = ''
    selectedCustomTags.value = []
    socialPlatformInput.value = ''
    socialUrlInput.value = ''
    selectedSocialLinks.value = []
    selectedStickerId.value = null
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
    clearTimers()
})
</script>

<template>
    <div class="intro-view">
        <div class="intro-view__panel">
            <div v-if="!auth.isLogin" class="intro-view__login-card">
                <span class="intro-view__eyebrow">SEF Chill Lounge</span>
                <h1 class="intro-view__title">先登入，再開始你的聊天之旅。</h1>
                <p class="intro-view__copy">
                    登入後如果還沒建立個人資料，系統會帶你一步一步完成 onboarding。
                </p>

                <button class="intro-view__google-btn" @click="handleGoogleLogin">
                    <img src="https://www.google.com/favicon.ico" alt="Google" />
                    <span>使用 Google 登入</span>
                </button>
            </div>

            <div v-else-if="showOnboarding" class="intro-view__onboarding-card" data-test="onboarding-card">
                <header class="intro-view__wizard-header">
                    <span class="intro-view__eyebrow">Step {{ currentStepIndex + 1 }} / {{ steps.length }}</span>
                    <h1 class="intro-view__title">{{ currentStep.title }}</h1>
                    <p class="intro-view__copy">
                        <template v-if="currentStep.key === 'nickname'">
                            先決定聊天室裡要怎麼顯示你。
                        </template>
                        <template v-else-if="currentStep.key === 'avatar'">
                            這一步先用 mock 頭像與顏色，之後再接真圖床。
                        </template>
                        <template v-else-if="currentStep.key === 'tags'">
                            先補幾個標籤，讓別人比較快認識你。
                        </template>
                        <template v-else-if="currentStep.key === 'socials'">
                            留一個最常用的聯絡方式就夠了，也可以先略過。
                        </template>
                        <template v-else-if="currentStep.key === 'stickers'">
                            這一步先用 mock 自訂貼圖包，之後再換成真上傳流程。
                        </template>
                        <template v-else-if="currentStep.key === 'review'">
                            最後確認一次你剛剛設定的內容。
                        </template>
                        <template v-else>
                            確認完成後，按下抽獎按鈕領取你的起始話題卡。
                        </template>
                    </p>

                    <ol class="intro-view__progress">
                        <li
                            v-for="(step, index) in steps"
                            :key="step.key"
                            :class="[
                                'intro-view__progress-item',
                                { 'intro-view__progress-item--active': index === currentStepIndex },
                                { 'intro-view__progress-item--done': index < currentStepIndex },
                            ]">
                            <span>{{ index + 1 }}</span>
                        </li>
                    </ol>
                </header>

                <section v-if="currentStep.key === 'nickname'" class="intro-view__step-card">
                    <label class="intro-view__field">
                        <span>顯示名稱（furName） <span class="intro-view__required">*</span></span>
                        <input
                            data-test="furName"
                            v-model="furName"
                            maxlength="30"
                            autocomplete="nickname"
                            placeholder="你想在聊天室裡怎麼被看見？" />
                    </label>
                </section>

                <section v-else-if="currentStep.key === 'avatar'" class="intro-view__step-card">
                    <div class="intro-view__option-group">
                        <h2>選一個 mock 頭像</h2>
                        <div class="intro-view__choice-grid">
                            <button
                                v-for="avatar in avatarChoices"
                                :key="avatar.id"
                                type="button"
                                class="intro-view__choice-card"
                                :class="{ 'intro-view__choice-card--selected': selectedAvatarId === avatar.id }"
                                @click="selectedAvatarId = avatar.id; clearCurrentStepSkipped()">
                                <strong>{{ avatar.label }}</strong>
                                <span>{{ avatar.id }}</span>
                            </button>
                        </div>
                    </div>

                    <div class="intro-view__option-group">
                        <h2>選一個頭像顏色</h2>
                        <div class="intro-view__color-row">
                            <button
                                v-for="color in avatarColorChoices"
                                :key="color"
                                type="button"
                                class="intro-view__color-chip"
                                :class="{ 'intro-view__color-chip--selected': avatarColor === color }"
                                :style="{ backgroundColor: color }"
                                @click="avatarColor = color; clearCurrentStepSkipped()" />
                        </div>
                    </div>
                </section>

                <section v-else-if="currentStep.key === 'tags'" class="intro-view__step-card">
                    <div v-if="loadingTags" class="intro-view__state-text">載入標籤中...</div>
                    <div v-else-if="tagsError" class="intro-view__error-block">
                        <p>{{ tagsError }}</p>
                        <button type="button" @click="loadTags">重試</button>
                    </div>
                    <div v-else class="intro-view__default-tags">
                        <label v-for="tag in defaultTags" :key="tag.tagId" class="intro-view__chip-option">
                            <input
                                type="checkbox"
                                :data-test="`tag-${tag.tagId}`"
                                :value="tag.tagId"
                                v-model="selectedDefaultTagIds" />
                            <span>{{ tag.content }}</span>
                        </label>
                    </div>

                    <div class="intro-view__custom-tag">
                        <div class="intro-view__inline-inputs">
                            <input
                                data-test="custom-tag-input"
                                v-model="customTagInput"
                                placeholder="新增自訂 TAG" />
                            <button type="button" data-test="add-custom-tag" @click="addCustomTag">新增</button>
                        </div>
                        <ul>
                            <li v-for="(tag, idx) in selectedCustomTags" :key="idx">
                                <span>{{ tag }}</span>
                                <button
                                    type="button"
                                    :data-test="`remove-custom-${idx}`"
                                    @click="removeCustomTag(idx)">移除</button>
                            </li>
                        </ul>
                    </div>
                </section>

                <section v-else-if="currentStep.key === 'socials'" class="intro-view__step-card" data-field="social-links">
                    <div class="intro-view__social-inputs">
                        <div class="intro-view__inline-inputs intro-view__inline-inputs--double">
                            <input v-model="socialPlatformInput" placeholder="平台，例如 Telegram" />
                            <input v-model="socialUrlInput" placeholder="URL" type="url" inputmode="url" />
                        </div>
                        <button type="button" data-test="add-social-link" @click="addSocialLink">新增社群連結</button>
                    </div>

                    <ul class="intro-view__social-list">
                        <li v-for="(link, idx) in selectedSocialLinks" :key="`${link.platform}-${idx}`">
                            <span>{{ link.platform }}: {{ link.links }}</span>
                            <button
                                type="button"
                                :data-test="`remove-social-${idx}`"
                                @click="removeSocialLink(idx)">移除</button>
                        </li>
                    </ul>
                </section>

                <section v-else-if="currentStep.key === 'stickers'" class="intro-view__step-card">
                    <div class="intro-view__choice-grid">
                        <button
                            v-for="sticker in stickerChoices"
                            :key="sticker.id"
                            type="button"
                            class="intro-view__choice-card"
                            :class="{ 'intro-view__choice-card--selected': selectedStickerId === sticker.id }"
                            @click="selectedStickerId = sticker.id; clearCurrentStepSkipped()">
                            <strong>{{ sticker.label }}</strong>
                            <span>{{ sticker.id }}</span>
                        </button>
                    </div>
                </section>

                <section v-else-if="currentStep.key === 'review'" class="intro-view__step-card">
                    <ul class="intro-view__review-list">
                        <li v-for="row in reviewRows" :key="row.label">
                            <span>{{ row.label }}</span>
                            <strong>{{ row.value }}</strong>
                        </li>
                    </ul>
                    <p v-if="submitError" class="intro-view__error-inline">{{ submitError }}</p>
                </section>

                <section v-else class="intro-view__step-card intro-view__topic-step">
                    <div v-if="!hasDrawnTopic" class="intro-view__topic-prompt">
                        <p>資料已建立完成，現在可以抽出你的第一張話題卡。</p>
                        <button type="button" data-test="draw-topic" :disabled="drawingTopic" @click="drawTopicCard">
                            {{ drawingTopic ? '抽獎中...' : '抽出話題卡' }}
                        </button>
                    </div>

                    <div v-else class="intro-view__topic-result">
                        <span class="intro-view__eyebrow">Draw Result</span>
                        <p class="intro-view__topic-content">{{ drawnTopicContent }}</p>
                        <p class="intro-view__state-text">{{ drawCountdown }} 秒後進入 chat...</p>
                    </div>

                    <p v-if="drawError" class="intro-view__error-inline">{{ drawError }}</p>
                </section>

                <footer v-if="showOnboarding" class="intro-view__wizard-footer">
                    <button
                        v-if="currentStepIndex > 0 && !hasDrawnTopic"
                        type="button"
                        class="intro-view__ghost-btn"
                        data-test="prev-step"
                        @click="goPrev">
                        上一步
                    </button>

                    <div class="intro-view__footer-actions">
                        <button
                            v-if="canSkipCurrent"
                            type="button"
                            class="intro-view__ghost-btn"
                            data-test="skip-step"
                            @click="skipCurrentStep">
                            先略過
                        </button>

                        <button
                            v-if="!isReviewStep && !isTopicStep"
                            type="button"
                            class="intro-view__primary-btn"
                            data-test="next-step"
                            :disabled="!canNext"
                            @click="goNext">
                            下一步
                        </button>

                        <button
                            v-if="isReviewStep"
                            type="button"
                            class="intro-view__primary-btn"
                            data-test="confirm-create"
                            :disabled="submitting"
                            @click="confirmProfileSetup">
                            {{ submitting ? '建立中...' : '確認並建立' }}
                        </button>
                    </div>
                </footer>
            </div>

            <div v-else class="intro-view__login-card">
                <div class="intro-view__state-text">同步中...</div>
            </div>
        </div>
    </div>
</template>
