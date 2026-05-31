import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('@/components/SettingsTab.vue', () => ({
    default: { name: 'SettingsTab', setup(_: unknown, { expose }: { expose: (e: unknown) => void }) {
        expose({ isDirty: true, saveAll: vi.fn() }); return () => null } },
}))
vi.mock('@/components/StickerTab.vue', () => ({ default: { name: 'StickerTab', template: '<div />' } }))
vi.mock('@/components/TopicCardTab.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/components/FeedbackTab.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/components/DonateTab.vue', () => ({ default: { template: '<div />' } }))

import SettingsModal from '@/components/SettingsModal.vue'

describe('SettingsModal dirty guard on tab switch', () => {
    beforeEach(() => {
        vi.stubGlobal('confirm', vi.fn().mockReturnValue(false))
    })

    it('blocks tab switch when active tab is dirty and user cancels', async () => {
        const wrapper = mount(SettingsModal, { props: { open: true } })
        const stickerTab = wrapper.findAll('.settings-modal__tab')[1]
        await stickerTab.trigger('click')
        expect(window.confirm).toHaveBeenCalled()
        expect(wrapper.findComponent({ name: 'SettingsTab' }).exists()).toBe(true)
    })
})
