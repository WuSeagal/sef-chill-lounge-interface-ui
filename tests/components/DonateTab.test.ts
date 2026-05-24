import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DonateTab from '@/components/DonateTab.vue'

describe('DonateTab', () => {
    it('renders the donate link', () => {
        const wrapper = mount(DonateTab)
        const link = wrapper.find('.donate-tab__link')
        expect(link.exists()).toBe(true)
    })

    it('link points to hardcoded donate URL', () => {
        const wrapper = mount(DonateTab)
        const link = wrapper.find('.donate-tab__link')
        // 依 openspec/backlog.md，URL 寫死在前端（之後申請正式帳號後更新）
        const href = link.attributes('href')
        expect(href).toBeTruthy()
        expect(href).toMatch(/^https?:\/\//)
    })

    it('link opens in a new tab', () => {
        const wrapper = mount(DonateTab)
        const link = wrapper.find('.donate-tab__link')
        expect(link.attributes('target')).toBe('_blank')
        expect(link.attributes('rel')).toContain('noopener')
    })

    it('renders a placeholder image area', () => {
        const wrapper = mount(DonateTab)
        expect(wrapper.find('.donate-tab__placeholder').exists()).toBe(true)
    })
})
