import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth.ts'
import { useUser } from '@/composables/useUser'

const router = createRouter({
    history: createWebHistory(import.meta.env.VITE_BASE_URL),
    routes: [
        {
            path: '/',
            component: () => import('@/views/IntroView.vue'),
        },
        {
            path: '/oauth2/callback',
            component: () => import('@/views/GoogleCallback.vue'),
        },
        {
            path: '/dashboard',
            component: () => import('@/views/DashboardView.vue'),
        },
        {
            path: '/chat',
            component: () => import('@/views/ChatView.vue'),
        },
        {
            path: '/error',
            component: () => import('@/views/ErrorPage.vue'),
            meta: { skipAuth: true },
        },
        {
            path: '/:pathMatch(.*)*',
            redirect: to => ({ path: '/error', query: { code: 404, from: to.fullPath } }),
            meta: { skipAuth: true },
        },
    ]
})

router.beforeEach(async (to, _from, next) => {
    if (to.meta?.skipAuth === true) {
        return next()
    }

    if (to.path === '/oauth2/callback') {
        return next()
    }

    const auth = useAuthStore()
    if (!auth.checked) {
        await auth.checkAuth()
    }

    if (!auth.isLogin) {
        return to.path !== '/' ? next('/') : next()
    }

    // 已登入：檢查 profile 狀態
    const u = useUser()
    if (u.profile.value === null && !u.needsOnboarding.value) {
        await u.fetchProfile()
    }

    if (u.needsOnboarding.value) {
        return to.path === '/' ? next() : next('/')
    }

    return to.path === '/' ? next('/chat') : next()
})

export default router
