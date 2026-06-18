import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AnnouncementBanner from '@/components/AnnouncementBanner.vue'

describe('AnnouncementBanner', () => {
    it('渲染傳入的純文字', () => {
        const wrapper = mount(AnnouncementBanner, { props: { text: '18:00 抽獎' } })
        expect(wrapper.find('.announcement-banner__text').text()).toBe('18:00 抽獎')
    })

    it('root 帶 region role、aria-label「公告」、aria-live=polite', () => {
        const wrapper = mount(AnnouncementBanner, { props: { text: 'x' } })
        const root = wrapper.find('.announcement-banner')
        expect(root.attributes('role')).toBe('region')
        expect(root.attributes('aria-label')).toBe('公告')
        expect(root.attributes('aria-live')).toBe('polite')
    })

    it('HTML 字串以純文字顯示、不產生對應 DOM（無 v-html）', () => {
        const wrapper = mount(AnnouncementBanner, { props: { text: '<img src=x onerror=alert(1)>' } })
        expect(wrapper.findAll('img').length).toBe(0)
        expect(wrapper.find('.announcement-banner__text').text()).toContain('<img src=x onerror=alert(1)>')
    })

    it('URL 渲染為可點連結、點擊 emit link-click（離站確認交給 ChatView）', async () => {
        const wrapper = mount(AnnouncementBanner, { props: { text: '看 https://example.com/a 喔' } })
        const link = wrapper.find('.announcement-banner__link')
        expect(link.exists()).toBe(true)
        expect(link.attributes('href')).toBe('https://example.com/a')
        await link.trigger('click')
        expect(wrapper.emitted('link-click')?.[0]).toEqual(['https://example.com/a'])
    })

    it('危險 scheme 連結屏蔽為 *** 不可點（比照訊息保護）', () => {
        const wrapper = mount(AnnouncementBanner, { props: { text: '點 javascript:alert(1) 拿好康' } })
        expect(wrapper.find('.announcement-banner__link').exists()).toBe(false)
        expect(wrapper.find('.announcement-banner__text').text()).toContain('***')
    })
})
