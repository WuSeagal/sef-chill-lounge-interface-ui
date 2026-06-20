<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import './ChatView.css'
import MessageItem from '@/components/MessageItem.vue'
import UnreadDivider from '@/components/UnreadDivider.vue'
import AnnouncementBanner from '@/components/AnnouncementBanner.vue'
import BottomBar from '@/components/BottomBar.vue'
import UserPopup from '@/components/UserPopup.vue'
import DashboardOnlineCounter from '@/components/DashboardOnlineCounter.vue'
import PeopleModal from '@/components/PeopleModal.vue'
import ImageLightbox from '@/components/ImageLightbox.vue'
import SettingsModal from '@/components/SettingsModal.vue'
import KickedModal from '@/components/KickedModal.vue'
import BannedScreen from '@/components/BannedScreen.vue'
import ReconnectOverlay from '@/components/ReconnectOverlay.vue'
import TypingIndicator from '@/components/TypingIndicator.vue'
import AutofillerPopup from '@/components/AutofillerPopup.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import LizardLoading from '@/components/LizardLoading.vue'
import { push } from 'notivue'
import { useChatMessages } from '@/composables/useChatMessages'
import { useChatWebSocket } from '@/composables/useChatWebSocket'
import { useChatImageUpload } from '@/composables/useChatImageUpload'
import { useChatAutofiller, type AutofillerOption } from '@/composables/useChatAutofiller'
import { useTypingIndicator } from '@/composables/useTypingIndicator'
import { useUser } from '@/composables/useUser'
import { useMembers } from '@/composables/useMembers'
import { useAuthStore } from '@/stores/auth'
import { isHost } from '@/utils/host'
import { deleteMessage } from '@/api/messageApi'
import type { AnnouncementPayload, ChatEnvelope, PresenceSnapshotPayload, ProfileUpdatedPayload } from '@/types/chat'

// 對應後端 error code 翻譯為使用者訊息；未知 code 直接照原文（addFiles 設的 limit
// 訊息已是中文）。避免依賴特定 prefix 字串判斷來源。
const ERROR_CODE_TO_MESSAGE: Record<string, string> = {
    file_too_large: '圖片超過 10MB 上限',
    unsupported_image_type: '不支援的圖片格式',
}
function uploadErrorToMessage(code: string): string {
    return ERROR_CODE_TO_MESSAGE[code] ?? code
}

const { messages, loading, initialized, hasMore, loadMore, init, reconnect, dispose, setIsAtBottom, sendChatMessage, sendStickerMessage: sendChatStickerMessage, rateLimited, rateLimitRemaining, kicked, wsReconnecting, wsFailed } = useChatMessages()
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

// people-directory：/chat 線上人數（由 PRESENCE_SNAPSHOT 維護）+ People 名單入口。
const onlineCount = ref(0)
const wsConnected = computed(() => !wsReconnecting.value && !wsFailed.value)
const peopleOpen = ref(false)
function onSelectPerson(userId: string): void {
    popupUserId.value = userId
}

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

// Host 刪除訊息：僅寫死 host 帳號可見刪除鈕；後端為唯一授權邊界，此處僅控制顯隱。
const authStore = useAuthStore()
const canDelete = computed(() => isHost(authStore.user?.providerUserId))

// 封禁 gate（design D7）：banned 來自 check-auth（進入/重整即生效）；為真則整頁顯示 BannedScreen
// 取代聊天內容。WS 連線被後端拒絕為防守縱深第二層（此處 onMounted 的 init/connect 對 banned
// 使用者無害，故不條件化 composable，維持既有行為與測試）。
const banned = computed(() => authStore.user?.banned ?? false)

// 刪除確認框狀態。不做樂觀本地移除——確認後呼叫 API，實際移除等 MESSAGE_DELETED 廣播。
const pendingDeleteId = ref<string | null>(null)
const deleteConfirmOpen = computed(() => pendingDeleteId.value !== null)

function onDeleteClick(messageId: string) {
    pendingDeleteId.value = messageId
}

function onDeleteCancel() {
    pendingDeleteId.value = null
}

async function onDeleteConfirm() {
    const id = pendingDeleteId.value
    pendingDeleteId.value = null
    if (!id) return
    try {
        await deleteMessage(id)
    } catch {
        push.error('刪除訊息失敗，請稍後再試')
    }
}

// Scroll handling for the message list
const listEl = ref<HTMLElement | null>(null)
const isAtBottom = ref(true)
const SCROLL_BOTTOM_THRESHOLD = 80

// D7：把貼底狀態交給 useChatMessages，讓 appendLive 只在貼底時裁頭（不抽走正在看的歷史）。
setIsAtBottom(() => isAtBottom.value)

// 非貼底期間到達的他人新訊息計數，顯示於 scroll-fab 右上角 badge；貼底即歸零。
const unreadCount = ref(0)
const unreadDisplay = computed(() => (unreadCount.value > 99 ? '99+' : String(unreadCount.value)))
const scrollFabAriaLabel = computed(() =>
    unreadCount.value > 0 ? `捲至底部，${unreadDisplay.value} 則新訊息` : '捲至底部')

// ── 未讀分隔線：純位置標記「新訊息 ↓」，標出「未讀從哪開始」（數量交給 scroll-fab badge）。
// 生命週期：未讀 0→>0 時出現於第一則未讀上方（不啟動倒數）；回到貼底時啟動 15 秒倒數
// （不清除，讓使用者往上滑找到它讀起）；倒數結束淡出移除；淡出後不重現直到再次滾到底；
// 重連/離頁清除。不顯示數量，故無需追蹤 count。
const UNREAD_DIVIDER_TIMEOUT_MS = 15_000
const UNREAD_DIVIDER_LEAVE_MS = 320
const unreadBoundaryId = ref<string | null>(null)
const dividerVisible = ref(false)
const dividerLeaving = ref(false)
let dividerTimer: ReturnType<typeof setTimeout> | null = null
let dividerLeaveTimer: ReturnType<typeof setTimeout> | null = null
let dividerCountdownStarted = false

function showUnreadDivider(boundaryId: string) {
    unreadBoundaryId.value = boundaryId
    dividerVisible.value = true
    dividerLeaving.value = false
    dividerCountdownStarted = false
}

// 回到貼底時呼叫：啟動 15 秒倒數（不清除分隔線）。
function startDividerCountdown() {
    if (!dividerVisible.value || dividerCountdownStarted) return
    dividerCountdownStarted = true
    dividerTimer = setTimeout(() => {
        dividerTimer = null
        dividerLeaving.value = true // 觸發淡出 + 高度收合動畫
        dividerLeaveTimer = setTimeout(() => {
            dividerLeaveTimer = null
            dividerVisible.value = false
            dividerLeaving.value = false
            unreadBoundaryId.value = null
        }, UNREAD_DIVIDER_LEAVE_MS)
    }, UNREAD_DIVIDER_TIMEOUT_MS)
}

// 立即清除（重連 / 離頁；非一般滾到底）。
function clearUnreadDivider() {
    if (dividerTimer !== null) { clearTimeout(dividerTimer); dividerTimer = null }
    if (dividerLeaveTimer !== null) { clearTimeout(dividerLeaveTimer); dividerLeaveTimer = null }
    dividerVisible.value = false
    dividerLeaving.value = false
    unreadBoundaryId.value = null
    dividerCountdownStarted = false
}

// ── 主持人公告 banner：overlay 覆蓋 /chat 頂端；list 維持滿高、依 banner 高設動態 top padding
// （不縮可捲範圍、不擋捲軸）。公告經 WS ANNOUNCEMENT 事件（含連線補送）更新。
const announcementText = ref<string | null>(null)
const announcementWrapRef = ref<HTMLElement | null>(null)
const bannerHeight = ref(0)
let announcementResizeObserver: ResizeObserver | null = null

function measureBanner() {
    bannerHeight.value = announcementWrapRef.value?.offsetHeight ?? 0
    // 公告高度變動造成內容位移時，貼底者保持貼底
    if (isAtBottom.value) scrollToBottom(false)
}

// 公告出現/消失時掛/卸 ResizeObserver（RWD 換行致高度變動也即時更新 padding）
watch(announcementText, async () => {
    await nextTick()
    announcementResizeObserver?.disconnect()
    announcementResizeObserver = null
    if (announcementText.value && announcementWrapRef.value) {
        measureBanner()
        announcementResizeObserver = new ResizeObserver(() => measureBanner())
        announcementResizeObserver.observe(announcementWrapRef.value)
    } else {
        bannerHeight.value = 0
    }
})

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
    if (isAtBottom.value) {
        scrollCatchUpUntil = 0
        unreadCount.value = 0
        // 回到貼底：不清除分隔線，改凍結數字並啟動 15 秒倒數
        if (dividerVisible.value) startDividerCountdown()
    }
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
    // 點 fab 即明確「回到底部」意圖：立即歸零未讀（不依賴 smooth 捲動完成的非同步偵測）
    unreadCount.value = 0
    // 同回到貼底：不清除分隔線，改啟動 15 秒倒數
    if (dividerVisible.value) startDividerCountdown()
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
    if (envelope.type === 'ANNOUNCEMENT') {
        announcementText.value = (envelope.data as AnnouncementPayload | undefined)?.text ?? null
        return
    }
    let candidateIds: string[] = []
    if (envelope.type === 'PROFILE_UPDATED') {
        const uid = (envelope.data as ProfileUpdatedPayload | undefined)?.userId
        candidateIds = uid ? [uid] : []
    } else if (envelope.type === 'PRESENCE_SNAPSHOT') {
        candidateIds = (envelope.data as PresenceSnapshotPayload | undefined)?.onlineUserIds ?? []
        onlineCount.value = candidateIds.length
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

// 輸入中指示：送出側監看 inputValue 做節流 heartbeat；接收側維護他人 typers 清單
// （自我過濾用自己的 providerUserId）。
const { typers: typingTypers, stopTyping: stopTyping, dispose: disposeTyping } =
    useTypingIndicator(inputValue, () => authStore.user?.providerUserId ?? null)

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
    stopTyping()
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
    stopTyping()
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
    // 重連 = 全量重載並回到底部；重載期間的列表變動不應殘留為未讀（等 watcher flush 後歸零）
    unreadCount.value = 0
    // 列表全量重載、邊界訊息失效 → 清除分隔線
    clearUnreadDivider()
    scrollToBottom(true)
}

// 追蹤列表尾端 messageId，用來區分「尾端新增」（即時/WS 新訊息）與「頭部插入」
// （往上捲載入歷史 loadMore）——後者不應累計未讀。
let prevTailId: string | null = null

// Auto-scroll when new live messages arrive and user is at the bottom,
// or when our own just-sent message comes back from the broadcast.
watch(() => messages.value.length, async (newLen, oldLen) => {
    const newTailId = newLen > 0 ? messages.value[newLen - 1].messageId : null

    // immediate 首次觸發（oldLen === undefined）僅作初始化，避免把初始訊息誤算為未讀。
    if (oldLen === undefined) {
        prevTailId = newTailId
        return
    }

    const forceScroll = pendingOwnScroll
    pendingOwnScroll = false
    // 只有「尾端 id 改變」才算尾端新增；頭部插入歷史時 tail 不變 → tailAppended 為 false。
    const tailAppended = newLen > oldLen && newTailId !== prevTailId
    prevTailId = newTailId

    if (forceScroll || isAtBottom.value) {
        await nextTick()
        scrollToBottom(true)
        return
    }
    // 非貼底、非自己送出的尾端新訊息 → 累計未讀計數
    if (tailAppended) {
        const wasZero = unreadCount.value === 0
        unreadCount.value += newLen - oldLen
        // 未讀分隔線：首波未讀（0→>0、尚未顯示）→ 釘在第一則未讀（messages[oldLen]）上方
        if (wasZero && !dividerVisible.value) {
            const firstUnread = messages.value[oldLen]
            if (firstUnread) showUnreadDivider(firstUnread.messageId)
        }
    }
}, { immediate: true })

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
    clearUnreadDivider()
    announcementResizeObserver?.disconnect()
    announcementResizeObserver = null
    disposeTyping()
    dispose()
    wsClient.disconnect()
})

// Suppress unused-warning for currentProfile in case template doesn't reference it directly elsewhere
void currentProfile
</script>

<template>
    <BannedScreen v-if="banned" />
    <div v-else class="chat-view">
        <DashboardOnlineCounter
            class="chat-view__online-counter"
            :count="onlineCount"
            :connected="wsConnected"
            @click="peopleOpen = true"
        />
        <div class="chat-view__main">
            <div
                ref="listEl"
                class="chat-view__list"
                :style="announcementText ? { paddingTop: bannerHeight + 'px' } : undefined"
                @scroll="onListScroll"
            >
                <div v-if="!initialized" class="chat-view__loading">
                    <LizardLoading variant="inline" message="載入訊息中" :refresh-after-ms="8000" />
                </div>
                <div v-else-if="!messages.length" class="chat-view__empty">
                    目前沒有訊息
                </div>
                <template v-for="m in messages" :key="m.messageId">
                    <UnreadDivider
                        v-if="dividerVisible && m.messageId === unreadBoundaryId"
                        :leaving="dividerLeaving"
                    />
                    <MessageItem
                        :message="m"
                        :member-names="memberNames"
                        :can-delete="canDelete"
                        @avatar-click="onAvatarClick"
                        @image-click="onImageClick"
                        @image-load="onMessageImageLoad"
                        @link-click="onLinkClick"
                        @delete-click="onDeleteClick"
                    />
                </template>
            </div>

            <div
                v-if="announcementText"
                ref="announcementWrapRef"
                class="chat-view__announcement"
            >
                <AnnouncementBanner :text="announcementText" @link-click="onLinkClick" />
            </div>

            <button
                v-if="!isAtBottom"
                class="chat-view__scroll-fab"
                type="button"
                :aria-label="scrollFabAriaLabel"
                @click="onScrollFabClick"
            >
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 9 L12 15 L18 9" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span
                    v-if="unreadCount > 0"
                    :key="unreadCount"
                    class="chat-view__scroll-fab-badge"
                    aria-hidden="true"
                >{{ unreadDisplay }}</span>
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

        <TypingIndicator :typers="typingTypers" />

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

        <PeopleModal :open="peopleOpen" @close="peopleOpen = false" @select="onSelectPerson" />

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

        <ConfirmDialog
            :open="deleteConfirmOpen"
            message="確定刪除這則訊息？"
            confirm-text="刪除"
            cancel-text="取消"
            @confirm="onDeleteConfirm"
            @cancel="onDeleteCancel"
        />

        <KickedModal
            :open="kicked"
            @reconnect="onReconnect"
        />

        <ReconnectOverlay
            :reconnecting="wsReconnecting"
            :failed="wsFailed"
        />
    </div>
</template>
