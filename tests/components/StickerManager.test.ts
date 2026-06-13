import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

const { uploadStickerMock, deleteStickerMock } = vi.hoisted(() => ({
    uploadStickerMock: vi.fn(),
    deleteStickerMock: vi.fn(),
}))
vi.mock('@/api/stickerUploadApi', () => ({
    uploadSticker: uploadStickerMock,
    deleteSticker: deleteStickerMock,
    StickerUploadError: class extends Error {},
}))
vi.mock('@/utils/assetUrl', () => ({ assetUrl: (s: string) => s }))

import StickerManager from '@/components/StickerManager.vue'
import type { Sticker } from '@/types/user'

function makeFile(name = 's.png', sizeBytes = 100): File {
    return new File([new Uint8Array(sizeBytes)], name, { type: 'image/png' })
}

function sticker(id: number, url: string): Sticker {
    return { id, sticker: url }
}

type ManagerVm = { isDirty: boolean; saveAll: () => Promise<void>; clearStaging: () => void; previews: string[] }

describe('StickerManager', () => {
    beforeEach(() => {
        uploadStickerMock.mockReset()
        deleteStickerMock.mockReset()
    })

    // 1. renders existing stickers and an add tile when under 5
    it('renders existing stickers and an add tile when under 5', () => {
        const wrapper = mount(StickerManager, {
            props: {
                initial: [
                    sticker(1, '/sticker/u/a.gif'),
                    sticker(2, '/sticker/u/b.gif'),
                ],
            },
        })
        expect(wrapper.findAll('[data-test="sticker-tile"]')).toHaveLength(2)
        expect(wrapper.find('[data-test="sticker-add"]').exists()).toBe(true)
    })

    // 1b. hint prop: custom text shown
    it('renders custom hint text when hint prop is provided', () => {
        const wrapper = mount(StickerManager, {
            props: { initial: [], hint: '最多可儲存5個貼圖，支援PNG/JPG/GIF/WEBP，檔案最大10MB。' },
        })
        const hint = wrapper.find('.sticker-manager__hint')
        expect(hint.exists()).toBe(true)
        expect(hint.text()).toBe('最多可儲存5個貼圖，支援PNG/JPG/GIF/WEBP，檔案最大10MB。')
    })

    // 1c. hint prop: null hides the hint entirely (onboarding)
    it('hides hint when hint prop is null', () => {
        const wrapper = mount(StickerManager, {
            props: { initial: [], hint: null },
        })
        expect(wrapper.find('.sticker-manager__hint').exists()).toBe(false)
    })

    // 2. hides add tile when 5 active
    it('hides add tile when 5 active', () => {
        const wrapper = mount(StickerManager, {
            props: {
                initial: [
                    sticker(1, '/sticker/u/a.gif'),
                    sticker(2, '/sticker/u/b.gif'),
                    sticker(3, '/sticker/u/c.gif'),
                    sticker(4, '/sticker/u/d.gif'),
                    sticker(5, '/sticker/u/e.gif'),
                ],
            },
        })
        expect(wrapper.find('[data-test="sticker-add"]').exists()).toBe(false)
    })

    // 3. staging a file sets isDirty and shows a new preview tile
    it('staging a file sets isDirty and shows a new preview tile', async () => {
        const wrapper = mount(StickerManager, {
            props: {
                initial: [
                    sticker(1, '/sticker/u/a.gif'),
                    sticker(2, '/sticker/u/b.gif'),
                ],
            },
        })
        const input = wrapper.find('[data-test="sticker-add"] input[type="file"]')
        Object.defineProperty(input.element, 'files', { value: [makeFile()], configurable: true })
        await input.trigger('change')

        expect((wrapper.vm as unknown as ManagerVm).isDirty).toBe(true)
        expect(wrapper.findAll('[data-test="sticker-tile"]')).toHaveLength(3)
    })

    // 4. delete an existing sticker stages removal and sets isDirty
    it('delete an existing sticker stages removal and sets isDirty', async () => {
        const wrapper = mount(StickerManager, {
            props: {
                initial: [
                    sticker(1, '/sticker/u/a.gif'),
                    sticker(2, '/sticker/u/b.gif'),
                ],
            },
        })
        // Click delete on first existing tile
        const removeBtn = wrapper.find('[data-test="sticker-remove"]')
        await removeBtn.trigger('click')

        expect((wrapper.vm as unknown as ManagerVm).isDirty).toBe(true)
        // Visible existing tiles decreases by 1
        expect(wrapper.findAll('[data-test="sticker-tile"]')).toHaveLength(1)
    })

    // 5. saveAll uploads staged-new and deletes staged-removed
    it('saveAll uploads staged-new and deletes staged-removed', async () => {
        uploadStickerMock.mockResolvedValue({ id: 10, sticker: '/sticker/u/new.png' })
        deleteStickerMock.mockResolvedValue(undefined)

        const wrapper = mount(StickerManager, {
            props: { initial: [sticker(9, '/sticker/u/a.gif')] },
        })

        // Stage a new file
        const input = wrapper.find('[data-test="sticker-add"] input[type="file"]')
        Object.defineProperty(input.element, 'files', { value: [makeFile()], configurable: true })
        await input.trigger('change')

        // Stage-delete the existing id 9
        const removeBtn = wrapper.find('[data-test="sticker-remove"]')
        await removeBtn.trigger('click')

        const vm = wrapper.vm as unknown as ManagerVm
        await vm.saveAll()

        expect(deleteStickerMock).toHaveBeenCalledWith(9)
        expect(uploadStickerMock).toHaveBeenCalledWith(expect.any(File))
        expect(vm.isDirty).toBe(false)
    })

    // 6. rejects oversized file (error shown, not staged, no upload)
    it('rejects oversized file (error shown, not staged, no upload)', async () => {
        const wrapper = mount(StickerManager, { props: { initial: [] } })
        const bigFile = new File([new Uint8Array(11 * 1024 * 1024)], 'big.png', { type: 'image/png' })
        const input = wrapper.find('[data-test="sticker-add"] input[type="file"]')
        Object.defineProperty(input.element, 'files', { value: [bigFile], configurable: true })
        await input.trigger('change')

        expect(wrapper.find('[data-test="sticker-error"]').exists()).toBe(true)
        expect(uploadStickerMock).not.toHaveBeenCalled()
        expect((wrapper.vm as unknown as ManagerVm).isDirty).toBe(false)
    })

    // 7. previews is exposed and reflects existing (non-deleted) + staged items
    it('previews reflects existing non-deleted and staged items', async () => {
        Object.defineProperty(URL, 'createObjectURL', {
            configurable: true,
            writable: true,
            value: vi.fn(() => 'blob:staged-preview'),
        })

        const wrapper = mount(StickerManager, {
            props: {
                initial: [
                    sticker(1, '/sticker/u/a.gif'),
                    sticker(2, '/sticker/u/b.gif'),
                ],
            },
        })

        const vm = wrapper.vm as unknown as ManagerVm
        // Initially: two existing items both non-deleted
        expect(vm.previews).toEqual(['/sticker/u/a.gif', '/sticker/u/b.gif'])

        // Mark first existing staged for deletion — should drop from previews
        const removeBtn = wrapper.find('[data-test="sticker-remove"]')
        await removeBtn.trigger('click')
        expect(vm.previews).toEqual(['/sticker/u/b.gif'])

        // Stage a new file — should appear in previews
        const input = wrapper.find('[data-test="sticker-add"] input[type="file"]')
        Object.defineProperty(input.element, 'files', { value: [makeFile()], configurable: true })
        await input.trigger('change')
        expect(vm.previews).toContain('blob:staged-preview')
        expect(vm.previews).toHaveLength(2)
    })
})
