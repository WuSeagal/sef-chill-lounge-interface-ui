import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth.ts'

const router = createRouter({
    history: createWebHistory(import.meta.env.VITE_BASE_URL),
    routes: [
        {
            path: '/',
            component: () => import('@/views/LoginView.vue'),
        },
        {
            path: '/oauth2/callback',
            component: () => import('@/views/GoogleCallback.vue'),
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
        return to.path === '/' ? next('/home') : next()
    } else {
        return to.path !== '/' ? next('/') : next()
    }
})

export default router
