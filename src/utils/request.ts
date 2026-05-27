import axios from 'axios'
import router from '@/router'

const service = axios.create({
    baseURL: import.meta.env.VITE_ENDPOINT || 'http://localhost:9041',
    withCredentials: true,
    timeout: 5000
})

service.interceptors.request.use(
    config => config,
    error => Promise.reject(error)
)

service.interceptors.response.use(
    response => {
        const res = response.data
        if (res.code !== 200) {
            console.error('API 錯誤:', res.message)
            return Promise.reject(new Error(res.message || 'Error'))
        }
        return res
    },
    error => {
        const status = error.response?.status ?? 0
        const from = error.config?.url ?? ''
        if (status === 401) {
            // session expired — 既有 OAuth 流程接手，不轉跳 ErrorPage
            return Promise.reject(error)
        }
        // 已在 /error 頁時不再 push /error（防 redirect loop）；只 gate push，不吞其他錯誤處理
        const alreadyOnErrorPage = router.currentRoute.value.path === '/error'
        if (!alreadyOnErrorPage && (status === 0 || (status >= 400 && status < 600))) {
            router.push({
                path: '/error',
                query: { code: status, from },
            })
        }
        return Promise.reject(error)
    }
)

export default service
