import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useChatImageUpload } from '@/composables/useChatImageUpload'

vi.mock('@/api/imageUploadApi', () => ({
    uploadChatImage: vi.fn(),
}))

import { uploadChatImage } from '@/api/imageUploadApi'

describe('useChatImageUpload', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        global.URL.createObjectURL = vi.fn((blob) => 'blob:' + (blob as File).name)
        global.URL.revokeObjectURL = vi.fn()
    })

    function f(name: string) {
        return new File(['x'], name, { type: 'image/png' })
    }

    it('addFiles populates selectedFiles and previews', () => {
        const u = useChatImageUpload()
        u.addFiles([f('a.png'), f('b.png')])
        expect(u.selectedFiles.value).toHaveLength(2)
        expect(u.previews.value).toEqual(['blob:a.png', 'blob:b.png'])
        expect(u.error.value).toBeNull()
    })

    it('addFiles hard-rejects whole batch when would exceed limit', () => {
        const u = useChatImageUpload()
        const ok = u.addFiles([f('1'), f('2'), f('3'), f('4'), f('5'), f('6')])
        expect(ok).toBe(false)
        expect(u.selectedFiles.value).toHaveLength(0)
        expect(u.error.value).toContain('5')
    })

    it('addFiles rejects when already at limit', () => {
        const u = useChatImageUpload()
        u.addFiles([f('1'), f('2'), f('3'), f('4'), f('5')])
        expect(u.isAtLimit()).toBe(true)

        const ok = u.addFiles([f('paste-1')])
        expect(ok).toBe(false)
        expect(u.selectedFiles.value).toHaveLength(5)
    })

    it('removeFile drops at index and revokes object URL', () => {
        const u = useChatImageUpload()
        u.addFiles([f('a.png'), f('b.png')])
        u.removeFile(0)
        expect(u.selectedFiles.value).toHaveLength(1)
        expect(u.previews.value).toEqual(['blob:b.png'])
        expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:a.png')
    })

    it('uploadAll calls api for each, pushes urls, and drains selectedFiles', async () => {
        ;(uploadChatImage as unknown as ReturnType<typeof vi.fn>)
            .mockResolvedValueOnce({ fileName: 'a-1.png', url: '/image/a-1.png' })
            .mockResolvedValueOnce({ fileName: 'b-1.png', url: '/image/b-1.png' })

        const u = useChatImageUpload()
        u.addFiles([f('a.png'), f('b.png')])
        const urls = await u.uploadAll()

        expect(urls).toEqual(['/image/a-1.png', '/image/b-1.png'])
        expect(u.uploadedUrls.value).toEqual(['/image/a-1.png', '/image/b-1.png'])
        expect(u.uploading.value).toBe(false)
        // 成功上傳完每張就從 selectedFiles 移除，避免 retry 重複上傳
        expect(u.selectedFiles.value).toHaveLength(0)
        expect(u.previews.value).toHaveLength(0)
    })

    it('uploadAll keeps failed file in selectedFiles and removes succeeded ones', async () => {
        ;(uploadChatImage as unknown as ReturnType<typeof vi.fn>)
            .mockResolvedValueOnce({ fileName: 'a-1.png', url: '/image/a-1.png' })
            .mockRejectedValueOnce(new Error('file_too_large'))

        const u = useChatImageUpload()
        u.addFiles([f('a.png'), f('b.png')])
        await expect(u.uploadAll()).rejects.toBeDefined()

        expect(u.uploadedUrls.value).toEqual(['/image/a-1.png'])
        expect(u.selectedFiles.value).toHaveLength(1)
        expect(u.selectedFiles.value[0].name).toBe('b.png')
        // 'a' 已上傳成功 → revoke；'b' 失敗仍保留
        expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:a.png')
    })

    it('uploadAll uploading flag is true mid-flight and false after', async () => {
        let resolveUpload!: (v: unknown) => void
        ;(uploadChatImage as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
            new Promise((r) => { resolveUpload = r })
        )

        const u = useChatImageUpload()
        u.addFiles([f('a.png')])
        const p = u.uploadAll()
        expect(u.uploading.value).toBe(true)
        resolveUpload({ fileName: 'a.png', url: '/image/a.png' })
        await p
        expect(u.uploading.value).toBe(false)
    })

    it('addFiles returns false for empty input without setting error', () => {
        const u = useChatImageUpload()
        const before = u.errorVersion.value
        const ok = u.addFiles([])
        expect(ok).toBe(false)
        expect(u.error.value).toBeNull()
        expect(u.errorVersion.value).toBe(before)
    })

    it('addFiles works after reset', () => {
        const u = useChatImageUpload()
        u.addFiles([f('a.png')])
        u.reset()
        const ok = u.addFiles([f('b.png')])
        expect(ok).toBe(true)
        expect(u.selectedFiles.value).toHaveLength(1)
        expect(u.selectedFiles.value[0].name).toBe('b.png')
    })

    it('errorVersion bumps every time setError fires (even with same message)', () => {
        const u = useChatImageUpload()
        u.addFiles([f('1'), f('2'), f('3'), f('4'), f('5'), f('6')])
        const v1 = u.errorVersion.value
        u.addFiles([f('1'), f('2'), f('3'), f('4'), f('5'), f('6')])
        const v2 = u.errorVersion.value
        expect(v2).toBeGreaterThan(v1)
    })

    it('reset clears state and revokes all object URLs', () => {
        const u = useChatImageUpload()
        u.addFiles([f('a.png'), f('b.png')])
        u.reset()
        expect(u.selectedFiles.value).toHaveLength(0)
        expect(u.previews.value).toHaveLength(0)
        expect(u.uploadedUrls.value).toHaveLength(0)
        expect(u.error.value).toBeNull()
        expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:a.png')
        expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:b.png')
    })
})
