import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'

// module-level reactive refs；test 內直接改 .value 重設 mock state
const profileRef = ref<any>(null)
const needsRef = ref<boolean>(false)
const fetchProfileMock = vi.fn().mockResolvedValue(undefined)

const authState = {
    checked: true,
    isLogin: true,
    user: { providerUserId: 'u-mock' } as any,
    checkAuth: vi.fn(),
}

vi.mock('@/composables/useUser', () => ({
    useUser: () => ({
        profile: profileRef,
        needsOnboarding: needsRef,
        fetchProfile: fetchProfileMock,
    }),
}))

vi.mock('@/stores/auth.ts', () => ({
    useAuthStore: () => authState,
}))

import router from '@/router'

// helper：用 timestamp query 強制 vue-router 觸發 navigation（不論當前 path 是否相同）
let navCounter = 0
async function navigateTo(path: string): Promise<void> {
    navCounter += 1
    await router.push({ path, query: { _t: String(navCounter) } }).catch(() => {})
}

describe('router onboarding guard', () => {
    beforeEach(() => {
        profileRef.value = null
        needsRef.value = false
        authState.checked = true
        authState.isLogin = true
        fetchProfileMock.mockClear()
    })

    it('redirects /dashboard to / when profile missing (needsOnboarding=true)', async () => {
        needsRef.value = true
        await navigateTo('/dashboard')
        expect(router.currentRoute.value.path).toBe('/')
    })

    it('passes through when profile exists (target = /chat)', async () => {
        profileRef.value = { userId: 'u-1' }
        await navigateTo('/chat')
        expect(router.currentRoute.value.path).toBe('/chat')
    })

    it('passes through to /dashboard when profile exists', async () => {
        profileRef.value = { userId: 'u-1' }
        await navigateTo('/dashboard')
        expect(router.currentRoute.value.path).toBe('/dashboard')
    })

    it('allows staying on / when profile missing (needsOnboarding=true)', async () => {
        needsRef.value = true
        await navigateTo('/')
        expect(router.currentRoute.value.path).toBe('/')
    })

    it('redirects /chat to / when profile missing (needsOnboarding=true)', async () => {
        needsRef.value = true
        await navigateTo('/chat')
        expect(router.currentRoute.value.path).toBe('/')
    })

    it('redirects / to /chat when logged-in profile exists', async () => {
        profileRef.value = { userId: 'u-1' }
        await navigateTo('/')
        expect(router.currentRoute.value.path).toBe('/chat')
    })

    it('redirects to / when not logged in', async () => {
        authState.isLogin = false
        await navigateTo('/dashboard')
        expect(router.currentRoute.value.path).toBe('/')
    })
})
