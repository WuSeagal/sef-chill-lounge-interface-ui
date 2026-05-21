import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createNotivue } from 'notivue'
import App from './App.vue'
import './assets/variables.css'
import './assets/main.css'
import router from './router'

import 'notivue/notification.css'
import 'notivue/animations.css'

window.addEventListener('error', (e) => {
    console.error('[全域錯誤]', e.message)
})

window.addEventListener('unhandledrejection', (e) => {
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
app.use(router)
app.use(createPinia())
app.use(notivue)

app.mount('#app')
