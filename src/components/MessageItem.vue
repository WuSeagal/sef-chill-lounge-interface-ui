<script setup lang="ts">
import { computed } from 'vue'
import './MessageItem.css'
import SpeechBubble from './SpeechBubble.vue'
import { useViewport } from '@/composables/useViewport'
import type { MockMessage } from '@/mocks/mockMessages'

const props = defineProps<{
    message: MockMessage
}>()

const emit = defineEmits<{
    (e: 'avatar-click', userId: string): void
    (e: 'image-click', imageUrl: string): void
}>()

const viewport = useViewport()

const formattedTime = computed(() => {
    const d = new Date(props.message.timestamp)
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    return `${hh}:${mm}`
})

// Bubble outer width must include left padding (24px) + right padding
// (12px) + content area. For image messages content area must hold the
// 240px-max thumbnail, so target outer >= 276. For text messages 320
// gives roughly 280px of text width.
//
// On narrow viewports we clamp to whatever space is actually available
// after the avatar column. The .message-item row uses:
//   padding-left (16) + avatar (36) + gap (8) + padding-right (16) = 76 px
// so the bubble's max usable outer width is viewport.width - 76.
// SpeechBubble's own MIN_W of 80 takes over on extremely narrow screens.
const ROW_CHROME_PX = 76
const bubbleWidth = computed(() => {
    const target = props.message.imageUrl ? 288 : 320
    const available = Math.max(80, viewport.width.value - ROW_CHROME_PX)
    return Math.min(target, available)
})

// Image messages need extra vertical room for the 240px-tall thumbnail
// PLUS the 24px combined top/bottom padding inside the bubble.
const bubbleHeight = computed(() => (props.message.imageUrl ? 280 : 60))

function onAvatarClick() {
    emit('avatar-click', props.message.userId)
}

function onImageClick() {
    if (props.message.imageUrl) {
        emit('image-click', props.message.imageUrl)
    }
}

const avatarStyle = computed(() => ({
    backgroundImage: `url(${props.message.avatarUrl})`,
}))
</script>

<template>
    <div class="message-item">
        <button
            class="message-item__avatar"
            type="button"
            :style="avatarStyle"
            :aria-label="`open ${message.nickname} profile`"
            @click.stop="onAvatarClick"
        ></button>
        <div class="message-item__body">
            <div class="message-item__meta">
                <span class="message-item__nickname">{{ message.nickname }}</span>
                <span class="message-item__timestamp">{{ formattedTime }}</span>
            </div>
            <SpeechBubble
                class="message-item__bubble"
                :width="bubbleWidth"
                :height="bubbleHeight"
                direction="left"
            >
                <img
                    v-if="message.imageUrl"
                    class="message-item__image"
                    :src="message.imageUrl"
                    alt=""
                    :style="{ maxWidth: '240px', maxHeight: '240px' }"
                    @click="onImageClick"
                />
                <span v-else class="message-item__content">{{ message.content }}</span>
            </SpeechBubble>
        </div>
    </div>
</template>
