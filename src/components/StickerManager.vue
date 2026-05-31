<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import './StickerManager.css'
import { uploadSticker, deleteSticker } from '@/api/stickerUploadApi'
import type { Sticker } from '@/types/user'
import { assetUrl } from '@/utils/assetUrl'

const SLOTS = [1, 2, 3, 4, 5]
const MAX_BYTES = 10 * 1024 * 1024

interface SlotState {
    slot: number
    existingUrl: string | null
    stagedFile: File | null
    previewUrl: string | null
    cleared: boolean
}

const props = defineProps<{ initial: Sticker[] }>()

const slotError = ref<string | null>(null)

const slots = reactive<SlotState[]>(
    SLOTS.map((slot) => {
        const found = props.initial.find((s) => s.stickerNo === slot)
        return { slot, existingUrl: found?.sticker ?? null, stagedFile: null, previewUrl: null, cleared: false }
    }),
)

const isDirty = computed(() => slots.some((s) => s.stagedFile !== null || s.cleared))

function displaySrc(s: SlotState): string | null {
    if (s.previewUrl) return s.previewUrl
    if (s.cleared) return null
    return s.existingUrl ? assetUrl(s.existingUrl) : null
}

function onFileChange(slot: SlotState, event: Event): void {
    slotError.value = null
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
        slotError.value = '不支援的圖片格式'
        return
    }
    if (file.size > MAX_BYTES) {
        slotError.value = '貼圖超過 10MB 上限'
        return
    }
    if (slot.previewUrl) URL.revokeObjectURL(slot.previewUrl)
    slot.stagedFile = file
    slot.previewUrl = URL.createObjectURL(file)
    slot.cleared = false
}

function onClear(slot: SlotState): void {
    if (slot.previewUrl) {
        URL.revokeObjectURL(slot.previewUrl)
        slot.previewUrl = null
    }
    slot.stagedFile = null
    slot.cleared = true
}

function clearStaging(): void {
    for (const s of slots) {
        if (s.previewUrl) URL.revokeObjectURL(s.previewUrl)
        s.previewUrl = null
        s.stagedFile = null
        s.cleared = false
    }
}

function resetSlotStaging(s: SlotState): void {
    if (s.previewUrl) URL.revokeObjectURL(s.previewUrl)
    s.previewUrl = null
    s.stagedFile = null
    s.cleared = false
}

// Clears each slot's staging as soon as that slot's request succeeds, so a
// partial failure leaves only the unprocessed slots dirty — retry is then
// idempotent (succeeded slots are no longer re-uploaded). On failure we throw
// an error carrying the offending slot number so the caller can name it.
async function saveAll(): Promise<void> {
    for (const s of slots) {
        try {
            if (s.stagedFile) {
                const res = await uploadSticker(s.slot, s.stagedFile)
                s.existingUrl = res.sticker
                resetSlotStaging(s)
            } else if (s.cleared) {
                await deleteSticker(s.slot)
                s.existingUrl = null
                resetSlotStaging(s)
            }
        } catch (err) {
            throw Object.assign(
                err instanceof Error ? err : new Error('sticker_save_failed'),
                { slot: s.slot },
            )
        }
    }
}

defineExpose({ isDirty, saveAll, clearStaging })
</script>

<template>
    <div class="sticker-manager" data-test="sticker-manager">
        <p class="sticker-manager__hint">PNG / JPG / GIF / WEBP，≤10MB</p>
        <div class="sticker-manager__grid">
            <div
                v-for="s in slots"
                :key="s.slot"
                class="sticker-manager__slot"
                data-test="sticker-slot"
            >
                <div class="sticker-manager__thumb" :class="{ 'sticker-manager__thumb--empty': !displaySrc(s) }">
                    <img v-if="displaySrc(s)" class="sticker-manager__img" :src="displaySrc(s)!" :alt="'貼圖 ' + s.slot" />
                    <span v-else class="sticker-manager__placeholder" aria-hidden="true">+</span>
                    <span v-if="s.stagedFile || s.cleared" class="sticker-manager__dirty-dot" title="未儲存"></span>
                </div>
                <div class="sticker-manager__actions">
                    <label class="sticker-manager__btn" :aria-label="'上傳貼圖 ' + s.slot">
                        {{ s.existingUrl && !s.cleared ? '替換' : '上傳' }}
                        <input type="file" accept="image/*" hidden @change="onFileChange(s, $event)" />
                    </label>
                    <button
                        type="button"
                        class="sticker-manager__btn sticker-manager__btn--danger"
                        data-test="sticker-clear"
                        :disabled="!s.existingUrl && !s.stagedFile"
                        :aria-label="'清空貼圖 ' + s.slot"
                        @click="onClear(s)"
                    >清空</button>
                </div>
            </div>
        </div>
        <p v-if="slotError" class="sticker-manager__error" data-test="sticker-error" role="alert">{{ slotError }}</p>
    </div>
</template>
