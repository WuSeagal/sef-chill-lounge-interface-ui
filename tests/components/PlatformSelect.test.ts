import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import PlatformSelect from '@/components/PlatformSelect.vue'

function mountSelect(props: Record<string, unknown> = {}) {
    return mount(PlatformSelect, {
        attachTo: document.body,
        props: { modelValue: '', dataTest: 'plat', ...props },
    })
}

describe('PlatformSelect', () => {
    afterEach(() => {
        document.body.innerHTML = ''
    })

    it('未選擇時 trigger 顯示 placeholder，且 combobox aria-expanded=false', () => {
        const wrapper = mountSelect({ placeholder: '選擇平台…' })
        const trigger = wrapper.find('[role="combobox"]')
        expect(trigger.exists()).toBe(true)
        expect(trigger.attributes('aria-expanded')).toBe('false')
        expect(wrapper.text()).toContain('選擇平台…')
        // 未開啟時沒有 listbox
        expect(wrapper.find('[role="listbox"]').exists()).toBe(false)
    })

    it('已選擇時 trigger 顯示該平台 label 與 icon（inline svg）', () => {
        const wrapper = mountSelect({ modelValue: 'GITHUB' })
        expect(wrapper.text()).toContain('GitHub')
        // icon 以 inline svg 呈現
        expect(wrapper.find('[role="combobox"]').html()).toContain('<svg')
    })

    it('點 trigger 開啟 listbox，列出所有平台 option 並帶 icon', async () => {
        const wrapper = mountSelect()
        await wrapper.find('[role="combobox"]').trigger('click')
        const list = wrapper.find('[role="listbox"]')
        expect(list.exists()).toBe(true)
        expect(wrapper.find('[role="combobox"]').attributes('aria-expanded')).toBe('true')
        const options = wrapper.findAll('[role="option"]')
        expect(options.length).toBeGreaterThanOrEqual(14)
        // 每個 option 都有 icon
        expect(options[0].html()).toContain('<svg')
    })

    it('點某 option 會 emit update:modelValue 並關閉', async () => {
        const wrapper = mountSelect()
        await wrapper.find('[role="combobox"]').trigger('click')
        await wrapper.find('[role="option"][data-value="X"]').trigger('click')
        expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['X'])
        expect(wrapper.find('[role="listbox"]').exists()).toBe(false)
    })

    it('已選 option 標記 aria-selected=true', async () => {
        const wrapper = mountSelect({ modelValue: 'X' })
        await wrapper.find('[role="combobox"]').trigger('click')
        const selected = wrapper.find('[role="option"][data-value="X"]')
        expect(selected.attributes('aria-selected')).toBe('true')
    })

    it('Esc 關閉 listbox', async () => {
        const wrapper = mountSelect()
        await wrapper.find('[role="combobox"]').trigger('click')
        expect(wrapper.find('[role="listbox"]').exists()).toBe(true)
        await wrapper.find('[role="combobox"]').trigger('keydown', { key: 'Escape' })
        expect(wrapper.find('[role="listbox"]').exists()).toBe(false)
    })

    it('鍵盤 ArrowDown + Enter 可選取（開啟後第一個 ArrowDown 落在第一項）', async () => {
        const wrapper = mountSelect()
        const trigger = wrapper.find('[role="combobox"]')
        await trigger.trigger('keydown', { key: 'ArrowDown' }) // open + active first
        expect(wrapper.find('[role="listbox"]').exists()).toBe(true)
        await trigger.trigger('keydown', { key: 'Enter' })
        // 應 emit 第一個平台值（FACEBOOK 依 PLATFORM_LIST 順序）
        expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['FACEBOOK'])
    })

    it('data-test 透傳到根元素', () => {
        const wrapper = mountSelect({ dataTest: 'social-platform-0' })
        expect(wrapper.find('[data-test="social-platform-0"]').exists()).toBe(true)
    })
})
