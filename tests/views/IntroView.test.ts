import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { h, ref } from 'vue'
import { createAppI18n } from '@/i18n'

vi.mock('@/api/userApi', () => ({
    fetchSelectableTags: vi.fn(),
}))

const pushWarningSpy = vi.fn()
vi.mock('notivue', () => ({
    push: {
        warning: (...args: unknown[]) => pushWarningSpy(...args),
        success: vi.fn(),
        error: vi.fn(),
    },
}))

const { uploadAvatarMock, stickerSaveAllSpy, stickerClearSpy } = vi.hoisted(() => ({
    uploadAvatarMock: vi.fn().mockResolvedValue({ avatarPath: '/user/u-uploaded.png' }),
    stickerSaveAllSpy: vi.fn().mockResolvedValue(undefined),
    stickerClearSpy: vi.fn(),
}))

vi.mock('@/api/avatarUploadApi', () => ({
    uploadAvatar: uploadAvatarMock,
}))

vi.mock('@/components/StickerManager.vue', () => ({
    default: {
        name: 'StickerManager',
        props: ['initial'],
        setup(_: unknown, { expose }: { expose: (exposed: Record<string, unknown>) => void }) {
            expose({ isDirty: true, saveAll: stickerSaveAllSpy, clearStaging: stickerClearSpy })
            return () => h('div', { 'data-test': 'sticker-manager-mock' })
        },
    },
}))

const createProfileMock = vi.fn().mockImplementation(async () => {
    needsOnboardingRef.value = false
})
const addTagMock = vi.fn().mockResolvedValue(true)
const addSocialLinkMock = vi.fn().mockResolvedValue(true)
const fetchProfileMock = vi.fn().mockResolvedValue(undefined)
const redrawTopicCardMock = vi.fn().mockImplementation(async () => {
    profileRef.value = {
        ...(profileRef.value ?? {}),
        topicId: 't-draw',
        topic: { topicId: 't-draw', content: '今晚想一起聊什麼？' },
    }
})
const routerPushMock = vi.fn()

const profileRef = ref<any>(null)
const needsOnboardingRef = ref(false)
const userErrorRef = ref<string | null>(null)
const authState = {
    isLogin: false,
    user: null as any,
}

vi.mock('@/composables/useUser', () => ({
    useUser: () => ({
        profile: profileRef,
        needsOnboarding: needsOnboardingRef,
        createProfile: createProfileMock,
        addTag: addTagMock,
        addSocialLink: addSocialLinkMock,
        fetchProfile: fetchProfileMock,
        redrawTopicCard: redrawTopicCardMock,
        error: userErrorRef,
    }),
}))

vi.mock('@/stores/auth.ts', () => ({
    useAuthStore: () => authState,
}))

vi.mock('vue-router', () => ({
    useRouter: () => ({
        push: routerPushMock,
    }),
}))

import * as api from '@/api/userApi'
import AvatarCropModal from '@/components/AvatarCropModal.vue'
import IntroView from '@/views/IntroView.vue'

function mountIntroView() {
    return mount(IntroView, {
        global: {
            plugins: [createAppI18n()],
        },
    })
}

/** Navigate from nickname to avatar (next-step click) */
async function goToAvatar(wrapper: ReturnType<typeof mountIntroView>) {
    await wrapper.find('[data-test=next-step]').trigger('click')
    await flushPromises()
}

/**
 * Advance through optional steps using skip (later-edit / later-fill).
 * Steps: avatar → skip, tags → skip, socials → skip (later-fill), stickers → skip
 * Lands on review.
 */
async function skipOptionalStepsToReview(wrapper: ReturnType<typeof mountIntroView>) {
    // avatar (untouched → later-edit)
    await wrapper.find('[data-test=later-edit]').trigger('click')
    await flushPromises()
    // tags (untouched → later-edit)
    await wrapper.find('[data-test=later-edit]').trigger('click')
    await flushPromises()
    // socials (untouched → later-fill)
    await wrapper.find('[data-test=later-fill]').trigger('click')
    await flushPromises()
    // stickers — mock always has isDirty:true, so it's touched → reset-step + next-step
    // advance via next-step
    await wrapper.find('[data-test=next-step]').trigger('click')
    await flushPromises()
}

/** Full advance to review with all optional steps skipped (avatar/tags/socials skipped, stickers advanced via next-step) */
async function advanceToReview(wrapper: ReturnType<typeof mountIntroView>) {
    // nickname → avatar
    await wrapper.find('[data-test=next-step]').trigger('click')
    await flushPromises()
    await skipOptionalStepsToReview(wrapper)
}

describe('IntroView', () => {
    let originalLocation: Location

    beforeEach(() => {
        originalLocation = window.location
        delete (window as unknown as { location?: Location }).location
        ;(window as unknown as { location: Partial<Location> }).location = {
            origin: 'http://localhost:9045',
            href: '',
        }

        Object.defineProperty(URL, 'createObjectURL', {
            configurable: true,
            writable: true,
            value: vi.fn(() => 'blob:http://localhost/staged-avatar'),
        })
        Object.defineProperty(URL, 'revokeObjectURL', {
            configurable: true,
            writable: true,
            value: vi.fn(),
        })

        vi.clearAllMocks()
        vi.unstubAllEnvs()

        authState.isLogin = false
        authState.user = null
        profileRef.value = null
        needsOnboardingRef.value = false
        userErrorRef.value = null
        redrawTopicCardMock.mockImplementation(async () => {
            profileRef.value = {
                ...(profileRef.value ?? {}),
                topicId: 't-draw',
                topic: { topicId: 't-draw', content: '今晚想一起聊什麼？' },
            }
        })

        ;(api.fetchSelectableTags as any).mockResolvedValue({
            ROLE: [],
            LANGUAGE: [
                { tagId: 'tg-001', type: 'LANGUAGE', content: '宅', isCustom: false },
                { tagId: 'tg-002', type: 'LANGUAGE', content: '貓派', isCustom: false },
            ],
            FRAMEWORK: [],
            DATABASE: [],
            DEVOPS: [],
            CUSTOM: [],
        })
    })

    afterEach(() => {
        ;(window as unknown as { location: Location }).location = originalLocation
    })

    it('renders google login button when logged out', () => {
        const wrapper = mountIntroView()
        const buttons = wrapper.findAll('button')
        expect(buttons.length).toBe(1)
        expect(buttons[0].classes()).toContain('intro-view__google-btn')
        expect(wrapper.text()).toContain('SEF-CLI')
        expect(wrapper.text()).toContain('軟體工程獸互動系統')
        expect(wrapper.text()).toContain('使用 Google 登入')
        expect(wrapper.text()).toContain('與軟體工程獸們互動')
    })

    it('clicking login button sends user to Google OAuth', async () => {
        vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'test-client-id')
        const wrapper = mountIntroView()

        await wrapper.find('button').trigger('click')

        const href = (window as unknown as { location: { href: string } }).location.href
        expect(href).toContain('https://accounts.google.com/o/oauth2/v2/auth')
        expect(href).toContain('client_id=test-client-id')
        expect(href).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A9045%2Foauth2%2Fcallback')
    })

    it('renders onboarding wizard first step on / when logged in and profile is missing', async () => {
        authState.isLogin = true
        authState.user = { providerUserId: 'u-mock', googleName: 'Google Fox' }
        needsOnboardingRef.value = true

        const wrapper = mountIntroView()
        await flushPromises()

        expect(wrapper.find('[data-test=onboarding-card]').exists()).toBe(true)
        expect(wrapper.text()).toContain('如何稱呼您？')
        expect(wrapper.text()).not.toContain('Step 1 / 7')
        expect(wrapper.find('[data-test=username]').exists()).toBe(false)
        expect(wrapper.text()).not.toContain('furName')
        expect(wrapper.find<HTMLInputElement>('[data-test=furName]').element.value).toBe('Google Fox')
        expect(wrapper.find('[data-test=next-step]').exists()).toBe(true)
    })

    // =========================================================
    // State machine: nickname step
    // =========================================================

    it('nickname step: next-step disabled when furName is empty', async () => {
        authState.isLogin = true
        authState.user = { providerUserId: 'u-mock', googleName: '' }
        needsOnboardingRef.value = true

        const wrapper = mountIntroView()
        await flushPromises()

        // Clear input
        await wrapper.find('[data-test=furName]').setValue('')
        await flushPromises()

        const nextBtn = wrapper.find('[data-test=next-step]')
        expect(nextBtn.exists()).toBe(true)
        expect((nextBtn.element as HTMLButtonElement).disabled).toBe(true)
    })

    it('nickname step: next-step enabled when furName has value', async () => {
        authState.isLogin = true
        authState.user = { providerUserId: 'u-mock', googleName: 'Google Fox' }
        needsOnboardingRef.value = true

        const wrapper = mountIntroView()
        await flushPromises()

        const nextBtn = wrapper.find('[data-test=next-step]')
        expect((nextBtn.element as HTMLButtonElement).disabled).toBe(false)
    })

    it('nickname step: no later-edit or skip button', async () => {
        authState.isLogin = true
        authState.user = { providerUserId: 'u-mock', googleName: 'Google Fox' }
        needsOnboardingRef.value = true

        const wrapper = mountIntroView()
        await flushPromises()

        expect(wrapper.find('[data-test=later-edit]').exists()).toBe(false)
        expect(wrapper.find('[data-test=later-fill]').exists()).toBe(false)
        expect(wrapper.find('[data-test=reset-step]').exists()).toBe(false)
        expect(wrapper.find('[data-test=skip-step]').exists()).toBe(false)
    })

    // =========================================================
    // State machine: optional step untouched → later-edit/later-fill
    // =========================================================

    it('avatar step: untouched shows later-edit (no next-step, no reset)', async () => {
        authState.isLogin = true
        authState.user = { providerUserId: 'u-mock', googleName: 'Google Fox' }
        needsOnboardingRef.value = true

        const wrapper = mountIntroView()
        await flushPromises()
        await goToAvatar(wrapper)

        expect(wrapper.find('[data-test=later-edit]').exists()).toBe(true)
        expect(wrapper.find('[data-test=next-step]').exists()).toBe(false)
        expect(wrapper.find('[data-test=reset-step]').exists()).toBe(false)
    })

    it('tags step: untouched shows later-edit', async () => {
        authState.isLogin = true
        authState.user = { providerUserId: 'u-mock', googleName: 'Google Fox' }
        needsOnboardingRef.value = true

        const wrapper = mountIntroView()
        await flushPromises()
        await goToAvatar(wrapper)
        // skip avatar
        await wrapper.find('[data-test=later-edit]').trigger('click')
        await flushPromises()

        expect(wrapper.find('[data-test=later-edit]').exists()).toBe(true)
        expect(wrapper.find('[data-test=next-step]').exists()).toBe(false)
    })

    it('socials step: untouched shows later-fill (not later-edit)', async () => {
        authState.isLogin = true
        authState.user = { providerUserId: 'u-mock', googleName: 'Google Fox' }
        needsOnboardingRef.value = true

        const wrapper = mountIntroView()
        await flushPromises()
        await goToAvatar(wrapper)
        await wrapper.find('[data-test=later-edit]').trigger('click')
        await flushPromises()
        await wrapper.find('[data-test=later-edit]').trigger('click')
        await flushPromises()

        expect(wrapper.find('[data-test=later-fill]').exists()).toBe(true)
        expect(wrapper.find('[data-test=later-edit]').exists()).toBe(false)
        expect(wrapper.find('[data-test=next-step]').exists()).toBe(false)
    })

    // =========================================================
    // State machine: optional step touched → reset + next-step
    // =========================================================

    it('avatar step: enabling border makes it touched → shows reset-step + next-step', async () => {
        authState.isLogin = true
        authState.user = { providerUserId: 'u-mock', googleName: 'Google Fox' }
        needsOnboardingRef.value = true

        const wrapper = mountIntroView()
        await flushPromises()
        await goToAvatar(wrapper)

        // Enable border → touched
        await wrapper.find('[data-test=avatar-border-toggle] input').setValue(true)
        await flushPromises()

        expect(wrapper.find('[data-test=reset-step]').exists()).toBe(true)
        expect(wrapper.find('[data-test=next-step]').exists()).toBe(true)
        expect(wrapper.find('[data-test=later-edit]').exists()).toBe(false)
    })

    it('avatar step: reset-step returns to untouched state (later-edit reappears)', async () => {
        authState.isLogin = true
        authState.user = { providerUserId: 'u-mock', googleName: 'Google Fox' }
        needsOnboardingRef.value = true

        const wrapper = mountIntroView()
        await flushPromises()
        await goToAvatar(wrapper)

        // Touch: enable border
        await wrapper.find('[data-test=avatar-border-toggle] input').setValue(true)
        await flushPromises()

        expect(wrapper.find('[data-test=reset-step]').exists()).toBe(true)

        // Reset
        await wrapper.find('[data-test=reset-step]').trigger('click')
        await flushPromises()

        // Should return to untouched: later-edit shown, no next/reset
        expect(wrapper.find('[data-test=later-edit]').exists()).toBe(true)
        expect(wrapper.find('[data-test=reset-step]').exists()).toBe(false)
        expect(wrapper.find('[data-test=next-step]').exists()).toBe(false)
    })

    // =========================================================
    // Socials: per-row validation state machine
    // =========================================================

    it('socials: adding a row makes it touched; empty platform+url → next-step disabled', async () => {
        authState.isLogin = true
        authState.user = { providerUserId: 'u-mock', googleName: 'Google Fox' }
        needsOnboardingRef.value = true

        const wrapper = mountIntroView()
        await flushPromises()
        await goToAvatar(wrapper)
        await wrapper.find('[data-test=later-edit]').trigger('click')
        await flushPromises()
        await wrapper.find('[data-test=later-edit]').trigger('click')
        await flushPromises()
        // Now on socials
        await wrapper.find('[data-test=add-social-link]').trigger('click')
        await flushPromises()

        // touched → shows next-step (and reset-step), but disabled
        expect(wrapper.find('[data-test=next-step]').exists()).toBe(true)
        expect((wrapper.find('[data-test=next-step]').element as HTMLButtonElement).disabled).toBe(true)
        expect(wrapper.find('[data-test=later-fill]').exists()).toBe(false)
    })

    it('socials: valid row enables next-step', async () => {
        authState.isLogin = true
        authState.user = { providerUserId: 'u-mock', googleName: 'Google Fox' }
        needsOnboardingRef.value = true

        const wrapper = mountIntroView()
        await flushPromises()
        await goToAvatar(wrapper)
        await wrapper.find('[data-test=later-edit]').trigger('click')
        await flushPromises()
        await wrapper.find('[data-test=later-edit]').trigger('click')
        await flushPromises()
        // On socials
        await wrapper.find('[data-test=add-social-link]').trigger('click')
        await flushPromises()

        // Select platform X and enter valid X URL
        await wrapper.find('[data-test=social-platform-0]').setValue('X')
        await wrapper.find('[data-test=social-url-0]').setValue('https://x.com/googlefox')
        await flushPromises()

        expect((wrapper.find('[data-test=next-step]').element as HTMLButtonElement).disabled).toBe(false)
    })

    it('socials: mismatched URL blocks next-step and shows error', async () => {
        authState.isLogin = true
        authState.user = { providerUserId: 'u-mock', googleName: 'Google Fox' }
        needsOnboardingRef.value = true

        const wrapper = mountIntroView()
        await flushPromises()
        await goToAvatar(wrapper)
        await wrapper.find('[data-test=later-edit]').trigger('click')
        await flushPromises()
        await wrapper.find('[data-test=later-edit]').trigger('click')
        await flushPromises()
        // On socials
        await wrapper.find('[data-test=add-social-link]').trigger('click')
        await flushPromises()

        // GITHUB platform but x.com URL → mismatch
        await wrapper.find('[data-test=social-platform-0]').setValue('GITHUB')
        await wrapper.find('[data-test=social-url-0]').setValue('https://x.com/googlefox')
        await flushPromises()

        expect((wrapper.find('[data-test=next-step]').element as HTMLButtonElement).disabled).toBe(true)
        expect(wrapper.find('[data-test=social-error-0]').exists()).toBe(true)
        expect(wrapper.find('[data-test=social-error-0]').text()).toContain('與所選平台')
    })

    it('socials: later-fill (untouched) skips the step', async () => {
        authState.isLogin = true
        authState.user = { providerUserId: 'u-mock', googleName: 'Google Fox' }
        needsOnboardingRef.value = true

        const wrapper = mountIntroView()
        await flushPromises()
        await goToAvatar(wrapper)
        await wrapper.find('[data-test=later-edit]').trigger('click')
        await flushPromises()
        await wrapper.find('[data-test=later-edit]').trigger('click')
        await flushPromises()
        // On socials — no rows → later-fill shown
        expect(wrapper.find('[data-test=later-fill]').exists()).toBe(true)

        await wrapper.find('[data-test=later-fill]').trigger('click')
        await flushPromises()

        // Should advance to stickers
        expect(wrapper.find('[data-test=sticker-manager-mock]').exists()).toBe(true)
    })

    // =========================================================
    // Avatar step: upload and crop flow
    // =========================================================

    it('avatar step removes mock choices and shows image upload entry', async () => {
        authState.isLogin = true
        authState.user = { providerUserId: 'u-mock', googleName: 'Google Fox' }
        needsOnboardingRef.value = true

        const wrapper = mountIntroView()
        await flushPromises()

        await goToAvatar(wrapper)

        expect(wrapper.text()).not.toContain('mock-otter')
        expect(wrapper.text()).not.toContain('mock-fox')
        expect(wrapper.text()).not.toContain('mock-bear')
        expect(wrapper.text()).toContain('支援 PNG / JPG / WEBP')
        expect(wrapper.text()).not.toContain('GIF')
        expect(wrapper.text()).toContain('點擊頭像可上傳或更換')
        expect(wrapper.find('input[type="file"]').attributes('accept')).toBe('image/png,image/jpeg,image/webp')
        expect(wrapper.find('.intro-view__avatar-preview').exists()).toBe(true)
    })

    it('有 staged avatar 時不顯示更換/重新裁切按鈕，點擊頭像可重新上傳', async () => {
        authState.isLogin = true
        authState.user = { providerUserId: 'u-mock', googleName: 'Google Fox' }
        needsOnboardingRef.value = true

        const wrapper = mountIntroView()
        await flushPromises()

        await goToAvatar(wrapper)

        const avatarInput = wrapper.find('input[type="file"]')
        const sourceFile = new File(['avatar-source'], 'avatar-source.png', { type: 'image/png' })
        Object.defineProperty(avatarInput.element, 'files', {
            configurable: true,
            value: [sourceFile],
        })
        await avatarInput.trigger('change')
        await flushPromises()

        const cropModal = wrapper.findComponent(AvatarCropModal)
        cropModal.vm.$emit('confirm', new File(['avatar-cropped'], 'avatar.png', { type: 'image/png' }))
        await flushPromises()

        expect(wrapper.text()).not.toContain('更換圖片')
        expect(wrapper.text()).not.toContain('重新裁切')

        // 點擊頭像會再次開啟檔案選擇（重新上傳）
        const clickSpy = vi.spyOn(avatarInput.element as HTMLInputElement, 'click')
        await wrapper.find('.intro-view__av-photo-wrap').trigger('click')
        expect(clickSpy).toHaveBeenCalled()
    })

    it('confirm 完成時若有 staged avatar,會先 uploadAvatar 再 createProfile 並帶 avatarPath', async () => {
        vi.useFakeTimers()
        authState.isLogin = true
        authState.user = { providerUserId: 'u-mock', googleName: 'Google Fox' }
        needsOnboardingRef.value = true

        const wrapper = mountIntroView()
        await flushPromises()

        await goToAvatar(wrapper)

        const avatarInput = wrapper.find('input[type="file"]')
        const sourceFile = new File(['avatar-source'], 'avatar-source.png', { type: 'image/png' })
        Object.defineProperty(avatarInput.element, 'files', {
            configurable: true,
            value: [sourceFile],
        })
        await avatarInput.trigger('change')
        await flushPromises()

        const cropModal = wrapper.findComponent(AvatarCropModal)
        expect(cropModal.exists()).toBe(true)
        const croppedFile = new File(['avatar-cropped'], 'avatar.png', { type: 'image/png' })
        cropModal.vm.$emit('confirm', croppedFile)
        await flushPromises()

        // avatar is now touched → next-step visible
        await wrapper.find('[data-test=next-step]').trigger('click')
        await flushPromises()

        // tags: untouched → later-edit
        await wrapper.find('[data-test=later-edit]').trigger('click')
        await flushPromises()

        // socials: open tag editor to add a tag instead; go to socials directly
        // Actually we go to socials untouched → later-fill
        await wrapper.find('[data-test=later-fill]').trigger('click')
        await flushPromises()

        // stickers: touched (mock isDirty:true) → next-step
        await wrapper.find('[data-test=next-step]').trigger('click')
        await flushPromises()

        // Now on review — confirm triggers auto-draw
        await wrapper.find('[data-test=confirm-create]').trigger('click')
        await flushPromises()

        expect(uploadAvatarMock).toHaveBeenCalledTimes(1)
        expect(uploadAvatarMock).toHaveBeenCalledWith(croppedFile)
        expect(uploadAvatarMock.mock.invocationCallOrder[0]).toBeLessThan(createProfileMock.mock.invocationCallOrder[0])
        expect(createProfileMock).toHaveBeenCalledWith(expect.objectContaining({
            furName: 'Google Fox',
            avatar: '/user/u-uploaded.png',
        }))

        // redrawTopicCard is called automatically (no manual draw button needed)
        expect(redrawTopicCardMock).toHaveBeenCalledTimes(1)
        // Topic content is shown on topic step
        expect(wrapper.text()).toContain('今晚想一起聊什麼？')

        await vi.advanceTimersByTimeAsync(5000)
        expect(routerPushMock).toHaveBeenCalledWith('/chat')
        vi.useRealTimers()
    })

    it('沒有 staged avatar 時仍可 createProfile,且 avatar 不會帶固定預設圖路徑', async () => {
        authState.isLogin = true
        authState.user = { providerUserId: 'u-mock', googleName: 'Google Fox' }
        needsOnboardingRef.value = true

        const wrapper = mountIntroView()
        await flushPromises()

        await advanceToReview(wrapper)

        await wrapper.find('[data-test=confirm-create]').trigger('click')
        await flushPromises()

        expect(uploadAvatarMock).not.toHaveBeenCalled()
        expect(createProfileMock).toHaveBeenCalledTimes(1)
        expect(createProfileMock.mock.calls[0][0].avatar).toBeUndefined()
    })

    it('沒有 staged avatar 時仍會保留 avatar border 與 color 設定', async () => {
        authState.isLogin = true
        authState.user = { providerUserId: 'u-mock', googleName: 'Google Fox' }
        needsOnboardingRef.value = true

        const wrapper = mountIntroView()
        await flushPromises()

        await goToAvatar(wrapper)

        await wrapper.find('[data-test=avatar-border-toggle] input').setValue(true)
        await wrapper.find('.intro-view__color-input').setValue('#ff8800')
        await flushPromises()

        // avatar is now touched → next-step
        await wrapper.find('[data-test=next-step]').trigger('click')
        await flushPromises()
        // tags → later-edit
        await wrapper.find('[data-test=later-edit]').trigger('click')
        await flushPromises()
        // socials → later-fill
        await wrapper.find('[data-test=later-fill]').trigger('click')
        await flushPromises()
        // stickers → next-step (isDirty:true always)
        await wrapper.find('[data-test=next-step]').trigger('click')
        await flushPromises()

        // On review (passport layout — border color is applied via style, not shown as text)
        expect(wrapper.find('[data-test=review-passport]').exists()).toBe(true)

        await wrapper.find('[data-test=confirm-create]').trigger('click')
        await flushPromises()

        expect(uploadAvatarMock).not.toHaveBeenCalled()
        expect(createProfileMock).toHaveBeenCalledWith(expect.objectContaining({
            avatar: undefined,
            avatarBorder: true,
            avatarColor: '#ff8800',
        }))
    })

    it('review step 會直接顯示 staged avatar 與頭像框結果', async () => {
        authState.isLogin = true
        authState.user = { providerUserId: 'u-mock', googleName: 'Google Fox' }
        needsOnboardingRef.value = true

        const wrapper = mountIntroView()
        await flushPromises()

        await goToAvatar(wrapper)

        await wrapper.find('[data-test=avatar-border-toggle] input').setValue(true)
        await wrapper.find('.intro-view__color-input').setValue('#ff8800')

        const avatarInput = wrapper.find('input[type="file"]')
        const sourceFile = new File(['avatar-source'], 'avatar-source.png', { type: 'image/png' })
        Object.defineProperty(avatarInput.element, 'files', {
            configurable: true,
            value: [sourceFile],
        })
        await avatarInput.trigger('change')
        await flushPromises()

        const cropModal = wrapper.findComponent(AvatarCropModal)
        const croppedFile = new File(['avatar-cropped'], 'avatar.png', { type: 'image/png' })
        cropModal.vm.$emit('confirm', croppedFile)
        await flushPromises()

        // avatar touched → next-step
        await wrapper.find('[data-test=next-step]').trigger('click')
        await flushPromises()
        await wrapper.find('[data-test=later-edit]').trigger('click')
        await flushPromises()
        await wrapper.find('[data-test=later-fill]').trigger('click')
        await flushPromises()
        await wrapper.find('[data-test=next-step]').trigger('click')
        await flushPromises()

        const reviewAvatar = wrapper.find('[data-test=review-avatar] img')
        expect(reviewAvatar.exists()).toBe(true)
        expect(reviewAvatar.attributes('src')).toContain('blob:http://localhost/staged-avatar')
        expect(reviewAvatar.attributes('style') ?? '').toContain('#ff8800')
    })

    it('stickers step 渲染 StickerManager 元件', async () => {
        authState.isLogin = true
        authState.user = { providerUserId: 'u-mock', googleName: 'Google Fox' }
        needsOnboardingRef.value = true

        const wrapper = mountIntroView()
        await flushPromises()

        // nickname → avatar → tags → socials → stickers
        await wrapper.find('[data-test=next-step]').trigger('click')
        await flushPromises()
        await wrapper.find('[data-test=later-edit]').trigger('click')
        await flushPromises()
        await wrapper.find('[data-test=later-edit]').trigger('click')
        await flushPromises()
        await wrapper.find('[data-test=later-fill]').trigger('click')
        await flushPromises()

        expect(wrapper.find('[data-test=sticker-manager-mock]').exists()).toBe(true)
        expect(wrapper.text()).not.toContain('柔軟貼圖包')
        expect(wrapper.text()).not.toContain('mock-bubble-pack')
    })

    it('完成 onboarding 且 stickers 未略過時，createProfile 後呼叫 saveAll', async () => {
        authState.isLogin = true
        authState.user = { providerUserId: 'u-mock', googleName: 'Google Fox' }
        needsOnboardingRef.value = true

        const wrapper = mountIntroView()
        await flushPromises()

        // nickname → avatar (skip) → tags (skip) → socials (skip) → stickers (next via isDirty) → review → confirm
        await wrapper.find('[data-test=next-step]').trigger('click')
        await flushPromises()
        await wrapper.find('[data-test=later-edit]').trigger('click')
        await flushPromises()
        await wrapper.find('[data-test=later-edit]').trigger('click')
        await flushPromises()
        await wrapper.find('[data-test=later-fill]').trigger('click')
        await flushPromises()
        // stickers: mock isDirty=true → touched, next-step available
        await wrapper.find('[data-test=next-step]').trigger('click')
        await flushPromises()

        await wrapper.find('[data-test=confirm-create]').trigger('click')
        await flushPromises()

        expect(createProfileMock).toHaveBeenCalledTimes(1)
        expect(stickerSaveAllSpy).toHaveBeenCalledTimes(1)
        expect(createProfileMock.mock.invocationCallOrder[0]).toBeLessThan(stickerSaveAllSpy.mock.invocationCallOrder[0])
    })

    // =========================================================
    // socials: confirmProfileSetup passes SocialPlatform enum value
    // =========================================================

    it('confirm 時 addSocialLink 帶 SocialPlatform enum value', async () => {
        authState.isLogin = true
        authState.user = { providerUserId: 'u-mock', googleName: 'Google Fox' }
        needsOnboardingRef.value = true

        const wrapper = mountIntroView()
        await flushPromises()

        // Navigate to socials
        await wrapper.find('[data-test=next-step]').trigger('click')
        await flushPromises()
        await wrapper.find('[data-test=later-edit]').trigger('click')
        await flushPromises()
        await wrapper.find('[data-test=later-edit]').trigger('click')
        await flushPromises()

        // Add a valid X link
        await wrapper.find('[data-test=add-social-link]').trigger('click')
        await flushPromises()
        await wrapper.find('[data-test=social-platform-0]').setValue('X')
        await wrapper.find('[data-test=social-url-0]').setValue('https://x.com/googlefox')
        await flushPromises()

        // next-step to stickers
        await wrapper.find('[data-test=next-step]').trigger('click')
        await flushPromises()
        // stickers → next-step
        await wrapper.find('[data-test=next-step]').trigger('click')
        await flushPromises()

        await wrapper.find('[data-test=confirm-create]').trigger('click')
        await flushPromises()

        expect(addSocialLinkMock).toHaveBeenCalledWith({ platform: 'X', links: 'https://x.com/googlefox' })
    })

    it('confirm 時 addSocialLink 失敗 → 顯示 toast，但 profile 仍建立（best-effort）', async () => {
        authState.isLogin = true
        authState.user = { providerUserId: 'u-mock', googleName: 'Google Fox' }
        needsOnboardingRef.value = true
        addSocialLinkMock.mockResolvedValueOnce(false)

        const wrapper = mountIntroView()
        await flushPromises()

        // nickname → avatar(skip) → tags(skip) → socials
        await wrapper.find('[data-test=next-step]').trigger('click')
        await flushPromises()
        await wrapper.find('[data-test=later-edit]').trigger('click')
        await flushPromises()
        await wrapper.find('[data-test=later-edit]').trigger('click')
        await flushPromises()

        await wrapper.find('[data-test=add-social-link]').trigger('click')
        await flushPromises()
        await wrapper.find('[data-test=social-platform-0]').setValue('X')
        await wrapper.find('[data-test=social-url-0]').setValue('https://x.com/googlefox')
        await flushPromises()

        await wrapper.find('[data-test=next-step]').trigger('click')
        await flushPromises()
        await wrapper.find('[data-test=next-step]').trigger('click')
        await flushPromises()

        await wrapper.find('[data-test=confirm-create]').trigger('click')
        await flushPromises()

        expect(addSocialLinkMock).toHaveBeenCalledTimes(1)
        expect(pushWarningSpy).toHaveBeenCalled()
        // best-effort：profile 仍建立
        expect(createProfileMock).toHaveBeenCalledTimes(1)
    })

    // =========================================================
    // Passport confirm page: visual assertions
    // =========================================================

    it('passport review: 顯示 furName、tags、socials（≤3）', async () => {
        authState.isLogin = true
        authState.user = { providerUserId: 'u-mock', googleName: 'Google Fox' }
        needsOnboardingRef.value = true

        const wrapper = mountIntroView()
        await flushPromises()

        // Navigate to socials and add a valid link
        await wrapper.find('[data-test=next-step]').trigger('click')
        await flushPromises()
        // avatar → later-edit
        await wrapper.find('[data-test=later-edit]').trigger('click')
        await flushPromises()
        // tags → later-edit
        await wrapper.find('[data-test=later-edit]').trigger('click')
        await flushPromises()
        // socials: add one valid link
        await wrapper.find('[data-test=add-social-link]').trigger('click')
        await flushPromises()
        await wrapper.find('[data-test=social-platform-0]').setValue('GITHUB')
        await wrapper.find('[data-test=social-url-0]').setValue('https://github.com/googlefox')
        await flushPromises()
        // next-step to stickers
        await wrapper.find('[data-test=next-step]').trigger('click')
        await flushPromises()
        // stickers → next-step
        await wrapper.find('[data-test=next-step]').trigger('click')
        await flushPromises()

        // On review (passport)
        const passport = wrapper.find('[data-test=review-passport]')
        expect(passport.exists()).toBe(true)
        expect(passport.find('[data-test=review-furname]').text()).toContain('Google Fox')
        // Social entry shows handle
        expect(passport.find('[data-test=review-socials]').text()).toContain('https://github.com/googlefox')
        // No more... row since only 1 link
        expect(passport.find('[data-test=review-socials-more]').exists()).toBe(false)
    })

    it('passport review: 社群超過 3 筆顯示 more...', async () => {
        authState.isLogin = true
        authState.user = { providerUserId: 'u-mock', googleName: 'Google Fox' }
        needsOnboardingRef.value = true

        const wrapper = mountIntroView()
        await flushPromises()

        // Navigate to socials
        await wrapper.find('[data-test=next-step]').trigger('click')
        await flushPromises()
        await wrapper.find('[data-test=later-edit]').trigger('click')
        await flushPromises()
        await wrapper.find('[data-test=later-edit]').trigger('click')
        await flushPromises()

        // Add 4 valid social links
        for (let i = 0; i < 4; i++) {
            await wrapper.find('[data-test=add-social-link]').trigger('click')
            await flushPromises()
            await wrapper.find(`[data-test=social-platform-${i}]`).setValue('GITHUB')
            await wrapper.find(`[data-test=social-url-${i}]`).setValue(`https://github.com/user${i}`)
            await flushPromises()
        }

        // next-step to stickers
        await wrapper.find('[data-test=next-step]').trigger('click')
        await flushPromises()
        // stickers → next-step
        await wrapper.find('[data-test=next-step]').trigger('click')
        await flushPromises()

        // On review: 3 items shown + more...
        const passport = wrapper.find('[data-test=review-passport]')
        const socialItems = passport.findAll('[data-test=review-socials] li:not(.ps-more)')
        expect(socialItems).toHaveLength(3)
        expect(passport.find('[data-test=review-socials-more]').exists()).toBe(true)
        expect(passport.find('[data-test=review-socials-more]').text()).toContain('more...')
    })

    it('passport review: social icon 帶 platform brandColor', async () => {
        authState.isLogin = true
        authState.user = { providerUserId: 'u-mock', googleName: 'Google Fox' }
        needsOnboardingRef.value = true

        const wrapper = mountIntroView()
        await flushPromises()

        // Navigate to socials and add X link
        await wrapper.find('[data-test=next-step]').trigger('click')
        await flushPromises()
        await wrapper.find('[data-test=later-edit]').trigger('click')
        await flushPromises()
        await wrapper.find('[data-test=later-edit]').trigger('click')
        await flushPromises()
        await wrapper.find('[data-test=add-social-link]').trigger('click')
        await flushPromises()
        await wrapper.find('[data-test=social-platform-0]').setValue('X')
        await wrapper.find('[data-test=social-url-0]').setValue('https://x.com/googlefox')
        await flushPromises()
        await wrapper.find('[data-test=next-step]').trigger('click')
        await flushPromises()
        await wrapper.find('[data-test=next-step]').trigger('click')
        await flushPromises()

        // The social icon should have X's brandColor (#000000)
        const icon = wrapper.find('[data-test=review-socials] li .ps-ic')
        expect(icon.exists()).toBe(true)
        expect(icon.attributes('style') ?? '').toContain('#000000')
    })

    // =========================================================
    // Submit flow: auto-draw ordering + topic display + 5s redirect
    // =========================================================

    it('confirm-create 後依序呼叫 createProfile→fetchProfile→redrawTopicCard，進 topic step 顯示話題', async () => {
        vi.useFakeTimers()
        authState.isLogin = true
        authState.user = { providerUserId: 'u-mock', googleName: 'Google Fox' }
        needsOnboardingRef.value = true

        const wrapper = mountIntroView()
        await flushPromises()

        await advanceToReview(wrapper)

        await wrapper.find('[data-test=confirm-create]').trigger('click')
        await flushPromises()

        // Call ordering
        expect(createProfileMock).toHaveBeenCalledTimes(1)
        expect(fetchProfileMock).toHaveBeenCalledTimes(1)
        expect(redrawTopicCardMock).toHaveBeenCalledTimes(1)
        expect(fetchProfileMock.mock.invocationCallOrder[0]).toBeLessThan(redrawTopicCardMock.mock.invocationCallOrder[0])

        // Topic content visible on topic step
        expect(wrapper.find('[data-test=topic-content]').exists()).toBe(true)
        expect(wrapper.text()).toContain('今晚想一起聊什麼？')

        // 5 seconds auto-redirect to /chat
        await vi.advanceTimersByTimeAsync(5000)
        expect(routerPushMock).toHaveBeenCalledWith('/chat')

        vi.useRealTimers()
    })

    it('抽話題卡失敗時顯示 drawError + 手動進入按鈕，不卡在「抽獎中…」（/ 頁不導 error 頁）', async () => {
        authState.isLogin = true
        authState.user = { providerUserId: 'u-mock', googleName: 'Google Fox' }
        needsOnboardingRef.value = true

        // 模擬 redraw 失敗：吞錯設 user.error、不設 topic（比照 useUser.redrawTopicCard 行為）
        redrawTopicCardMock.mockImplementation(async () => {
            userErrorRef.value = '重抽話題卡失敗'
        })

        const wrapper = mountIntroView()
        await flushPromises()

        await advanceToReview(wrapper)

        await wrapper.find('[data-test=confirm-create]').trigger('click')
        await flushPromises()

        expect(redrawTopicCardMock).toHaveBeenCalledTimes(1)
        // 不應卡在「抽獎中…」，而是顯示錯誤 + 手動進入按鈕
        expect(wrapper.text()).not.toContain('抽獎中')
        expect(wrapper.find('[data-test=topic-draw-error]').exists()).toBe(true)
        expect(wrapper.text()).toContain('重抽話題卡失敗')
        expect(wrapper.find('[data-test=topic-manual-redirect]').exists()).toBe(true)
    })

    it('topic step: 手動按鈕立即 push /chat', async () => {
        authState.isLogin = true
        authState.user = { providerUserId: 'u-mock', googleName: 'Google Fox' }
        needsOnboardingRef.value = true

        const wrapper = mountIntroView()
        await flushPromises()

        await advanceToReview(wrapper)

        await wrapper.find('[data-test=confirm-create]').trigger('click')
        await flushPromises()

        // Should be on topic step with manual redirect button
        const manualBtn = wrapper.find('[data-test=topic-manual-redirect]')
        expect(manualBtn.exists()).toBe(true)

        await manualBtn.trigger('click')
        expect(routerPushMock).toHaveBeenCalledWith('/chat')
    })
})
