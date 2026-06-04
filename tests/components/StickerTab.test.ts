import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

const profile = ref<{ stickers: { id: number; sticker: string }[] } | null>(null)
vi.mock('@/composables/useUser', () => ({
    useUser: () => ({ profile, fetchProfile: vi.fn() }),
}))
const { saveAllSpy } = vi.hoisted(() => ({ saveAllSpy: vi.fn() }))
vi.mock('@/components/StickerManager.vue', () => ({
    default: {
        name: 'StickerManager',
        props: ['initial'],
        setup(_: unknown, { expose }: { expose: (e: unknown) => void }) {
            expose({ isDirty: ref(false), saveAll: saveAllSpy, clearStaging: vi.fn() })
            return () => null
        },
    },
}))

import StickerTab from '@/components/StickerTab.vue'

describe('StickerTab', () => {
    beforeEach(() => {
        saveAllSpy.mockReset()
        profile.value = { stickers: [{ id: 1, sticker: '/sticker/u/1.png?v=1' }] }
    })

    it('renders a save button', () => {
        const wrapper = mount(StickerTab)
        expect(wrapper.find('[data-test="sticker-save"]').exists()).toBe(true)
    })

    it('exposes isDirty and saveAll', () => {
        const wrapper = mount(StickerTab)
        const vm = wrapper.vm as unknown as { isDirty: boolean; saveAll: () => Promise<void> }
        expect(typeof vm.saveAll).toBe('function')
        expect('isDirty' in vm).toBe(true)
    })

    it('內容置於水平垂直置中強調的 stage 容器', () => {
        const wrapper = mount(StickerTab)
        expect(wrapper.find('.sticker-tab__stage').exists()).toBe(true)
    })
})
