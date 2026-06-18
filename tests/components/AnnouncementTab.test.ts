import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const { setAnnouncementMock } = vi.hoisted(() => ({ setAnnouncementMock: vi.fn() }))
vi.mock('@/api/announcementApi', () => ({ setAnnouncement: (...a: unknown[]) => setAnnouncementMock(...a) }))
vi.mock('notivue', () => ({ push: { error: vi.fn() } }))

import AnnouncementTab from '@/components/AnnouncementTab.vue'

describe('AnnouncementTab', () => {
    beforeEach(() => {
        setAnnouncementMock.mockReset().mockResolvedValue(undefined)
    })

    it('textarea 上限 200 字', () => {
        const wrapper = mount(AnnouncementTab)
        expect(wrapper.find('[data-test="announcement-input"]').attributes('maxlength')).toBe('200')
    })

    it('按「釘選」以目前內容呼叫 setAnnouncement', async () => {
        const wrapper = mount(AnnouncementTab)
        await wrapper.find('[data-test="announcement-input"]').setValue('開獎 18:00')
        await wrapper.find('[data-test="announcement-pin"]').trigger('click')
        await flushPromises()
        expect(setAnnouncementMock).toHaveBeenCalledWith('開獎 18:00')
    })

    it('按「取消釘選」以空字串呼叫 setAnnouncement', async () => {
        const wrapper = mount(AnnouncementTab)
        await wrapper.find('[data-test="announcement-input"]').setValue('x')
        await wrapper.find('[data-test="announcement-unpin"]').trigger('click')
        await flushPromises()
        expect(setAnnouncementMock).toHaveBeenCalledWith('')
    })
})
