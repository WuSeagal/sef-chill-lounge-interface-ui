import { describe, it, expect, vi, beforeEach } from 'vitest'

const { postMock } = vi.hoisted(() => ({ postMock: vi.fn() }))

vi.mock('@/utils/request', () => ({
    default: { post: postMock },
}))

import { uploadChatImage, ImageUploadError } from '@/api/imageUploadApi'

describe('imageUploadApi', () => {
    beforeEach(() => {
        postMock.mockReset()
    })

    it('posts multipart with file field and returns response data', async () => {
        postMock.mockResolvedValue({
            code: 200, message: 'OK', data: { fileName: 'abc.png', url: '/image/abc.png' },
        })

        const file = new File(['x'], 'a.png', { type: 'image/png' })
        const result = await uploadChatImage(file)

        expect(result).toEqual({ fileName: 'abc.png', url: '/image/abc.png' })
        expect(postMock).toHaveBeenCalledTimes(1)
        const [url, formData] = postMock.mock.calls[0]
        expect(url).toBe('/upload/chat-image')
        expect(formData).toBeInstanceOf(FormData)
        expect((formData as FormData).get('file')).toBe(file)
    })

    it('throws structured error on 413', async () => {
        postMock.mockRejectedValue({
            response: {
                status: 413,
                data: { code: 413, message: 'file_too_large', data: { maxSizeMB: 10 } },
            },
        })

        const file = new File(['x'], 'big.png', { type: 'image/png' })
        await expect(uploadChatImage(file)).rejects.toMatchObject({
            code: 413,
            message: 'file_too_large',
        })
    })

    it('throws structured error on 415', async () => {
        postMock.mockRejectedValue({
            response: {
                status: 415,
                data: { code: 415, message: 'unsupported_image_type', data: null },
            },
        })

        const file = new File(['x'], 'evil.exe', { type: 'image/jpeg' })
        await expect(uploadChatImage(file)).rejects.toMatchObject({
            code: 415,
            message: 'unsupported_image_type',
        })
    })

    it('throws fallback error when response has no body', async () => {
        postMock.mockRejectedValue({})

        const file = new File(['x'], 'a.png', { type: 'image/png' })
        await expect(uploadChatImage(file)).rejects.toMatchObject({
            code: 0,
            message: 'upload_failed',
        })
    })

    it('thrown error is an ImageUploadError instance with stack trace', async () => {
        postMock.mockRejectedValue({
            response: { status: 415, data: { message: 'unsupported_image_type' } },
        })

        const file = new File(['x'], 'a.exe', { type: 'image/jpeg' })
        try {
            await uploadChatImage(file)
            throw new Error('should have thrown')
        } catch (e) {
            expect(e).toBeInstanceOf(ImageUploadError)
            expect(e).toBeInstanceOf(Error)
            expect((e as ImageUploadError).code).toBe(415)
            expect((e as ImageUploadError).message).toBe('unsupported_image_type')
            expect((e as Error).stack).toBeDefined()
        }
    })
})
