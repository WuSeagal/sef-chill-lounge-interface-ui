import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import type { DashboardBubble } from '@/composables/useDashboardBubbles'

const bubblesRef = ref<DashboardBubble[]>([])
const onlineCountRef = ref(0)
const connectedRef = ref(false)
const readyRef = ref(true)
const connectSpy = vi.fn()
const disconnectSpy = vi.fn()
const startAnimationSpy = vi.fn()
const stopAnimationSpy = vi.fn()
const cleanupSpy = vi.fn()

vi.mock('@/composables/useDashboardFeed', () => ({
    useDashboardFeed: () => ({
        bubbles: bubblesRef,
        onlineCount: onlineCountRef,
        connected: connectedRef,
        ready: readyRef,
        connect: connectSpy,
        disconnect: disconnectSpy,
        startAnimation: startAnimationSpy,
        stopAnimation: stopAnimationSpy,
        cleanup: cleanupSpy,
    }),
}))

// 封禁 gate 來源：可控的假 auth store user（預設 null → 非 banned，既有測試走正常分支）。
const authUserHolder: { value: null | { providerUserId: string; banned?: boolean } } = { value: null }
vi.mock('@/stores/auth', () => ({
    useAuthStore: () => ({ get user() { return authUserHolder.value } }),
}))

import DashboardView from '@/views/DashboardView.vue'

describe('DashboardView', () => {
    beforeEach(() => {
        bubblesRef.value = []
        onlineCountRef.value = 0
        connectedRef.value = false
        readyRef.value = true
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

    it('ready=false 時顯示載入動畫覆蓋 grid', () => {
        readyRef.value = false
        const wrapper = mount(DashboardView)
        expect(wrapper.find('.dashboard-view__loading').exists()).toBe(true)
    })

    it('ready=true 時不顯示載入動畫', () => {
        readyRef.value = true
        const wrapper = mount(DashboardView)
        expect(wrapper.find('.dashboard-view__loading').exists()).toBe(false)
    })

    it('cleans up and disconnects on unmount', () => {
        const wrapper = mount(DashboardView)
        wrapper.unmount()
        expect(cleanupSpy).toHaveBeenCalledTimes(1)
        expect(disconnectSpy).toHaveBeenCalledTimes(1)
    })
})

describe('DashboardView 封禁 gate', () => {
    beforeEach(() => {
        bubblesRef.value = []
        onlineCountRef.value = 0
        connectedRef.value = false
        readyRef.value = true
        connectSpy.mockClear()
        disconnectSpy.mockClear()
        startAnimationSpy.mockClear()
        cleanupSpy.mockClear()
        authUserHolder.value = null
    })

    afterEach(() => {
        authUserHolder.value = null
    })

    it('banned=true 時顯示 BannedScreen、不渲染儀表板內容', () => {
        authUserHolder.value = { providerUserId: 'u-banned', banned: true }
        const wrapper = mount(DashboardView)

        expect(wrapper.find('.banned-screen').exists()).toBe(true)
        expect(wrapper.find('.dashboard-view').exists()).toBe(false)
        wrapper.unmount()
    })

    it('banned=false 時正常顯示儀表板，不顯示 BannedScreen', () => {
        authUserHolder.value = { providerUserId: 'u-normal', banned: false }
        const wrapper = mount(DashboardView)

        expect(wrapper.find('.banned-screen').exists()).toBe(false)
        expect(wrapper.find('.dashboard-view').exists()).toBe(true)
        wrapper.unmount()
    })
})
