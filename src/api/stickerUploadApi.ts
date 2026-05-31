import request from '@/utils/request'
import type { Sticker } from '@/types/user'

export class StickerUploadError extends Error {
    public readonly code: number

    constructor(code: number, message: string) {
        super(message)
        this.name = 'StickerUploadError'
        this.code = code
    }
}

export async function uploadSticker(file: File): Promise<Sticker> {
    const formData = new FormData()
    formData.append('file', file)
    try {
        const envelope = await request.post('/upload/sticker', formData) as unknown as {
            code: number
            message: string
            data: Sticker
        }
        return envelope.data
    } catch (err) {
        if (err instanceof StickerUploadError) throw err
        const e = err as { response?: { status?: number; data?: { message?: string } } }
        throw new StickerUploadError(
            e.response?.status ?? 0,
            e.response?.data?.message ?? 'upload_failed',
        )
    }
}

export async function deleteSticker(id: number): Promise<void> {
    await request.delete(`/upload/sticker/${id}`)
}
