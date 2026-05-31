import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

const { uploadStickerMock, deleteStickerMock } = vi.hoisted(() => ({
    uploadStickerMock: vi.fn(), deleteStickerMock: vi.fn(),
}))
vi.mock('@/api/stickerUploadApi', () => ({
    uploadSticker: uploadStickerMock,
    deleteSticker: deleteStickerMock,
    StickerUploadError: class extends Error {},
}))
vi.mock('@/utils/assetUrl', () => ({ assetUrl: (s: string) => s }))

import StickerManager from '@/components/StickerManager.vue'

function makeFile(name = 's.png') {
    return new File(['x'], name, { type: 'image/png' })
}

describe('StickerManager', () => {
    beforeEach(() => {
        uploadStickerMock.mockReset()
        deleteStickerMock.mockReset()
    })

    it('renders exactly 5 slots', () => {
        const wrapper = mount(StickerManager, { props: { initial: [] } })
        expect(wrapper.findAll('[data-test="sticker-slot"]')).toHaveLength(5)
    })

    it('isDirty becomes true after staging a file', async () => {
        const wrapper = mount(StickerManager, { props: { initial: [] } })
        const input = wrapper.findAll('input[type="file"]')[0]
        Object.defineProperty(input.element, 'files', { value: [makeFile()] })
        await input.trigger('change')
        expect((wrapper.vm as unknown as { isDirty: boolean }).isDirty).toBe(true)
    })

    it('saveAll uploads staged slots and deletes cleared slots', async () => {
        uploadStickerMock.mockResolvedValue({ id: 1, stickerNo: 1, sticker: '/sticker/u/1.png?v=2' })
        deleteStickerMock.mockResolvedValue(undefined)
        const wrapper = mount(StickerManager, {
            props: { initial: [{ id: 9, stickerNo: 2, sticker: '/sticker/u/2.png?v=1' }] },
        })
        const input1 = wrapper.findAll('input[type="file"]')[0]
        Object.defineProperty(input1.element, 'files', { value: [makeFile()] })
        await input1.trigger('change')
        await wrapper.findAll('[data-test="sticker-clear"]')[1].trigger('click')

        await (wrapper.vm as unknown as { saveAll: () => Promise<void> }).saveAll()

        expect(uploadStickerMock).toHaveBeenCalledWith(1, expect.any(File))
        expect(deleteStickerMock).toHaveBeenCalledWith(2)
        expect((wrapper.vm as unknown as { isDirty: boolean }).isDirty).toBe(false)
    })

    it('rejects oversized file before upload (shows error, no upload)', async () => {
        const wrapper = mount(StickerManager, { props: { initial: [] } })
        const big = new File([new Uint8Array(11 * 1024 * 1024)], 'big.png', { type: 'image/png' })
        const input = wrapper.findAll('input[type="file"]')[0]
        Object.defineProperty(input.element, 'files', { value: [big] })
        await input.trigger('change')
        expect(wrapper.find('[data-test="sticker-error"]').exists()).toBe(true)
        expect(uploadStickerMock).not.toHaveBeenCalled()
    })
})
