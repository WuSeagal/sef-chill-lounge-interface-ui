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
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { push } from 'notivue'
import { useChatMessages } from '@/composables/useChatMessages'
import { useChatWebSocket } from '@/composables/useChatWebSocket'
import { useChatImageUpload } from '@/composables/useChatImageUpload'
import { useChatAutofiller, type AutofillerOption } from '@/composables/useChatAutofiller'
import { useUser } from '@/composables/useUser'
import { useMembers } from '@/composables/useMembers'
import type { ChatEnvelope, PresenceSnapshotPayload, ProfileUpdatedPayload } from '@/types/chat'

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

// 離站確認窗：點訊息內連結先彈窗顯示完整 URL，確認才開新分頁。
const pendingLinkUrl = ref<string | null>(null)
const linkConfirmOpen = computed(() => pendingLinkUrl.value !== null)

function onLinkClick(url: string) {
    pendingLinkUrl.value = url
}

function onLinkConfirm() {
    // confirm 按鈕點擊是 user gesture，同步呼叫 window.open 避免被 popup blocker 擋。
    if (pendingLinkUrl.value) window.open(pendingLinkUrl.value, '_blank', 'noopener,noreferrer')
    pendingLinkUrl.value = null
}

function onLinkCancel() {
    pendingLinkUrl.value = null
}

// SettingsModal state
const settingsOpen = ref(false)

// BottomBar input
const inputValue = ref('')

// Autofiller: 「我」/「我X」 TAG + caret-aware @mention 浮現 popup
const userTags = computed(() => user.profile.value?.tags ?? [])
// @mention 候選名單（全部使用者）；caretIndex 由 BottomBar 的 textarea selection 餵入。
const { members, error: membersError, refetch: refetchMembers } = useMembers()
// MessageItem 渲染 @mention 高亮所需的名單（furName，過濾 null）。
const memberNames = computed(() => members.value.map(m => m.furName).filter((n): n is string => Boolean(n)))
const caretIndex = ref(0)

// 新使用者（剛辦帳號 / 上線）要能立即被 @：收到帶「未知 userId」的 WS 事件就刷新名單。
// 以「已嘗試過的未知 id」去重：每個未知 userId 一生最多觸發一次 refetch——避免
// PRESENCE_SNAPSHOT 廣播風暴，以及某 online id 永不進 /members（兩邊收錄不一）時永不收斂。
let wsMemberUnsub: (() => void) | null = null
const attemptedUnknownMemberIds = new Set<string>()
function onWsMemberEvent(envelope: ChatEnvelope) {
    let candidateIds: string[] = []
    if (envelope.type === 'PROFILE_UPDATED') {
        const uid = (envelope.data as ProfileUpdatedPayload | undefined)?.userId
        candidateIds = uid ? [uid] : []
    } else if (envelope.type === 'PRESENCE_SNAPSHOT') {
        candidateIds = (envelope.data as PresenceSnapshotPayload | undefined)?.onlineUserIds ?? []
    } else {
        return
    }

    const known = new Set(members.value.map(m => m.userId))
    const fresh = candidateIds.filter(id => !known.has(id) && !attemptedUnknownMemberIds.has(id))
    if (fresh.length === 0) return
    fresh.forEach(id => attemptedUnknownMemberIds.add(id))
    void refetchMembers()
}
const autofiller = useChatAutofiller(inputValue, userTags, members, caretIndex)

function onCaretChange(pos: number): void {
    caretIndex.value = pos
}

// 點 popup 與 textarea 以外的任何地方 → 關閉 autofiller（Discord 式行為）。
// popup 選項用 mousedown.prevent 自行處理選取，故排除 .autofiller-popup 內的點擊。
function onDocumentPointerDown(e: MouseEvent): void {
    if (!autofiller.isOpen.value) return
    const target = e.target as HTMLElement | null
    if (target?.closest('.autofiller-popup') || target?.closest('.bottom-bar__input')) return
    autofiller.dismiss()
}

async function onAutofillerSelect(option: AutofillerOption): Promise<void> {
    const { value, caret } = autofiller.select(option)
    inputValue.value = value
    caretIndex.value = caret
    await nextTick()
    bottomBarRef.value?.setCaret(caret)
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
    // /members 在 interceptor 白名單，呼叫端須自行呈現錯誤，否則 500 變靜默失敗。
    await refetchMembers()
    if (membersError.value) push.warning('載入成員列表失敗，@提及功能可能無法使用')

    wsMemberUnsub = wsClient.onMessage(onWsMemberEvent)
    document.addEventListener('mousedown', onDocumentPointerDown)

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
    wsMemberUnsub?.()
    wsMemberUnsub = null
    document.removeEventListener('mousedown', onDocumentPointerDown)
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
                    :member-names="memberNames"
                    @avatar-click="onAvatarClick"
                    @image-click="onImageClick"
                    @image-load="onMessageImageLoad"
                    @link-click="onLinkClick"
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
            @caret-change="onCaretChange"
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

        <ConfirmDialog
            :open="linkConfirmOpen"
            message="即將離開 SEF Chill Lounge，前往外部網站"
            :detail="pendingLinkUrl ?? ''"
            confirm-text="前往外部"
            cancel-text="取消"
            @confirm="onLinkConfirm"
            @cancel="onLinkCancel"
        />

        <KickedModal
            :open="kicked"
            @reconnect="onReconnect"
        />
    </div>
</template>
