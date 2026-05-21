import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth.ts'

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
            path: '/home',
            component: () => import('@/views/HomeView.vue'),
        },
    ]
})

router.beforeEach(async (to, _from, next) => {
    if (to.path === '/oauth2/callback') {
        return next()
    }

    const auth = useAuthStore()
    if (!auth.checked) {
        await auth.checkAuth()
    }

    if (auth.isLogin) {
        return to.path === '/' ? next('/dashboard') : next()
    } else {
        return to.path !== '/' ? next('/') : next()
    }
})

export default router
