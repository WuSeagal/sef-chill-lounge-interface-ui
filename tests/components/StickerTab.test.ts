import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'
import { mount } from '@vue/test-utils'
import StickerTab from '@/components/StickerTab.vue'
import type { UserProfile } from '@/types/user'

const profileRef = ref<UserProfile | null>({
    userId: 'u-1', username: '小毛', furName: 'MaoMao', avatar: null,
    avatarColor: null, topicId: null,
    stickers: [
        { id: 1, stickerNo: 1, sticker: '/mock/s1.png' },
        { id: 2, stickerNo: 2, sticker: '/mock/s2.png' },
        { id: 3, stickerNo: 3, sticker: '/mock/s3.png' },
        { id: 4, stickerNo: 4, sticker: '/mock/s4.png' },
        { id: 5, stickerNo: 5, sticker: '/mock/s5.png' },
    ],
})

vi.mock('@/composables/useUser', () => ({
    useUser: () => ({ profile: profileRef }),
}))

describe('StickerTab', () => {
    it('渲染 5 個 slot', () => {
        const wrapper = mount(StickerTab)
        expect(wrapper.findAll('.sticker-tab__slot')).toHaveLength(5)
    })

    it('每個 slot 顯示 sticker img', () => {
        const wrapper = mount(StickerTab)
        const imgs = wrapper.findAll('.sticker-tab__img')
        expect(imgs[0].attributes('src')).toBe('/mock/s1.png')
    })

    it('每個 slot 有上傳 input', () => {
        const wrapper = mount(StickerTab)
        expect(wrapper.findAll('.sticker-tab__upload')).toHaveLength(5)
    })
})
