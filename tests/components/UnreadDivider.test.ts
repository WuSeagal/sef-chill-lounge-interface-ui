import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import UnreadDivider from '@/components/UnreadDivider.vue'

describe('UnreadDivider', () => {
    it('pill 顯示「新訊息」文字 + SVG 向下箭頭（不帶數量、箭頭非文字字元）', () => {
        const wrapper = mount(UnreadDivider)
        expect(wrapper.find('.unread-divider__label').text()).toBe('新訊息')
        expect(wrapper.find('.unread-divider__arrow').exists()).toBe(true)
        // 箭頭是 SVG 不是文字字元，故 pill 文字只有「新訊息」
        expect(wrapper.find('.unread-divider__pill').text()).toBe('新訊息')
    })

    it('root 帶 separator role、aria-label「新訊息」、aria-live=polite', () => {
        const wrapper = mount(UnreadDivider)
        const root = wrapper.find('.unread-divider')
        expect(root.attributes('role')).toBe('separator')
        expect(root.attributes('aria-label')).toBe('新訊息')
        expect(root.attributes('aria-live')).toBe('polite')
    })

    it('leaving=true 時加上 is-leaving class', () => {
        const wrapper = mount(UnreadDivider, { props: { leaving: true } })
        expect(wrapper.find('.unread-divider').classes()).toContain('is-leaving')
    })

    it('leaving 預設 false（無 is-leaving）', () => {
        const wrapper = mount(UnreadDivider)
        expect(wrapper.find('.unread-divider').classes()).not.toContain('is-leaving')
    })
})
