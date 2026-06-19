import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import LizardCard from '@/components/LizardCard.vue'

describe('LizardCard', () => {
    it('renders the grayscale lizard image', () => {
        const wrapper = mount(LizardCard)
        const img = wrapper.find('.lizard-card__lizard')
        expect(img.exists()).toBe(true)
        expect(img.attributes('alt')).toBe('lizardchi')
    })

    it('renders title, body and actions slots', () => {
        const wrapper = mount(LizardCard, {
            slots: {
                title: '<span class="t">標題文字</span>',
                body: '<span class="b">內文文字</span>',
                actions: '<button class="a">動作</button>',
            },
        })
        expect(wrapper.find('.t').text()).toBe('標題文字')
        expect(wrapper.find('.b').text()).toBe('內文文字')
        expect(wrapper.find('.a').text()).toBe('動作')
    })

    it('exposes the card container element', () => {
        const wrapper = mount(LizardCard)
        expect(wrapper.find('.lizard-card').exists()).toBe(true)
    })
})
