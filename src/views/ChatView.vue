<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import './ChatView.css'
import MessageItem from '@/components/MessageItem.vue'
import BottomBar from '@/components/BottomBar.vue'
import UserPopup from '@/components/UserPopup.vue'
import ImageLightbox from '@/components/ImageLightbox.vue'
import SettingsModal from '@/components/SettingsModal.vue'
import KickedModal from '@/components/KickedModal.vue'
import AutofillerPopup from '@/components/AutofillerPopup.vue'
import { push } from 'notivue'
import { useChatMessages } from '@/composables/useChatMessages'
import { useChatWebSocket } from '@/composables/useChatWebSocket'
import { useChatImageUpload } from '@/composables/useChatImageUpload'
import { useChatAutofiller, type AutofillerOption } from '@/composables/useChatAutofiller'
import { useUser } from '@/composables/useUser'

// 對應後端 error code 翻譯為使用者訊息；未知 code 直接照原文（addFiles 設的 limit
// 訊息已是中文）。避免依賴特定 prefix 字串判斷來源。
const ERROR_CODE_TO_MESSAGE: Record<string, string> = {
    file_too_large: '圖片超過 10MB 上限',
    unsupported_image_type: '不支援的圖片格式',
}
function uploadErrorToMessage(code: string): string {
    return ERROR_CODE_TO_MESSAGE[code] ?? code
}

const { messages, loading, hasMore, loadMore, init, reconnect, dispose, sendChatMessage, sendStickerMessage: sendChatStickerMessage, rateLimited, rateLimitRemaining, kicked } = useChatMessages()
const wsClient = useChatWebSocket()
const imageUpload = useChatImageUpload()
const fileInputRef = ref<HTMLInputElement | null>(null)
const user = useUser()
const currentProfile = computed(() => user.profile.value)
const myStickers = computed(() => user.profile.value?.stickers ?? [])

// UserPopup state — tracks which userId's popup is open. null = closed.
const popupUserId = ref<string | null>(null)
const popupOpen = computed(() => popupUserId.value !== null)

function onAvatarClick(userId: string) {
    popupUserId.value = popupUserId.value === userId ? null : userId
}

function onPopupClose() {
    popupUserId.value = null
}

// ImageLightbox state
const lightboxImageUrl = ref<string | null>(null)
const lightboxOpen = computed(() => lightboxImageUrl.value !== null)

function onImageClick(imageUrl: string) {
    lightboxImageUrl.value = imageUrl
}

function onLightboxClose() {
    lightboxImageUrl.value = null
}

// Scroll handling for the message list
const listEl = ref<HTMLElement | null>(null)
const isAtBottom = ref(true)
const SCROLL_BOTTOM_THRESHOLD = 80

function updateAtBottom() {
    const el = listEl.value
    if (!el) return
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight
    isAtBottom.value = distance <= SCROLL_BOTTOM_THRESHOLD
}

async function onListScroll() {
    updateAtBottom()

    const el = listEl.value
    if (!el || loading.value || !hasMore.value || el.scrollTop > 40) {
        return
    }

    const previousScrollHeight = el.scrollHeight
    const previousScrollTop = el.scrollTop
    await loadMore()
    await nextTick()
    el.scrollTop = el.scrollHeight - previousScrollHeight + previousScrollTop
}

function scrollToBottom(smooth = true) {
    const el = listEl.value
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
}

function onScrollFabClick() {
    scrollToBottom(true)
}

// Preserve the visible bottom-edge content when the list resizes
let listResizeObserver: ResizeObserver | null = null
let previousListHeight: number | null = null

// SettingsModal state
const settingsOpen = ref(false)

// BottomBar input
const inputValue = ref('')

// Autofiller: 「我」/「我X」 浮現 popup
const userTags = computed(() => user.profile.value?.tags ?? [])
const autofiller = useChatAutofiller(inputValue, userTags)

function onAutofillerSelect(option: AutofillerOption): void {
    inputValue.value = autofiller.select(option)
}

function handleAutofillerKey(event: KeyboardEvent): boolean {
    return autofiller.onKeydown(event, onAutofillerSelect)
}

async function onSend(value: string) {
    if (imageUpload.uploading.value) return

    let imageUrls: string[] = []
    if (imageUpload.selectedFiles.value.length > 0) {
        try {
            imageUrls = await imageUpload.uploadAll()
        } catch {
            // error 已存於 imageUpload.error，已 watch 顯示 toast，保留輸入內容讓 user 重試
            return
        }
    }

    sendChatMessage(value, imageUrls)
    inputValue.value = ''
    imageUpload.reset()
    await nextTick()
    scrollToBottom(true)
}

async function onStickerSelect(url: string) {
    sendChatStickerMessage(url)
    await nextTick()
    scrollToBottom(true)
}

function onAttachClick() {
    if (imageUpload.uploading.value) return
    fileInputRef.value?.click()
}

function onFileChange(event: Event) {
    const input = event.target as HTMLInputElement
    if (imageUpload.uploading.value) {
        input.value = ''
        return
    }
    if (input.files) imageUpload.addFiles(input.files)
    input.value = ''
}

function onImagePaste(files: File[]) {
    if (imageUpload.uploading.value) return
    imageUpload.addFiles(files)
}

// 監看 errorVersion 計數器（每次 setError 都會 bump 1），這樣連續兩次相同
// error message（例如連點兩次超 5 張）watcher 也會觸發 — 比監看 error.value
// 字串更可靠，也不需要在 watcher 內反向 mutate watched ref。
watch(() => imageUpload.errorVersion.value, () => {
    const msg = imageUpload.error.value
    if (msg) push.warning(uploadErrorToMessage(msg))
})

function onGearClick() {
    settingsOpen.value = true
}

function onSettingsClose() {
    settingsOpen.value = false
}

async function onReconnect() {
    kicked.value = false
    await reconnect()
    await nextTick()
    scrollToBottom(true)
}

// Auto-scroll when new live messages arrive and user is at the bottom
watch(() => messages.value.length, async () => {
    if (isAtBottom.value) {
        await nextTick()
        scrollToBottom(true)
    }
})

onMounted(async () => {
    await init()
    await nextTick()
    scrollToBottom(false)
    updateAtBottom()

    if (typeof ResizeObserver !== 'undefined' && listEl.value) {
        listResizeObserver = new ResizeObserver((entries) => {
            const el = listEl.value
            if (!el) return
            const entry = entries[0]
            const newHeight = entry.contentRect.height
            if (previousListHeight !== null && previousListHeight !== newHeight) {
                const delta = previousListHeight - newHeight
                if (delta !== 0) {
                    el.scrollTop = el.scrollTop + delta
                }
            }
            previousListHeight = newHeight
        })
        listResizeObserver.observe(listEl.value)
    }
})

onBeforeUnmount(() => {
    listResizeObserver?.disconnect()
    listResizeObserver = null
    dispose()
    wsClient.disconnect()
})

// Suppress unused-warning for currentProfile in case template doesn't reference it directly elsewhere
void currentProfile
</script>

<template>
    <div class="chat-view">
        <div class="chat-view__main">
            <div
                ref="listEl"
                class="chat-view__list"
                @scroll="onListScroll"
            >
                <div v-if="!messages.length" class="chat-view__empty">
                    目前沒有訊息
                </div>
                <MessageItem
                    v-for="m in messages"
                    :key="m.messageId"
                    :message="m"
                    @avatar-click="onAvatarClick"
                    @image-click="onImageClick"
                />
            </div>

            <button
                v-if="!isAtBottom"
                class="chat-view__scroll-fab"
                type="button"
                aria-label="scroll to bottom"
                @click="onScrollFabClick"
            >
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 9 L12 15 L18 9" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </button>
        </div>

        <input
            ref="fileInputRef"
            data-testid="chat-image-picker"
            type="file"
            multiple
            accept="image/jpeg,image/png,image/gif,image/webp"
            style="display:none"
            @change="onFileChange"
        />

        <div
            v-if="imageUpload.previews.value.length > 0"
            class="chat-view__previews"
            data-testid="image-preview-row"
        >
            <div
                v-for="(preview, idx) in imageUpload.previews.value"
                :key="preview"
                class="chat-view__preview"
                data-testid="image-preview"
            >
                <img :src="preview" alt="preview" />
                <button
                    type="button"
                    class="chat-view__preview-remove"
                    aria-label="移除"
                    @click="imageUpload.removeFile(idx)"
                >×</button>
            </div>
        </div>

        <BottomBar
            v-model:input-value="inputValue"
            :attach-disabled="imageUpload.isAtLimit() || imageUpload.uploading.value"
            :autofiller-open="autofiller.isOpen.value"
            :autofiller-handle-keydown="handleAutofillerKey"
            :stickers="myStickers"
            :rate-limited="rateLimited"
            :rate-limit-remaining="rateLimitRemaining"
            @gear-click="onGearClick"
            @attach-click="onAttachClick"
            @image-paste="onImagePaste"
            @sticker-select="onStickerSelect"
            @send="onSend"
        >
            <template #popup>
                <AutofillerPopup
                    :open="autofiller.isOpen.value"
                    :options="autofiller.options.value"
                    :focused-index="autofiller.focusedIndex.value"
                    @select="onAutofillerSelect"
                />
            </template>
        </BottomBar>

        <UserPopup
            :open="popupOpen"
            :user-id="popupUserId"
            @close="onPopupClose"
        />

        <ImageLightbox
            :open="lightboxOpen"
            :image-url="lightboxImageUrl"
            @close="onLightboxClose"
        />

        <SettingsModal
            :open="settingsOpen"
            @close="onSettingsClose"
        />

        <KickedModal
            :open="kicked"
            @reconnect="onReconnect"
        />
    </div>
</template>
