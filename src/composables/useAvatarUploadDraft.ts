import { ref } from 'vue'
import type { AvatarCropState } from '@/types/avatar'

export function useAvatarUploadDraft() {
    const file = ref<File | null>(null)
    const previewUrl = ref<string | null>(null)
    const originalFile = ref<File | null>(null)
    const originalUrl = ref<string | null>(null)
    const sourceFile = ref<File | null>(null)
    const sourceUrl = ref<string | null>(null)
    const cropOpen = ref(false)
    const cropState = ref<AvatarCropState | null>(null)
    const modalCropState = ref<AvatarCropState | null>(null)

    function revokePreview() {
        if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
    }

    function revokeSource() {
        if (sourceUrl.value) URL.revokeObjectURL(sourceUrl.value)
    }

    function revokeOriginal() {
        if (originalUrl.value) URL.revokeObjectURL(originalUrl.value)
    }

    function setCropSource(next: File) {
        if (sourceUrl.value && sourceUrl.value !== originalUrl.value) {
            revokeSource()
        }
        sourceFile.value = next
        sourceUrl.value = URL.createObjectURL(next)
        modalCropState.value = null
        cropOpen.value = true
    }

    function cancelCrop() {
        if (sourceUrl.value && sourceUrl.value !== originalUrl.value) {
            revokeSource()
        }
        sourceFile.value = null
        sourceUrl.value = null
        modalCropState.value = null
        cropOpen.value = false
    }

    async function setCroppedResult(
        next: File,
        nextCropState: AvatarCropState = { zoom: 1, offsetX: 0, offsetY: 0 },
    ) {
        revokePreview()
        file.value = next
        previewUrl.value = URL.createObjectURL(next)
        cropState.value = nextCropState

        if (sourceFile.value && sourceUrl.value) {
            if (originalUrl.value && originalUrl.value !== sourceUrl.value) {
                revokeOriginal()
            }
            originalFile.value = sourceFile.value
            originalUrl.value = sourceUrl.value
        }

        sourceFile.value = null
        sourceUrl.value = null
        modalCropState.value = null
        cropOpen.value = false
    }

    function reopenCrop() {
        if (!originalFile.value || !originalUrl.value) return
        if (sourceUrl.value && sourceUrl.value !== originalUrl.value) {
            revokeSource()
        }
        sourceFile.value = originalFile.value
        sourceUrl.value = originalUrl.value
        modalCropState.value = cropState.value
        cropOpen.value = true
    }

    function clearDraft() {
        revokePreview()
        previewUrl.value = null
        file.value = null
        cropState.value = null
        modalCropState.value = null
        if (sourceUrl.value && sourceUrl.value !== originalUrl.value) {
            revokeSource()
        }
        sourceFile.value = null
        sourceUrl.value = null
        cropOpen.value = false
        revokeOriginal()
        originalFile.value = null
        originalUrl.value = null
    }

    return {
        file,
        previewUrl,
        originalFile,
        originalUrl,
        sourceFile,
        sourceUrl,
        cropOpen,
        cropState,
        modalCropState,
        setCropSource,
        cancelCrop,
        setCroppedResult,
        reopenCrop,
        clearDraft,
    }
}
