import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BannedScreen from '@/components/BannedScreen.vue'

const MAILTO = 'mailto:anonywsg@gmail.com'

describe('BannedScreen', () => {
    it('renders the full-page grid-paper background', () => {
        const wrapper = mount(BannedScreen)
        expect(wrapper.find('.banned-screen').exists()).toBe(true)
        expect(wrapper.find('.grid-paper').exists()).toBe(true)
    })

    it('uses the shared LizardCard', () => {
        const wrapper = mount(BannedScreen)
        expect(wrapper.find('.lizard-card').exists()).toBe(true)
        expect(wrapper.find('.lizard-card__lizard').exists()).toBe(true)
    })

    it('shows the ban copy with email contact line', () => {
        const wrapper = mount(BannedScreen)
        const text = wrapper.text()
        expect(text).toContain('你已被禁用')
        expect(text).toContain('請透過信箱')
        expect(text).toContain('anonywsg@gmail.com')
        expect(text).toContain('聯絡管理員')
    })

    it('renders the email as a clickable mailto link', () => {
        const wrapper = mount(BannedScreen)
        const link = wrapper.find('[data-test="banned-email-link"]')
        expect(link.exists()).toBe(true)
        expect(link.attributes('href')).toBe(MAILTO)
        expect(link.text()).toBe('anonywsg@gmail.com')
    })

    it('renders the contact-admin button as a mailto link', () => {
        const wrapper = mount(BannedScreen)
        const btn = wrapper.find('[data-test="banned-contact-btn"]')
        expect(btn.exists()).toBe(true)
        expect(btn.attributes('href')).toBe(MAILTO)
        expect(btn.text()).toContain('聯絡管理員')
    })

    it('marks the screen as an alert region for assistive tech', () => {
        const wrapper = mount(BannedScreen)
        expect(wrapper.find('.banned-screen').attributes('role')).toBe('alert')
    })
})
