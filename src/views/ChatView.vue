<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import './ChatView.css'
import MessageItem from '@/components/MessageItem.vue'
import BottomBar from '@/components/BottomBar.vue'
import UserPopup from '@/components/UserPopup.vue'
import ImageLightbox from '@/components/ImageLightbox.vue'
import { useMockMessages } from '@/composables/useMockMessages'
import { useMockUser } from '@/composables/useMockUser'
import { useMockMember } from '@/composables/useMockMember'

const { messages, appendMessage } = useMockMessages()
const { user: currentUser } = useMockUser()

// UserPopup state — tracks which userId's popup is open. null = closed.
const popupUserId = ref<string | null>(null)
const popupMember = useMockMember(computed(() => popupUserId.value ?? ''))
const popupOpen = computed(() => popupUserId.value !== null && popupMember.value !== undefined)

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

function scrollToBottom(smooth = true) {
    const el = listEl.value
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
}

function onScrollFabClick() {
    scrollToBottom(true)
}

onMounted(() => {
    // Start pinned to the bottom (newest messages at the bottom).
    scrollToBottom(false)
    nextTick(updateAtBottom)
})

// BottomBar input + send
const inputValue = ref('')

async function onSend(value: string) {
    const text = value.trim()
    if (!text) return
    appendMessage({
        userId: currentUser.value.id,
        nickname: currentUser.value.nickname,
        avatarUrl: currentUser.value.avatarUrl,
        content: text,
    })
    inputValue.value = ''
    await nextTick()
    scrollToBottom(true)
}

function onGearClick() {
    // Plan D will open SettingsModal here. For Plan B we just log.
    // eslint-disable-next-line no-console
    console.log('[ChatView] gear-click — SettingsModal lands in Plan D')
}
</script>

<template>
    <div class="chat-view">
        <div
            ref="listEl"
            class="chat-view__list"
            @scroll="updateAtBottom"
        >
            <MessageItem
                v-for="m in messages"
                :key="m.id"
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

        <BottomBar
            v-model:input-value="inputValue"
            @gear-click="onGearClick"
            @send="onSend"
        />

        <UserPopup
            :open="popupOpen"
            :member="popupMember ?? null"
            @close="onPopupClose"
        />

        <ImageLightbox
            :open="lightboxOpen"
            :image-url="lightboxImageUrl"
            @close="onLightboxClose"
        />
    </div>
</template>
