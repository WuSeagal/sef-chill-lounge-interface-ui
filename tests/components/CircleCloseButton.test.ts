import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CircleCloseButton from '@/components/CircleCloseButton.vue'

describe('CircleCloseButton', () => {
  it('渲染 button 並帶 aria-label', () => {
    const wrapper = mount(CircleCloseButton, { props: { ariaLabel: '刪除貼圖' } })
    const btn = wrapper.get('button')
    expect(btn.attributes('aria-label')).toBe('刪除貼圖')
    expect(wrapper.find('svg').exists()).toBe(true)
  })

  it('點擊 emit remove', async () => {
    const wrapper = mount(CircleCloseButton, { props: { ariaLabel: 'x' } })
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('remove')).toHaveLength(1)
  })
})
