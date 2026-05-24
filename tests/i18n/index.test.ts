import { describe, expect, it } from 'vitest'
import { createAppI18n } from '@/i18n'

describe('createAppI18n', () => {
    it('loads zh-TW intro messages', () => {
        const i18n = createAppI18n()

        expect(i18n.global.locale.value).toBe('zh-TW')
        expect(i18n.global.t('intro.login.brand')).toBe('SEF-CLI')
        expect(i18n.global.t('intro.login.subtitle')).toBe('軟體工程獸互動系統')
        expect(i18n.global.t('intro.steps.nickname.title')).toBe('請告訴系統要怎麼顯示你')
        expect(i18n.global.t('intro.fields.displayName')).toBe('顯示名稱')
    })
})
