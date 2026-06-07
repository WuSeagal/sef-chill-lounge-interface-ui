import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('@/composables/useUser', () => ({
    useUser: () => ({
        profile: {
            value: {
                furName: 'Foxy', username: 'foxy', avatar: null,
                avatarColor: null, avatarBorder: false,
                tags: [], socials: [], stickers: [],
            },
        },
    }),
}))

import ExportPassportTab from '@/components/ExportPassportTab.vue'

const stubs = {
    PassportCard: { template: '<div class="stub-card" />' },
    PassportOverlay: { props: ['open', 'exportable'], template: '<div class="stub-overlay" />' },
}

describe('ExportPassportTab', () => {
    it('shows the updated hint copy', () => {
        const w = mount(ExportPassportTab, { global: { stubs } })
        expect(w.find('.export-passport-tab__hint').text()).toBe(
            '點擊護照放大檢視，拉動TAG和社群連結至想輸出的畫面樣子，之後點擊右下「儲存護照」匯出PNG圖檔。',
        )
    })

    it('does not render the overlay until the preview is clicked', async () => {
        const w = mount(ExportPassportTab, { global: { stubs } })
        expect(w.find('.stub-overlay').exists()).toBe(false)
        await w.find('.export-passport-tab__preview').trigger('click')
        expect(w.find('.stub-overlay').exists()).toBe(true)
    })
})
