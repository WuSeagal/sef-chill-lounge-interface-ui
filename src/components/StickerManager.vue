<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import './StickerManager.css'
import { uploadSticker, deleteSticker } from '@/api/stickerUploadApi'
import type { Sticker } from '@/types/user'
import { assetUrl } from '@/utils/assetUrl'
import CircleCloseButton from './CircleCloseButton.vue'

const MAX_ACTIVE = 5
const MAX_BYTES = 10 * 1024 * 1024

interface ExistingItem {
    id: number
    url: string | null
    stagedForDeletion: boolean
}

interface StagedItem {
    file: File
    previewUrl: string
}

const props = withDefaults(
    defineProps<{
        initial: Sticker[]
        /** 提示文字；傳 null 不顯示（如 onboarding）。未傳時維持預設文案 */
        hint?: string | null
    }>(),
    { hint: 'PNG / JPG / GIF / WEBP，≤10MB' },
)

const error = ref<string | null>(null)

const existing = reactive<ExistingItem[]>(
    props.initial.map((s) => ({ id: s.id, url: s.sticker ?? null, stagedForDeletion: false })),
)

const staged = reactive<StagedItem[]>([])

const netActive = computed(
    () => existing.filter((e) => !e.stagedForDeletion).length + staged.length,
)

const isDirty = computed(
    () => existing.some((e) => e.stagedForDeletion) || staged.length > 0,
)

const previews = computed<string[]>(() => [
    ...existing.filter((e) => !e.stagedForDeletion && !!e.url).map((e) => assetUrl(e.url!)),
    ...staged.map((s) => s.previewUrl),
])

function onFileChange(event: Event): void {
    error.value = null
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
        error.value = '不支援的圖片格式'
        return
    }
    if (file.size > MAX_BYTES) {
        error.value = '貼圖超過 10MB 上限'
        return
    }
    staged.push({ file, previewUrl: URL.createObjectURL(file) })
}

function removeExisting(item: ExistingItem): void {
    item.stagedForDeletion = true
}

function removeStaged(item: StagedItem): void {
    URL.revokeObjectURL(item.previewUrl)
    const idx = staged.indexOf(item)
    if (idx !== -1) staged.splice(idx, 1)
}

function clearStaging(): void {
    for (const s of staged) URL.revokeObjectURL(s.previewUrl)
    staged.splice(0, staged.length)
    for (const e of existing) e.stagedForDeletion = false
    error.value = null
}

async function saveAll(): Promise<void> {
    // Process deletes first so the server never exceeds 5 active at once.
    // Iterate over snapshots so we can mutate the live arrays as each op succeeds.
    const toDelete = existing.filter((e) => e.stagedForDeletion)
    const toUpload = [...staged]

    for (const item of toDelete) {
        try {
            await deleteSticker(item.id)
            const idx = existing.indexOf(item)
            if (idx !== -1) existing.splice(idx, 1)
        } catch (err) {
            throw Object.assign(
                err instanceof Error ? err : new Error('sticker_save_failed'),
                {},
            )
        }
    }

    for (const item of toUpload) {
        try {
            const res = await uploadSticker(item.file)
            URL.revokeObjectURL(item.previewUrl)
            const idx = staged.indexOf(item)
            if (idx !== -1) staged.splice(idx, 1)
            existing.push({ id: res.id, url: res.sticker ?? null, stagedForDeletion: false })
        } catch (err) {
            throw Object.assign(
                err instanceof Error ? err : new Error('sticker_save_failed'),
                {},
            )
        }
    }
}

defineExpose({ isDirty, saveAll, clearStaging, previews })
</script>

<template>
    <div class="sticker-manager" data-test="sticker-manager">
        <p v-if="hint" class="sticker-manager__hint">{{ hint }}</p>
        <div class="sticker-manager__list">
            <!-- Existing stickers (not staged for deletion) -->
            <div
                v-for="item in existing.filter((e) => !e.stagedForDeletion)"
                :key="item.id"
                class="sticker-manager__tile"
                data-test="sticker-tile"
            >
                <img
                    v-if="item.url"
                    class="sticker-manager__img"
                    :src="assetUrl(item.url)"
                    alt="貼圖"
                />
                <svg v-else class="sticker-manager__placeholder-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <CircleCloseButton
                    class="sticker-manager__remove-btn"
                    :ariaLabel="'移除貼圖'"
                    data-test="sticker-remove"
                    @remove="removeExisting(item)"
                />
            </div>

            <!-- Staged new previews -->
            <div
                v-for="item in staged"
                :key="item.previewUrl"
                class="sticker-manager__tile sticker-manager__tile--staged"
                data-test="sticker-tile"
            >
                <img class="sticker-manager__img" :src="item.previewUrl" alt="預覽" />
                <span class="sticker-manager__dirty-dot" title="未儲存"></span>
                <CircleCloseButton
                    class="sticker-manager__remove-btn"
                    :ariaLabel="'移除預覽貼圖'"
                    data-test="sticker-remove"
                    @remove="removeStaged(item)"
                />
            </div>

            <!-- Add tile (hidden when at max) -->
            <label
                v-if="netActive < MAX_ACTIVE"
                class="sticker-manager__add-tile"
                data-test="sticker-add"
                aria-label="新增貼圖"
            >
                <svg class="sticker-manager__add-icon" viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
                    <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                    <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                </svg>
                <span class="sticker-manager__add-label">新增</span>
                <input type="file" accept="image/*" hidden @change="onFileChange($event)" />
            </label>
        </div>
        <p
            v-if="error"
            class="sticker-manager__error"
            data-test="sticker-error"
            role="alert"
        >{{ error }}</p>
    </div>
</template>
