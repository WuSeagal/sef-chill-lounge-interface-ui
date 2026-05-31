import request from '@/utils/request'

export interface AvatarUploadResponse {
    avatarPath: string
}

export class AvatarUploadError extends Error {
    public readonly code: number

    constructor(code: number, message: string) {
        super(message)
        this.name = 'AvatarUploadError'
        this.code = code
    }
}

export async function uploadAvatar(file: File): Promise<AvatarUploadResponse> {
    const formData = new FormData()
    formData.append('file', file)
    try {
        const envelope = await request.post('/upload/avatar', formData) as unknown as {
            code: number
            message: string
            data: AvatarUploadResponse
        }
        return envelope.data
    } catch (err) {
        if (err instanceof AvatarUploadError) throw err
        const e = err as { response?: { status?: number; data?: { message?: string } } }
        throw new AvatarUploadError(
            e.response?.status ?? 0,
            e.response?.data?.message ?? 'upload_failed',
        )
    }
}
