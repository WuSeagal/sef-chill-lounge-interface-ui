import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
vi.mock('@/utils/assetUrl', () => ({ assetUrl: (s: string) => s }))
import StickerPicker from '@/components/StickerPicker.vue'

const stickers = [
    { id: 1, sticker: '/sticker/u/1.png?v=1' },
    { id: 2, sticker: '/sticker/u/2.gif?v=1' },
]

describe('StickerPicker', () => {
    it('renders nothing when closed', () => {
        const wrapper = mount(StickerPicker, { props: { open: false, stickers } })
        expect(wrapper.find('.sticker-picker').exists()).toBe(false)
    })

    it('emits select with sticker url on click', async () => {
        const wrapper = mount(StickerPicker, { props: { open: true, stickers } })
        await wrapper.findAll('[data-test="picker-sticker"]')[0].trigger('click')
        expect(wrapper.emitted('select')?.[0]).toEqual(['/sticker/u/1.png?v=1'])
    })

    it('shows empty hint when user has no stickers', () => {
        const wrapper = mount(StickerPicker, { props: { open: true, stickers: [] } })
        expect(wrapper.find('[data-test="picker-empty"]').exists()).toBe(true)
    })
})
