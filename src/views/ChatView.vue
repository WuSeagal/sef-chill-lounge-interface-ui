<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import './ChatView.css'
import MessageItem from '@/components/MessageItem.vue'
import BottomBar from '@/components/BottomBar.vue'
import UserPopup from '@/components/UserPopup.vue'
import ImageLightbox from '@/components/ImageLightbox.vue'
import SettingsModal from '@/components/SettingsModal.vue'
import { useChatHistory } from '@/composables/useChatHistory'
import { useUser } from '@/composables/useUser'
import type { MessageResponse } from '@/types/message'

const { messages, loading, hasMore, loadInitial, loadMore, appendLive } = useChatHistory()
const user = useUser()
const currentProfile = computed(() => user.profile.value)

// UserPopup state — tracks which userId's popup is open. null = closed.
const popupUserId = ref<string | null>(null)
const popupOpen = computed(() => popupUserId.value !== null)

function onAvatarClick(userId: string) {
    // Toggle: same avatar re-clicked closes; different avatar switches.
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
const SCROLL_BOTTOM_THRESHOLD = 80 // px from bottom counts as "at bottom"

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

onMounted(() => {
    loadInitial().then(async () => {
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
})

onBeforeUnmount(() => {
    listResizeObserver?.disconnect()
    listResizeObserver = null
})

// SettingsModal state
const settingsOpen = ref(false)

// BottomBar input + send
const inputValue = ref('')

async function onSend(value: string) {
    const text = value.trim()
    if (!text) return
    const me = currentProfile.value
    if (!me) return
    const localMessage: MessageResponse = {
        cursorId: Date.now(),
        messageId: `local-${Date.now()}`,
        userId: me.userId,
        messageType: 'TEXT',
        furName: me.furName ?? me.username ?? '',
        avatar: me.avatar ?? null,
        content: text,
        imageUrls: [],
        stickerImageUrl: null,
        createdDate: new Date().toISOString(),
    }
    appendLive(localMessage)
    inputValue.value = ''
    await nextTick()
    scrollToBottom(true)
}

function onGearClick() {
    settingsOpen.value = true
}

function onSettingsClose() {
    settingsOpen.value = false
}
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

        <BottomBar
            v-model:input-value="inputValue"
            @gear-click="onGearClick"
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
    </div>
</template>
