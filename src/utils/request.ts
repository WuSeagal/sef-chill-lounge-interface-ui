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
        if (status === 401 || status === 404) {
            // 401：session expired — 既有 OAuth 流程接手。
            // 404：資源不存在交由呼叫端處理（如 GET /user/profile 404 = 尚未建 profile
            //      → useUser 視為 needs-onboarding）。不轉跳 ErrorPage，否則 onboarding
            //      中途 F5 會被導去 /error。未知「前端」路由仍由 router catch-all 進 /error。
            return Promise.reject(error)
        }
        // 這些端點皆由呼叫端自行以 toast / inline 顯示錯誤，不該整頁導去 /error
        // （否則 toast 來不及顯示就被導走，亦會為了一次頁內失敗毀掉整個 chat / dashboard session）。
        // 故 gate on URL（非 status），連 5xx 也不導頁：
        //   /upload/        — avatar / sticker / chat-image 上傳（ImageUploadError + toast）
        //   /messages       — /chat 載入訊息 init / loadMore（ChatView toast）
        //   /members        — 成員列表（useMembers.error）；目前尚無頁面消費，待接入時務必 render error，否則 500 會變靜默失敗
        //   /tags、/user/tags — 標籤（SettingsTab toast/inline；亦涵蓋 /user/tags/remove）
        //   /user/profile   — 當前 / 指定 user profile、profile/update（useUser.error、UserPopup.loadError）
        //   /user/social-links — 社群連結（SettingsTab；亦涵蓋 /remove）
        //   /user/topic-card、/topics — 「/」抽話題卡（IntroView drawError）、TopicCardTab
        const NO_REDIRECT_PATTERNS = [
            '/upload/',
            '/messages',
            '/members',
            '/tags',
            '/user/profile',
            '/user/social-links',
            '/user/topic-card',
            '/topics',
        ]
        const handledByCaller = NO_REDIRECT_PATTERNS.some(pattern => from.includes(pattern))
        // 已在 /error 頁時不再 push /error（防 redirect loop）；只 gate push，不吞其他錯誤處理
        const alreadyOnErrorPage = router.currentRoute.value.path === '/error'
        if (!handledByCaller && !alreadyOnErrorPage && (status === 0 || (status >= 400 && status < 600))) {
            router.push({
                path: '/error',
                query: { code: status, from },
            })
        }
        return Promise.reject(error)
    }
)

export default service
