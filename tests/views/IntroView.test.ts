import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { createAppI18n } from '@/i18n'

vi.mock('@/api/userApi', () => ({
    fetchDefaultTags: vi.fn(),
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
import IntroView from '@/views/IntroView.vue'

function mountIntroView() {
    return mount(IntroView, {
        global: {
            plugins: [createAppI18n()],
        },
    })
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

        vi.clearAllMocks()
        vi.unstubAllEnvs()

        authState.isLogin = false
        authState.user = null
        profileRef.value = null
        needsOnboardingRef.value = false

        ;(api.fetchDefaultTags as any).mockResolvedValue([
            { tagId: 'tg-001', type: 'species', content: '宅' },
            { tagId: 'tg-002', type: 'species', content: '貓派' },
        ])
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

    it('walks through wizard, creates profile, draws topic, then routes to /chat after 5 seconds', async () => {
        vi.useFakeTimers()
        authState.isLogin = true
        authState.user = { providerUserId: 'u-mock', googleName: 'Google Fox' }
        needsOnboardingRef.value = true

        const wrapper = mountIntroView()
        await flushPromises()

        await wrapper.find('[data-test=next-step]').trigger('click')
        await wrapper.find('[data-test=skip-step]').trigger('click')
        await wrapper.find('[data-test=tag-tg-001]').setValue(true)
        await wrapper.find('[data-test=next-step]').trigger('click')

        const socialInputs = wrapper.findAll('[data-field="social-links"] input')
        await socialInputs[0].setValue('telegram')
        await socialInputs[1].setValue('https://t.me/googlefox')
        await wrapper.find('[data-test=add-social-link]').trigger('click')
        await wrapper.find('[data-test=next-step]').trigger('click')
        await wrapper.find('[data-test=next-step]').trigger('click')
        await flushPromises()

        expect(wrapper.text()).toContain('確認你的設定')
        expect(wrapper.text()).toContain('Google Fox')
        expect(wrapper.text()).toContain('宅')
        expect(wrapper.text()).toContain('telegram')

        await wrapper.find('[data-test=confirm-create]').trigger('click')
        await flushPromises()

        expect(createProfileMock).toHaveBeenCalledWith(expect.objectContaining({
            furName: 'Google Fox',
        }))
        expect(addTagMock).toHaveBeenCalledWith({ tagId: 'tg-001' })
        expect(addSocialLinkMock).toHaveBeenCalledWith({
            platform: 'telegram',
            links: 'https://t.me/googlefox',
        })
        expect(wrapper.text()).not.toContain('同步中...')
        expect(wrapper.text()).toContain('話題卡抽獎')

        await wrapper.find('[data-test=draw-topic]').trigger('click')
        await flushPromises()

        expect(redrawTopicCardMock).toHaveBeenCalledTimes(1)
        expect(wrapper.text()).toContain('今晚想一起聊什麼？')

        await vi.advanceTimersByTimeAsync(5000)
        expect(routerPushMock).toHaveBeenCalledWith('/chat')
        vi.useRealTimers()
    })
})
