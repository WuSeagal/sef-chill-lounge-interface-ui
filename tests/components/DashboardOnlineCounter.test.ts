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

    it('是可點擊按鈕，點擊 emit click（people-directory 入口）', async () => {
        const w = mount(DashboardOnlineCounter, { props: { count: 5, connected: true } })
        await w.find('button.dashboard-online-counter').trigger('click')
        expect(w.emitted('click')?.length).toBe(1)
    })

    it('具可存取標籤（含人數）', () => {
        const w = mount(DashboardOnlineCounter, { props: { count: 7, connected: true } })
        expect(w.get('.dashboard-online-counter').attributes('aria-label')).toContain('7')
    })
})
