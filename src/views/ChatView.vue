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
const bottomBarRef = ref<InstanceType<typeof BottomBar> | null>(null)
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

// 程式主動捲底的 smooth 動畫進行中也視為「應貼底」：圖片此時載入完成會讓
// smooth 目標（舊 scrollHeight）落空，補捲條件須涵蓋這段期間。用時間上限
// 自我過期＋落底時清除，避免動畫被使用者中斷後旗標殘留，之後歷史圖片
// 載入又把畫面硬拉回底部。
const SCROLL_CATCH_UP_WINDOW_MS = 600
let scrollCatchUpUntil = 0

function isCatchingUpToBottom(): boolean {
    return Date.now() < scrollCatchUpUntil
}

function updateAtBottom() {
    const el = listEl.value
    if (!el) return
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight
    isAtBottom.value = distance <= SCROLL_BOTTOM_THRESHOLD
    if (isAtBottom.value) scrollCatchUpUntil = 0
}

// 訊息載入（/messages）已不再由 interceptor 導去 /error（Q2 白名單），呼叫端須自行
// 以 toast 呈現失敗，否則會變成靜默失敗。成功回 true、失敗回 false 讓呼叫端決定後續。
async function runMessageLoad(load: () => Promise<void>): Promise<boolean> {
    try {
        await load()
        return true
    } catch (e) {
        console.error('載入訊息失敗', e)
        push.warning('載入訊息失敗，請稍後再試')
        return false
    }
}

async function onListScroll() {
    updateAtBottom()

    const el = listEl.value
    if (!el || loading.value || !hasMore.value || el.scrollTop > 40) {
        return
    }

    const previousScrollHeight = el.scrollHeight
    const previousScrollTop = el.scrollTop
    if (!await runMessageLoad(loadMore)) return
    await nextTick()
    el.scrollTop = el.scrollHeight - previousScrollHeight + previousScrollTop
}

function scrollToBottom(smooth = true) {
    const el = listEl.value
    if (!el) return
    scrollCatchUpUntil = Date.now() + SCROLL_CATCH_UP_WINDOW_MS
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
}

function onScrollFabClick() {
    scrollToBottom(true)
}

// 自己送出的訊息要等伺服器廣播回來才進列表；送出當下先立旗標，
// 下一次列表變動時強制捲底（不看 isAtBottom，消除 smooth 捲動進行中的 race）。
let pendingOwnScroll = false

// 圖片/貼圖載入完成時內容會變高；若使用者貼底（或捲底動畫進行中）則補捲到
// 真正的底。用 auto（瞬間落底）避免多張圖陸續載完時 smooth 動畫互相打斷。
function onMessageImageLoad() {
    if (isAtBottom.value || isCatchingUpToBottom()) scrollToBottom(false)
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
    // 空送出是 no-op（sendChatMessage 同樣條件會拒發），不可立 pendingOwnScroll，
    // 否則旗標殘留會在下一則他人訊息時把往上閱讀的使用者硬拉到底
    if (!value.trim() && imageUpload.selectedFiles.value.length === 0) {
        inputValue.value = ''
        return
    }

    let imageUrls: string[] = []
    if (imageUpload.selectedFiles.value.length > 0) {
        try {
            imageUrls = await imageUpload.uploadAll()
        } catch {
            // error 已存於 imageUpload.error，已 watch 顯示 toast，保留輸入內容讓 user 重試
            return
        }
    }

    const sent = sendChatMessage(value, imageUrls)
    if (!sent) {
        // 連線中斷未送出：sendChatMessage 已 toast，保留輸入與已選圖片讓使用者重送
        return
    }
    pendingOwnScroll = true
    inputValue.value = ''
    imageUpload.reset()
    await nextTick()
    scrollToBottom(true)
}

async function onStickerSelect(url: string) {
    const sent = sendChatStickerMessage(url)
    if (!sent) {
        // 連線中斷未送出：sendStickerMessage 已 toast，不可殘留 pendingOwnScroll
        // 否則旗標會在下一則他人訊息時把往上閱讀的使用者硬拉到底
        return
    }
    pendingOwnScroll = true
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
    // focus 回輸入框，讓使用者選完圖直接按 Enter 送出
    bottomBarRef.value?.focusInput()
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
    if (!await runMessageLoad(reconnect)) return
    await nextTick()
    scrollToBottom(true)
}

// Auto-scroll when new live messages arrive and user is at the bottom,
// or when our own just-sent message comes back from the broadcast.
watch(() => messages.value.length, async () => {
    const forceScroll = pendingOwnScroll
    pendingOwnScroll = false
    if (forceScroll || isAtBottom.value) {
        await nextTick()
        scrollToBottom(true)
    }
})

onMounted(async () => {
    await runMessageLoad(init)
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
                    @image-load="onMessageImageLoad"
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
            ref="bottomBarRef"
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
