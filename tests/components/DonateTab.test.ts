import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import DonateTab from '@/components/DonateTab.vue'
import { resetMockUserForTest } from '@/composables/useMockUser'

describe('DonateTab', () => {
    beforeEach(() => {
        resetMockUserForTest()
    })

    it('renders the donate link', () => {
        const wrapper = mount(DonateTab)
        const link = wrapper.find('.donate-tab__link')
        expect(link.exists()).toBe(true)
    })

    it('link points to mockUser.donateUrl', () => {
        const wrapper = mount(DonateTab)
        const link = wrapper.find('.donate-tab__link')
        expect(link.attributes('href')).toBe('https://example.com/donate')
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
