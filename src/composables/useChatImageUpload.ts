import { ref } from 'vue'
import { uploadChatImage, type ImageUploadError } from '@/api/imageUploadApi'

const MAX_FILES = 5

export function useChatImageUpload() {
    const selectedFiles = ref<File[]>([])
    const previews = ref<string[]>([])
    const uploadedUrls = ref<string[]>([])
    const uploading = ref(false)
    const error = ref<string | null>(null)

    function addFiles(files: FileList | File[]) {
        const incoming = Array.from(files)
        const available = MAX_FILES - selectedFiles.value.length
        if (incoming.length > available) {
            error.value = `最多 ${MAX_FILES} 張，多餘的已忽略`
        } else {
            error.value = null
        }
        const accepted = incoming.slice(0, available)
        for (const file of accepted) {
            selectedFiles.value.push(file)
            previews.value.push(URL.createObjectURL(file))
        }
    }

    function removeFile(index: number) {
        const url = previews.value[index]
        if (url) URL.revokeObjectURL(url)
        selectedFiles.value.splice(index, 1)
        previews.value.splice(index, 1)
    }

    async function uploadAll(): Promise<string[]> {
        uploading.value = true
        error.value = null
        const urls: string[] = []
        try {
            for (const file of selectedFiles.value) {
                const result = await uploadChatImage(file)
                urls.push(result.url)
                uploadedUrls.value.push(result.url)
            }
            return urls
        } catch (e) {
            const ie = e as ImageUploadError
            error.value = ie.message ?? 'upload_failed'
            throw e
        } finally {
            uploading.value = false
        }
    }

    function reset() {
        for (const url of previews.value) URL.revokeObjectURL(url)
        selectedFiles.value = []
        previews.value = []
        uploadedUrls.value = []
        uploading.value = false
        error.value = null
    }

    return {
        selectedFiles,
        previews,
        uploadedUrls,
        uploading,
        error,
        addFiles,
        removeFile,
        uploadAll,
        reset,
    }
}
