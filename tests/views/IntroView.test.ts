import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { h, ref } from 'vue'
import { createAppI18n } from '@/i18n'

vi.mock('@/api/userApi', () => ({
    fetchSelectableTags: vi.fn(),
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
const addTagMock = vi.fn().mockResolvedValue(undefined)
const addSocialLinkMock = vi.fn().mockResolvedValue(undefined)
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

async function advanceToReview(wrapper: ReturnType<typeof mountIntroView>) {
    await wrapper.find('[data-test=next-step]').trigger('click')
    await flushPromises()
    await wrapper.find('[data-test=next-step]').trigger('click')
    await flushPromises()
    await wrapper.find('[data-test=skip-step]').trigger('click')
    await flushPromises()
    await wrapper.find('[data-test=skip-step]').trigger('click')
    await flushPromises()
    await wrapper.find('[data-test=skip-step]').trigger('click')
    await flushPromises()
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
        expect(wrapper.text()).toContain('登入Google與軟體工程獸們互動')
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
        expect(wrapper.text()).toContain('請告訴系統要怎麼顯示你')
        expect(wrapper.text()).not.toContain('Step 1 / 7')
        expect(wrapper.find('[data-test=username]').exists()).toBe(false)
        expect(wrapper.text()).not.toContain('furName')
        expect(wrapper.find('label').text()).toBe('顯示名稱 *')
        expect(wrapper.find<HTMLInputElement>('[data-test=furName]').element.value).toBe('Google Fox')
        expect(wrapper.find('[data-test=next-step]').exists()).toBe(true)
    })

    it('avatar step removes mock choices and shows image upload entry', async () => {
        authState.isLogin = true
        authState.user = { providerUserId: 'u-mock', googleName: 'Google Fox' }
        needsOnboardingRef.value = true

        const wrapper = mountIntroView()
        await flushPromises()

        await wrapper.find('[data-test=next-step]').trigger('click')
        await flushPromises()

        expect(wrapper.text()).not.toContain('mock-otter')
        expect(wrapper.text()).not.toContain('mock-fox')
        expect(wrapper.text()).not.toContain('mock-bear')
        expect(wrapper.text()).toContain('上傳圖片')
        expect(wrapper.text()).toContain('支援 PNG / JPG / WEBP')
        expect(wrapper.text()).not.toContain('GIF')
        expect(wrapper.text()).toContain('拖曳與縮放，調整你的頭像顯示範圍')
        expect(wrapper.find('input[type="file"]').attributes('accept')).toBe('image/png,image/jpeg,image/webp')
        expect(wrapper.find('.intro-view__avatar-preview').exists()).toBe(true)
    })

    it('有 staged avatar 時顯示更換圖片與重新裁切', async () => {
        authState.isLogin = true
        authState.user = { providerUserId: 'u-mock', googleName: 'Google Fox' }
        needsOnboardingRef.value = true

        const wrapper = mountIntroView()
        await flushPromises()

        await wrapper.find('[data-test=next-step]').trigger('click')
        await flushPromises()

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

        expect(wrapper.text()).toContain('更換圖片')
        expect(wrapper.text()).toContain('重新裁切')
    })

    it('confirm 完成時若有 staged avatar,會先 uploadAvatar 再 createProfile 並帶 avatarPath', async () => {
        vi.useFakeTimers()
        authState.isLogin = true
        authState.user = { providerUserId: 'u-mock', googleName: 'Google Fox' }
        needsOnboardingRef.value = true

        const wrapper = mountIntroView()
        await flushPromises()

        await wrapper.find('[data-test=next-step]').trigger('click')
        await flushPromises()

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

        await wrapper.find('[data-test=next-step]').trigger('click')
        await flushPromises()
        await wrapper.find('[data-test=edit-button]').trigger('click')
        await flushPromises()
        await wrapper.find('[data-test=row-head-LANGUAGE]').trigger('click')
        await wrapper.find('[data-test=chip-tg-001]').trigger('click')
        await wrapper.find('[data-test=close-btn]').trigger('click')
        await wrapper.find('[data-test=next-step]').trigger('click')

        const socialInputs = wrapper.findAll('[data-field="social-links"] input')
        await socialInputs[0].setValue('telegram')
        await socialInputs[1].setValue('https://t.me/googlefox')
        await wrapper.find('[data-test=add-social-link]').trigger('click')
        await wrapper.find('[data-test=next-step]').trigger('click')
        await wrapper.find('[data-test=next-step]').trigger('click')
        await flushPromises()

        await wrapper.find('[data-test=confirm-create]').trigger('click')
        await flushPromises()

        expect(uploadAvatarMock).toHaveBeenCalledTimes(1)
        expect(uploadAvatarMock).toHaveBeenCalledWith(croppedFile)
        expect(uploadAvatarMock.mock.invocationCallOrder[0]).toBeLessThan(createProfileMock.mock.invocationCallOrder[0])
        expect(createProfileMock).toHaveBeenCalledWith(expect.objectContaining({
            furName: 'Google Fox',
            avatar: '/user/u-uploaded.png',
        }))

        await wrapper.find('[data-test=draw-topic]').trigger('click')
        await flushPromises()

        expect(redrawTopicCardMock).toHaveBeenCalledTimes(1)
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

        await wrapper.find('[data-test=next-step]').trigger('click')
        await flushPromises()

        await wrapper.find('[data-test=avatar-border-toggle] input').setValue(true)
        await wrapper.find('.intro-view__color-input').setValue('#ff8800')
        await flushPromises()

        await wrapper.find('[data-test=next-step]').trigger('click')
        await flushPromises()
        await wrapper.find('[data-test=skip-step]').trigger('click')
        await flushPromises()
        await wrapper.find('[data-test=skip-step]').trigger('click')
        await flushPromises()
        await wrapper.find('[data-test=skip-step]').trigger('click')
        await flushPromises()

        expect(wrapper.text()).toContain('#ff8800')

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

        await wrapper.find('[data-test=next-step]').trigger('click')
        await flushPromises()

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

        await wrapper.find('[data-test=next-step]').trigger('click')
        await flushPromises()
        await wrapper.find('[data-test=skip-step]').trigger('click')
        await flushPromises()
        await wrapper.find('[data-test=skip-step]').trigger('click')
        await flushPromises()
        await wrapper.find('[data-test=skip-step]').trigger('click')
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

        // advance: nickname → avatar → tags → socials → stickers
        await wrapper.find('[data-test=next-step]').trigger('click')
        await flushPromises()
        await wrapper.find('[data-test=next-step]').trigger('click')
        await flushPromises()
        await wrapper.find('[data-test=skip-step]').trigger('click')
        await flushPromises()
        await wrapper.find('[data-test=skip-step]').trigger('click')
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

        // nickname → avatar (skip) → tags (skip) → socials (skip) → stickers (next) → review → confirm
        await wrapper.find('[data-test=next-step]').trigger('click')
        await flushPromises()
        await wrapper.find('[data-test=skip-step]').trigger('click')
        await flushPromises()
        await wrapper.find('[data-test=skip-step]').trigger('click')
        await flushPromises()
        await wrapper.find('[data-test=skip-step]').trigger('click')
        await flushPromises()
        // currently on stickers step — advance to review
        await wrapper.find('[data-test=next-step]').trigger('click')
        await flushPromises()

        await wrapper.find('[data-test=confirm-create]').trigger('click')
        await flushPromises()

        expect(createProfileMock).toHaveBeenCalledTimes(1)
        expect(stickerSaveAllSpy).toHaveBeenCalledTimes(1)
        expect(createProfileMock.mock.invocationCallOrder[0]).toBeLessThan(stickerSaveAllSpy.mock.invocationCallOrder[0])
    })
})
