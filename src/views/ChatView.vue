<script setup lang="ts">
import { computed, ref } from 'vue'
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

// BottomBar input + send
const inputValue = ref('')

function onSend(value: string) {
    const text = value.trim()
    if (!text) return
    appendMessage({
        userId: currentUser.value.id,
        nickname: currentUser.value.nickname,
        avatarUrl: currentUser.value.avatarUrl,
        content: text,
    })
    inputValue.value = ''
}

function onGearClick() {
    // Plan D will open SettingsModal here. For Plan B we just log.
    // eslint-disable-next-line no-console
    console.log('[ChatView] gear-click — SettingsModal lands in Plan D')
}
</script>

<template>
    <div class="chat-view">
        <div class="chat-view__list">
            <MessageItem
                v-for="m in messages"
                :key="m.id"
                :message="m"
                @avatar-click="onAvatarClick"
                @image-click="onImageClick"
            />
        </div>

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
