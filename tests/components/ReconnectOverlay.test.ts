import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ReconnectOverlay from '@/components/ReconnectOverlay.vue'

describe('ReconnectOverlay', () => {
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('reconnecting 與 failed 皆 false 時不渲染任何 DOM', () => {
        const wrapper = mount(ReconnectOverlay, {
            props: { reconnecting: false, failed: false },
        })
        expect(wrapper.find('[data-test="reconnect-overlay"]').exists()).toBe(false)
    })

    it('reconnecting=true 顯示遮罩 + 蜥蜴 + 「重新連線中」，且無重新整理按鈕', () => {
        const wrapper = mount(ReconnectOverlay, {
            props: { reconnecting: true, failed: false },
        })
        expect(wrapper.find('[data-test="reconnect-overlay"]').exists()).toBe(true)
        expect(wrapper.find('img').attributes('alt')).toBe('lizardchi')
        expect(wrapper.text()).toContain('重新連線中')
        expect(wrapper.find('[data-test="reconnect-overlay-refresh"]').exists()).toBe(false)
    })

    it('failed=true 顯示「連線已中斷」+ 重新整理按鈕', () => {
        const wrapper = mount(ReconnectOverlay, {
            props: { reconnecting: false, failed: true },
        })
        expect(wrapper.find('[data-test="reconnect-overlay"]').exists()).toBe(true)
        expect(wrapper.text()).toContain('連線已中斷')
        expect(wrapper.find('[data-test="reconnect-overlay-refresh"]').exists()).toBe(true)
    })

    it('按下重新整理按鈕會呼叫 location.reload()', async () => {
        const original = window.location
        const reloadSpy = vi.fn()
        Object.defineProperty(window, 'location', {
            configurable: true,
            value: { ...original, reload: reloadSpy },
        })

        const wrapper = mount(ReconnectOverlay, {
            props: { reconnecting: false, failed: true },
        })
        await wrapper.find('[data-test="reconnect-overlay-refresh"]').trigger('click')
        expect(reloadSpy).toHaveBeenCalledTimes(1)

        Object.defineProperty(window, 'location', { configurable: true, value: original })
    })

    it('reconnecting 與 failed 同時為真時以失敗態呈現（失敗優先）', () => {
        const wrapper = mount(ReconnectOverlay, {
            props: { reconnecting: true, failed: true },
        })
        expect(wrapper.text()).toContain('連線已中斷')
        expect(wrapper.find('[data-test="reconnect-overlay-refresh"]').exists()).toBe(true)
        expect(wrapper.text()).not.toContain('重新連線中')
    })

    it('失敗態 role=alertdialog；重連態 role=status + aria-live=polite', () => {
        const failed = mount(ReconnectOverlay, { props: { reconnecting: false, failed: true } })
        expect(failed.find('[data-test="reconnect-overlay"]').attributes('role')).toBe('alertdialog')

        const reconnecting = mount(ReconnectOverlay, { props: { reconnecting: true, failed: false } })
        const el = reconnecting.find('[data-test="reconnect-overlay"]')
        expect(el.attributes('role')).toBe('status')
        expect(el.attributes('aria-live')).toBe('polite')
    })
})
