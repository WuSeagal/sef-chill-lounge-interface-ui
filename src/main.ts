import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createNotivue } from 'notivue'
import App from './App.vue'
import './assets/variables.css'
import './assets/main.css'
import router from './router'
import { createAppI18n } from './i18n'
import { isDynamicImportError, reloadForStaleChunk } from './utils/staleChunk'

import 'notivue/notification.css'
import 'notivue/animations.css'

// 部署後舊分頁持有舊 chunk hash，lazy import 失敗會讓畫面卡住一直轉圈。
// Vite 對 route / component 兩種動態載入失敗都會發 vite:preloadError → reload 抓新版（once-guard 防 loop）。
window.addEventListener('vite:preloadError', () => {
    reloadForStaleChunk()
})

window.addEventListener('error', (e) => {
    console.error('[全域錯誤]', e.message)
})

window.addEventListener('unhandledrejection', (e) => {
    // stale chunk 的動態載入失敗常以未處理 rejection 形式出現（router 之外的 component 級 import）
    if (isDynamicImportError(e.reason)) {
        reloadForStaleChunk()
        return
    }
    console.error('[Promise Rejection]', e.reason)
})

const notivue = createNotivue({
    limit: 5,
    enqueue: true,
    avoidDuplicates: true,
    notifications: {
        global: {
            duration: 3000
        }
    }
})

const app = createApp(App)
app.use(createAppI18n())
app.use(router)
app.use(createPinia())
app.use(notivue)

app.mount('#app')
