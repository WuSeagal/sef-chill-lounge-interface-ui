import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import DashboardView from '@/views/DashboardView.vue'
import { resetMockMessagesForTest } from '@/composables/useMockMessages'

describe('DashboardView — structure', () => {
    beforeEach(() => {
        resetMockMessagesForTest()
    })

    it('renders a container with the grid-paper class', () => {
        const wrapper = mount(DashboardView)
        expect(wrapper.find('.grid-paper').exists()).toBe(true)
    })

    it('renders FloatingBubble components for mock messages', async () => {
        const wrapper = mount(DashboardView)
        await nextTick()
        const bubbles = wrapper.findAll('.floating-bubble')
        expect(bubbles.length).toBe(20)
    })

    it('renders a fullscreen toggle button', () => {
        const wrapper = mount(DashboardView)
        const btn = wrapper.find('.dashboard-view__fullscreen-btn')
        expect(btn.exists()).toBe(true)
        expect(btn.find('svg').exists()).toBe(true)
    })
})
