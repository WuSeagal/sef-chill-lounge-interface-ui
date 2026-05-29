import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ToggleSwitch from '@/components/ToggleSwitch.vue'

describe('ToggleSwitch', () => {
    it('reflects modelValue on the checkbox', () => {
        const wrapper = mount(ToggleSwitch, { props: { modelValue: true } })
        const input = wrapper.find('input[type=checkbox]')
        expect((input.element as HTMLInputElement).checked).toBe(true)
    })

    it('emits update:modelValue with the new checked state on change', async () => {
        const wrapper = mount(ToggleSwitch, { props: { modelValue: false } })
        await wrapper.find('input[type=checkbox]').setValue(true)
        expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([true])
    })

    it('exposes role=switch and aria-label for a11y', () => {
        const wrapper = mount(ToggleSwitch, { props: { modelValue: false, ariaLabel: '顯示頭像外框' } })
        const input = wrapper.find('input[type=checkbox]')
        expect(input.attributes('role')).toBe('switch')
        expect(input.attributes('aria-label')).toBe('顯示頭像外框')
    })
})
