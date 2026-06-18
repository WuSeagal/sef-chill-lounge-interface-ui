import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TypingIndicator from '@/components/TypingIndicator.vue'
import type { TypingUser } from '@/composables/useTypingIndicator'

function user(overrides: Partial<TypingUser> = {}): TypingUser {
    return { userId: 'u-1', furName: 'Fox', avatar: '/fox.png', avatarColor: '#abc', ...overrides }
}

describe('TypingIndicator', () => {
    it('typers 空時不渲染任何 DOM', () => {
        const wrapper = mount(TypingIndicator, { props: { typers: [] } })
        expect(wrapper.find('[data-test="typing-indicator"]').exists()).toBe(false)
    })

    it('1 人輸入中 → 顯示頭像 + 三點氣泡，不顯示名字文字', () => {
        const wrapper = mount(TypingIndicator, { props: { typers: [user({ furName: 'Fox' })] } })
        expect(wrapper.find('[data-test="typing-indicator"]').exists()).toBe(true)
        expect(wrapper.findAll('.typing-indicator__avatar')).toHaveLength(1)
        expect(wrapper.find('.typing-indicator__bubble').exists()).toBe(true)
        // 不顯示「名字＋輸入中」文字
        expect(wrapper.text()).not.toContain('Fox')
    })

    it('7 人輸入中 → 顯示 3 個頭像 + 「+4」', () => {
        const typers = Array.from({ length: 7 }, (_, i) => user({ userId: `u-${i}`, furName: `N${i}` }))
        const wrapper = mount(TypingIndicator, { props: { typers } })
        expect(wrapper.findAll('.typing-indicator__avatar')).toHaveLength(3)
        expect(wrapper.find('.typing-indicator__more').text()).toBe('+4')
    })

    it('3 人剛好不顯示 +N', () => {
        const typers = Array.from({ length: 3 }, (_, i) => user({ userId: `u-${i}` }))
        const wrapper = mount(TypingIndicator, { props: { typers } })
        expect(wrapper.findAll('.typing-indicator__avatar')).toHaveLength(3)
        expect(wrapper.find('.typing-indicator__more').exists()).toBe(false)
    })

    it('aria-label 含正在輸入者的 furName（供報讀）', () => {
        const wrapper = mount(TypingIndicator, { props: { typers: [user({ furName: '小蜥蜴' })] } })
        const label = wrapper.find('[data-test="typing-indicator"]').attributes('aria-label') ?? ''
        expect(label).toContain('小蜥蜴')
        expect(label).toContain('正在輸入')
    })
})
