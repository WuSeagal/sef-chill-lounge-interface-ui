import request from '@/utils/request'

export interface ChatImageUploadResponse {
    fileName: string
    url: string
}

export class ImageUploadError extends Error {
    public readonly code: number

    constructor(code: number, message: string) {
        super(message)
        this.name = 'ImageUploadError'
        this.code = code
    }
}

export async function uploadChatImage(file: File): Promise<ChatImageUploadResponse> {
    const formData = new FormData()
    formData.append('file', file)
    try {
        // request 的 response interceptor 已解包 ApiResponse，回傳值就是 { code, message, data }
        const envelope = await request.post('/upload/chat-image', formData) as unknown as {
            code: number
            message: string
            data: ChatImageUploadResponse
        }
        return envelope.data
    } catch (err) {
        if (err instanceof ImageUploadError) throw err
        const e = err as { response?: { status?: number; data?: { message?: string } } }
        throw new ImageUploadError(
            e.response?.status ?? 0,
            e.response?.data?.message ?? 'upload_failed',
        )
    }
}
