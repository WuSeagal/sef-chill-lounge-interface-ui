import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DonateTab from '@/components/DonateTab.vue'

describe('DonateTab', () => {
    it('renders the donate link', () => {
        const wrapper = mount(DonateTab)
        const link = wrapper.find('.donate-tab__link')
        expect(link.exists()).toBe(true)
    })

    it('link points to the real donate URL', () => {
        const wrapper = mount(DonateTab)
        const link = wrapper.find('.donate-tab__link')
        expect(link.attributes('href')).toBe('https://wuseagal.bobaboba.me')
    })

    it('link opens in a new tab', () => {
        const wrapper = mount(DonateTab)
        const link = wrapper.find('.donate-tab__link')
        expect(link.attributes('target')).toBe('_blank')
        expect(link.attributes('rel')).toContain('noopener')
    })

    it('renders the donate image inside the link', () => {
        const wrapper = mount(DonateTab)
        const img = wrapper.find('.donate-tab__img')
        expect(img.exists()).toBe(true)
        expect(img.attributes('src')).toContain('donate_boba')
    })
})
