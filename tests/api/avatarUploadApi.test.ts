import { describe, it, expect, vi, beforeEach } from 'vitest'

const { postMock } = vi.hoisted(() => ({ postMock: vi.fn() }))

vi.mock('@/utils/request', () => ({
    default: { post: postMock },
}))

import { uploadAvatar, AvatarUploadError } from '@/api/avatarUploadApi'

describe('avatarUploadApi', () => {
    beforeEach(() => {
        postMock.mockReset()
    })

    it('posts multipart with file field and returns avatarPath', async () => {
        postMock.mockResolvedValue({
            code: 200, message: 'OK', data: { avatarPath: '/user/u-1.png' },
        })

        const file = new File(['x'], 'avatar.png', { type: 'image/png' })
        const result = await uploadAvatar(file)

        expect(result).toEqual({ avatarPath: '/user/u-1.png' })
        expect(postMock).toHaveBeenCalledTimes(1)
        const [url, formData] = postMock.mock.calls[0]
        expect(url).toBe('/upload/avatar')
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
        await expect(uploadAvatar(file)).rejects.toMatchObject({
            code: 413,
            message: 'file_too_large',
        })
    })

    it('throws fallback error when response has no body', async () => {
        postMock.mockRejectedValue({})

        const file = new File(['x'], 'avatar.png', { type: 'image/png' })
        await expect(uploadAvatar(file)).rejects.toMatchObject({
            code: 0,
            message: 'upload_failed',
        })
    })

    it('thrown error is an AvatarUploadError instance', async () => {
        postMock.mockRejectedValue({
            response: { status: 415, data: { message: 'unsupported_image_type' } },
        })

        const file = new File(['x'], 'avatar.exe', { type: 'image/jpeg' })
        try {
            await uploadAvatar(file)
            throw new Error('should have thrown')
        } catch (e) {
            expect(e).toBeInstanceOf(AvatarUploadError)
            expect((e as AvatarUploadError).code).toBe(415)
            expect((e as AvatarUploadError).message).toBe('unsupported_image_type')
        }
    })
})
