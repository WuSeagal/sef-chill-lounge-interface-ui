import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import LizardLoading from '@/components/LizardLoading.vue'

describe('LizardLoading', () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('渲染 lizardchi 圖、brand 與 message', () => {
        const wrapper = mount(LizardLoading, {
            props: { message: '同步中', brand: 'SEF·CLI' },
        })
        expect(wrapper.find('img').attributes('alt')).toBe('lizardchi')
        expect(wrapper.text()).toContain('SEF·CLI')
        expect(wrapper.text()).toContain('同步中')
    })

    it('未設定 refreshAfterMs 時不顯示重新整理按鈕', () => {
        const wrapper = mount(LizardLoading, { props: { message: '正在替你找位子' } })
        expect(wrapper.find('[data-test="lizard-refresh"]').exists()).toBe(false)
    })

    it('設定 refreshAfterMs 後，超過時間才顯示重新整理按鈕', async () => {
        const wrapper = mount(LizardLoading, {
            props: { message: '同步中', refreshAfterMs: 5000 },
        })
        expect(wrapper.find('[data-test="lizard-refresh"]').exists()).toBe(false)

        vi.advanceTimersByTime(5000)
        await wrapper.vm.$nextTick()

        expect(wrapper.find('[data-test="lizard-refresh"]').exists()).toBe(true)
    })

    it('點重新整理按鈕會導回 /（而非 reload，避免保留奇怪的 query）', async () => {
        const original = window.location
        Object.defineProperty(window, 'location', {
            configurable: true,
            value: { ...original, href: 'http://localhost:9045/?sync=1' },
        })

        const wrapper = mount(LizardLoading, {
            props: { message: '同步中', refreshAfterMs: 1000 },
        })
        vi.advanceTimersByTime(1000)
        await wrapper.vm.$nextTick()

        await wrapper.find('[data-test="lizard-refresh"]').trigger('click')
        expect(window.location.href).toBe('/')

        Object.defineProperty(window, 'location', { configurable: true, value: original })
    })
})
