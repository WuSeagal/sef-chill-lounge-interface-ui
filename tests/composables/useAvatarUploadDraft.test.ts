import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAvatarUploadDraft } from '@/composables/useAvatarUploadDraft'
import type { AvatarCropState } from '@/types/avatar'

const cropState: AvatarCropState = {
    zoom: 1.8,
    offsetX: 24,
    offsetY: -18,
}

describe('useAvatarUploadDraft', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        global.URL.createObjectURL = vi.fn((blob) => 'blob:' + (blob as File).name)
        global.URL.revokeObjectURL = vi.fn()
    })

    it('stores cropped blob preview after confirm', async () => {
        const draft = useAvatarUploadDraft()
        draft.setCropSource(new File(['source'], 'source.png', { type: 'image/png' }))
        await draft.setCroppedResult(new File(['demo'], 'avatar.png', { type: 'image/png' }), cropState)

        expect(draft.previewUrl.value).toBe('blob:avatar.png')
        expect(draft.file.value?.name).toBe('avatar.png')
        expect(draft.cropState.value).toEqual(cropState)
    })

    it('clearDraft revokes preview and resets state', async () => {
        const draft = useAvatarUploadDraft()
        draft.setCropSource(new File(['source'], 'source.png', { type: 'image/png' }))
        await draft.setCroppedResult(new File(['demo'], 'avatar.png', { type: 'image/png' }), cropState)

        draft.clearDraft()

        expect(draft.previewUrl.value).toBeNull()
        expect(draft.file.value).toBeNull()
        expect(draft.cropState.value).toBeNull()
        expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:avatar.png')
    })

    it('setCropSource opens crop modal state with source preview', () => {
        const draft = useAvatarUploadDraft()
        draft.setCropSource(new File(['demo'], 'source.png', { type: 'image/png' }))

        expect(draft.cropOpen.value).toBe(true)
        expect(draft.sourceUrl.value).toBe('blob:source.png')
    })

    it('cancelCrop clears only source preview and keeps staged draft', async () => {
        const draft = useAvatarUploadDraft()
        draft.setCropSource(new File(['source'], 'source.png', { type: 'image/png' }))
        await draft.setCroppedResult(new File(['demo'], 'avatar.png', { type: 'image/png' }), cropState)
        draft.setCropSource(new File(['demo'], 'source.png', { type: 'image/png' }))

        draft.cancelCrop()

        expect(draft.cropOpen.value).toBe(false)
        expect(draft.sourceUrl.value).toBeNull()
        expect(draft.previewUrl.value).toBe('blob:avatar.png')
    })

    it('reopenCrop opens the modal again from the current staged crop result', async () => {
        const draft = useAvatarUploadDraft()
        draft.setCropSource(new File(['original'], 'original.png', { type: 'image/png' }))
        await draft.setCroppedResult(new File(['demo'], 'avatar.png', { type: 'image/png' }), cropState)

        draft.reopenCrop()

        expect(draft.cropOpen.value).toBe(true)
        expect(draft.sourceUrl.value).toBe('blob:original.png')
        expect(draft.sourceFile.value?.name).toBe('original.png')
        expect(draft.cropState.value).toEqual(cropState)
    })
})
