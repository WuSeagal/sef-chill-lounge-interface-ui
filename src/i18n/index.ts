import { createI18n } from 'vue-i18n'
import zhTW from './locales/zh-TW'

export function createAppI18n() {
    return createI18n({
        legacy: false,
        globalInjection: true,
        locale: 'zh-TW',
        fallbackLocale: 'zh-TW',
        messages: {
            'zh-TW': zhTW,
        },
    })
}
