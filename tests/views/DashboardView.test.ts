import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import type { DashboardBubble } from '@/composables/useDashboardBubbles'

const bubblesRef = ref<DashboardBubble[]>([])
const connectSpy = vi.fn()
const disconnectSpy = vi.fn()
const startAnimationSpy = vi.fn()
const stopAnimationSpy = vi.fn()
const cleanupSpy = vi.fn()

vi.mock('@/composables/useDashboardFeed', () => ({
    useDashboardFeed: () => ({
        bubbles: bubblesRef,
        connect: connectSpy,
        disconnect: disconnectSpy,
        startAnimation: startAnimationSpy,
        stopAnimation: stopAnimationSpy,
        cleanup: cleanupSpy,
    }),
}))

import DashboardView from '@/views/DashboardView.vue'

describe('DashboardView', () => {
    beforeEach(() => {
        bubblesRef.value = []
        connectSpy.mockClear()
        disconnectSpy.mockClear()
        startAnimationSpy.mockClear()
        cleanupSpy.mockClear()
    })

    it('renders a container with the grid-paper class', () => {
        const wrapper = mount(DashboardView)
        expect(wrapper.find('.grid-paper').exists()).toBe(true)
    })

    it('renders a fullscreen toggle button', () => {
        const wrapper = mount(DashboardView)
        const btn = wrapper.find('.dashboard-view__fullscreen-btn')
        expect(btn.exists()).toBe(true)
        expect(btn.find('svg').exists()).toBe(true)
    })

    it('connects the dashboard feed and starts animation on mount', () => {
        mount(DashboardView)
        expect(connectSpy).toHaveBeenCalledTimes(1)
        expect(startAnimationSpy).toHaveBeenCalledTimes(1)
    })

    it('cleans up and disconnects on unmount', () => {
        const wrapper = mount(DashboardView)
        wrapper.unmount()
        expect(cleanupSpy).toHaveBeenCalledTimes(1)
        expect(disconnectSpy).toHaveBeenCalledTimes(1)
    })
})
