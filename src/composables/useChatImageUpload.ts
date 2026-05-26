import { ref } from 'vue'
import { uploadChatImage, type ImageUploadError } from '@/api/imageUploadApi'

const MAX_FILES = 5

export function useChatImageUpload() {
    const selectedFiles = ref<File[]>([])
    const previews = ref<string[]>([])
    const uploadedUrls = ref<string[]>([])
    const uploading = ref(false)
    const error = ref<string | null>(null)
    // 每次 setError 都會 bump 一次，watcher 用它當訊號才不會因為連續相同 message 被去重
    const errorVersion = ref(0)

    function setError(message: string | null) {
        error.value = message
        if (message !== null) errorVersion.value++
    }

    /**
     * 加入待上傳圖檔。硬性上限 MAX_FILES：若批次後總數會超過上限，整批拒收
     * 並設定 error（呼叫方 watch errorVersion 後用 Notivue 顯示）。
     * 回傳 true 代表成功加入；空陣列、超量都回 false。
     */
    function addFiles(files: FileList | File[]): boolean {
        const incoming = Array.from(files)
        if (incoming.length === 0) return false
        if (selectedFiles.value.length + incoming.length > MAX_FILES) {
            setError(`一次最多 ${MAX_FILES} 張，請先移除一些再試`)
            return false
        }
        setError(null)
        for (const file of incoming) {
            selectedFiles.value.push(file)
            previews.value.push(URL.createObjectURL(file))
        }
        return true
    }

    function removeFile(index: number) {
        const url = previews.value[index]
        if (url) URL.revokeObjectURL(url)
        selectedFiles.value.splice(index, 1)
        previews.value.splice(index, 1)
    }

    /**
     * 逐一上傳 selectedFiles。每筆成功即從 selectedFiles / previews 移除並 revoke
     * blob URL — retry 時不會重傳已成功的檔。第一筆失敗即停下，把剩餘檔留給 user
     * 移除或修正後重 send。
     */
    async function uploadAll(): Promise<string[]> {
        uploading.value = true
        setError(null)
        const urls: string[] = []
        // snapshot 防 user 上傳中再 addFiles 改動陣列；新加的不會被這次 loop 撿走
        const snapshot = [...selectedFiles.value]
        try {
            for (const file of snapshot) {
                const result = await uploadChatImage(file)
                urls.push(result.url)
                uploadedUrls.value.push(result.url)
                const idx = selectedFiles.value.indexOf(file)
                if (idx >= 0) {
                    const previewUrl = previews.value[idx]
                    if (previewUrl) URL.revokeObjectURL(previewUrl)
                    selectedFiles.value.splice(idx, 1)
                    previews.value.splice(idx, 1)
                }
            }
            return urls
        } catch (e) {
            const ie = e as ImageUploadError
            setError(ie.message ?? 'upload_failed')
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
        setError(null)
    }

    const isAtLimit = () => selectedFiles.value.length >= MAX_FILES

    return {
        selectedFiles,
        previews,
        uploadedUrls,
        uploading,
        error,
        errorVersion,
        addFiles,
        removeFile,
        uploadAll,
        reset,
        isAtLimit,
        MAX_FILES,
    }
}
