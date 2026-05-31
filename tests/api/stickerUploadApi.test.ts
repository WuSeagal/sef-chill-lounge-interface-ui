import { describe, it, expect, vi, beforeEach } from 'vitest'

const { postMock, deleteMock } = vi.hoisted(() => ({ postMock: vi.fn(), deleteMock: vi.fn() }))

vi.mock('@/utils/request', () => ({
    default: { post: postMock, delete: deleteMock },
}))

import { uploadSticker, deleteSticker, StickerUploadError } from '@/api/stickerUploadApi'

describe('stickerUploadApi', () => {
    beforeEach(() => {
        postMock.mockReset()
        deleteMock.mockReset()
    })

    it('uploadSticker posts multipart to /upload/sticker/{slot} and returns Sticker', async () => {
        postMock.mockResolvedValue({ code: 200, message: 'OK', data: { id: 1, stickerNo: 2, sticker: '/sticker/u-1/2.png?v=1' } })
        const file = new File(['x'], 's.png', { type: 'image/png' })

        const result = await uploadSticker(2, file)

        expect(result).toEqual({ id: 1, stickerNo: 2, sticker: '/sticker/u-1/2.png?v=1' })
        const [url, formData] = postMock.mock.calls[0]
        expect(url).toBe('/upload/sticker/2')
        expect(formData).toBeInstanceOf(FormData)
        expect((formData as FormData).get('file')).toBe(file)
    })

    it('deleteSticker calls DELETE /upload/sticker/{slot}', async () => {
        deleteMock.mockResolvedValue({ code: 200, message: 'OK', data: null })
        await deleteSticker(3)
        expect(deleteMock).toHaveBeenCalledWith('/upload/sticker/3')
    })

    it('uploadSticker throws structured StickerUploadError on 413', async () => {
        postMock.mockRejectedValue({ response: { status: 413, data: { message: 'file_too_large' } } })
        const file = new File(['x'], 'big.png', { type: 'image/png' })
        await expect(uploadSticker(1, file)).rejects.toMatchObject({ code: 413, message: 'file_too_large' })
    })

    it('thrown error is a StickerUploadError instance with fallback', async () => {
        postMock.mockRejectedValue({})
        const file = new File(['x'], 's.png', { type: 'image/png' })
        await expect(uploadSticker(1, file)).rejects.toBeInstanceOf(StickerUploadError)
    })
})
