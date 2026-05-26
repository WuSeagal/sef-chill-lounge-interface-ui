import axios from 'axios'

export interface ChatImageUploadResponse {
    fileName: string
    url: string
}

export interface ImageUploadError {
    code: number
    message: string
}

export async function uploadChatImage(file: File): Promise<ChatImageUploadResponse> {
    const formData = new FormData()
    formData.append('file', file)
    try {
        const response = await axios.post<{
            code: number
            message: string
            data: ChatImageUploadResponse
        }>('/upload/chat-image', formData)
        return response.data.data
    } catch (err) {
        const e = err as { response?: { status?: number; data?: { message?: string } } }
        throw {
            code: e.response?.status ?? 0,
            message: e.response?.data?.message ?? 'upload_failed',
        } as ImageUploadError
    }
}
