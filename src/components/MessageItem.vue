<script setup lang="ts">
import { computed } from 'vue'
import './MessageItem.css'
import SpeechBubble from './SpeechBubble.vue'
import type { MockMessage } from '@/mocks/mockMessages'

const props = defineProps<{
    message: MockMessage
}>()

const emit = defineEmits<{
    (e: 'avatar-click', userId: string): void
    (e: 'image-click', imageUrl: string): void
}>()

const formattedTime = computed(() => {
    const d = new Date(props.message.timestamp)
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    return `${hh}:${mm}`
})

// Bubble outer width must include left padding (24px) + right padding
// (12px) + content area. For image messages content area must be >= 240
// (image max-width), so outer >= 240 + 24 + 12 = 276. We use 288 for a
// 12px margin. For text messages, 320 gives roughly 280px of text width.
// Height: image messages need >= 240 + 24 (vertical padding) = 264; we
// use 280 for a 16px margin. Text messages clamp to SpeechBubble's
// MIN_H of 40 via height = 60.
const bubbleWidth = computed(() => (props.message.imageUrl ? 288 : 320))
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
