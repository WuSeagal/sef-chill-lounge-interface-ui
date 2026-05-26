import { ref } from 'vue'
import { uploadChatImage, type ImageUploadError } from '@/api/imageUploadApi'

const MAX_FILES = 5

export function useChatImageUpload() {
    const selectedFiles = ref<File[]>([])
    const previews = ref<string[]>([])
    const uploadedUrls = ref<string[]>([])
    const uploading = ref(false)
    const error = ref<string | null>(null)

    /**
     * 加入待上傳圖檔。硬性上限 MAX_FILES：若批次後總數會超過上限，整批拒收
     * 並設定 error（呼叫方 watch error 後可用 Notivue 顯示）；不做部分接受、
     * 避免 user 沒注意 toast 就以為全部上傳了的誤解。回傳 true 代表成功加入。
     */
    function addFiles(files: FileList | File[]): boolean {
        const incoming = Array.from(files)
        if (incoming.length === 0) return false
        if (selectedFiles.value.length + incoming.length > MAX_FILES) {
            error.value = `一次最多 ${MAX_FILES} 張，請先移除一些再試`
            return false
        }
        error.value = null
        for (const file of incoming) {
            selectedFiles.value.push(file)
            previews.value.push(URL.createObjectURL(file))
        }
        return true
    }

    const isAtLimit = () => selectedFiles.value.length >= MAX_FILES

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
        isAtLimit,
        MAX_FILES,
    }
}
