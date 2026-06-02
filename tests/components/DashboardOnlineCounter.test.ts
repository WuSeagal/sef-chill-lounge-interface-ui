import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DashboardOnlineCounter from '@/components/DashboardOnlineCounter.vue'

describe('DashboardOnlineCounter', () => {
    it('renders the online count number', () => {
        const w = mount(DashboardOnlineCounter, { props: { count: 12, connected: true } })
        expect(w.find('.dashboard-online-counter__num').text()).toBe('12')
    })

    it('dot is live (blinking) when connected', () => {
        const w = mount(DashboardOnlineCounter, { props: { count: 3, connected: true } })
        expect(w.find('.dashboard-online-counter__dot').classes()).toContain('is-live')
    })

    it('dot is not live when disconnected', () => {
        const w = mount(DashboardOnlineCounter, { props: { count: 3, connected: false } })
        expect(w.find('.dashboard-online-counter__dot').classes()).not.toContain('is-live')
    })
})
