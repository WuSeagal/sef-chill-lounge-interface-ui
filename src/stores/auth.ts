import { defineStore } from 'pinia'
import type { AuthResponse } from '@/types/auth.ts'

export const useAuthStore = defineStore('auth', {
    state: () => ({
        user: null as AuthResponse | null,
        isLogin: false,
        loading: false,
        checked: false
    }),
    getters: {
        getUser: (state): AuthResponse | null => state.user,
    },
    actions: {
        async checkAuth() {
            this.loading = true
            try {
                const res = await fetch(import.meta.env.VITE_ENDPOINT + '/check-auth', {
                    credentials: 'include'
                })
                if (!res.ok) {
                    throw new Error('auth failed')
                }
                const apiResponse = await res.json()
                this.user = apiResponse.data
                this.isLogin = true
            } catch (e) {
                console.error(e)
                this.user = null
                this.isLogin = false
            } finally {
                this.loading = false
                this.checked = true
            }
        }
    }
})
