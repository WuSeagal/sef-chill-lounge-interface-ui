<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import './ChatView.css'
import MessageItem from '@/components/MessageItem.vue'
import BottomBar from '@/components/BottomBar.vue'
import UserPopup from '@/components/UserPopup.vue'
import ImageLightbox from '@/components/ImageLightbox.vue'
import SettingsModal from '@/components/SettingsModal.vue'
import KickedModal from '@/components/KickedModal.vue'
import { useChatMessages } from '@/composables/useChatMessages'
import { useChatWebSocket } from '@/composables/useChatWebSocket'
import { useChatImageUpload } from '@/composables/useChatImageUpload'
import { useUser } from '@/composables/useUser'

const { messages, loading, hasMore, loadMore, init, reconnect, dispose, sendChatMessage, kicked } = useChatMessages()
const wsClient = useChatWebSocket()
const imageUpload = useChatImageUpload()
const fileInputRef = ref<HTMLInputElement | null>(null)
const user = useUser()
const currentProfile = computed(() => user.profile.value)

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

async function onSend(value: string) {
    if (imageUpload.uploading.value) return

    let imageUrls: string[] = []
    if (imageUpload.selectedFiles.value.length > 0) {
        try {
            imageUrls = await imageUpload.uploadAll()
        } catch {
            // error 已存於 imageUpload.error，停止 send，保留輸入內容
            return
        }
    }

    sendChatMessage(value, imageUrls)
    inputValue.value = ''
    imageUpload.reset()
    await nextTick()
    scrollToBottom(true)
}

function onAttachClick() {
    fileInputRef.value?.click()
}

function onFileChange(event: Event) {
    const input = event.target as HTMLInputElement
    if (input.files) imageUpload.addFiles(input.files)
    input.value = ''
}

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

        <div
            v-if="imageUpload.error.value"
            class="chat-view__upload-error"
            data-testid="upload-error"
        >
            {{ imageUpload.error.value }}
        </div>

        <BottomBar
            v-model:input-value="inputValue"
            @gear-click="onGearClick"
            @attach-click="onAttachClick"
            @send="onSend"
        />

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
