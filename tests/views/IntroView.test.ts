import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import IntroView from '@/views/IntroView.vue'

describe('IntroView', () => {
    let originalLocation: Location

    beforeEach(() => {
        originalLocation = window.location
        // happy-dom allows reassigning location for tests
        delete (window as unknown as { location?: Location }).location
        ;(window as unknown as { location: Partial<Location> }).location = {
            origin: 'http://localhost:9045',
            href: '',
        }
    })

    afterEach(() => {
        ;(window as unknown as { location: Location }).location = originalLocation
        vi.unstubAllEnvs()
    })

    it('renders a single Google login button', () => {
        const wrapper = mount(IntroView)
        const buttons = wrapper.findAll('button')
        expect(buttons.length).toBe(1)
        expect(buttons[0].classes()).toContain('intro-view__google-btn')
    })

    it('does NOT render a title or subtitle (minimal spec)', () => {
        const wrapper = mount(IntroView)
        expect(wrapper.find('h1').exists()).toBe(false)
        expect(wrapper.find('h2').exists()).toBe(false)
        // No paragraph text either — minimal page
        expect(wrapper.text().includes('SEF Chill Lounge')).toBe(false)
        expect(wrapper.text().includes('登入')).toBe(true) // button label is allowed
    })

    it('clicking the button sets window.location.href to a Google OAuth URL', async () => {
        vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'test-client-id')
        const wrapper = mount(IntroView)
        await wrapper.find('button').trigger('click')
        const href = (window as unknown as { location: { href: string } }).location.href
        expect(href).toContain('https://accounts.google.com/o/oauth2/v2/auth')
        expect(href).toContain('client_id=test-client-id')
        expect(href).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A9045%2Foauth2%2Fcallback')
    })
})
