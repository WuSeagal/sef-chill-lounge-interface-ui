<script setup lang="ts">
import { computed } from 'vue'
import './FloatingBubble.css'
import SpeechBubble from '@/components/SpeechBubble.vue'
import { buildAvatarRingStyle } from '@/utils/avatarRing'
import { resolveAvatarSrc } from '@/utils/avatarSource'
import type { DashboardBubble } from '@/composables/useDashboardBubbles'

const props = defineProps<{
    bubble: DashboardBubble
}>()

const avatarRingStyle = computed(() =>
    buildAvatarRingStyle(props.bubble.message.avatarColor, props.bubble.message.avatarBorder ?? false, 'lg'))

// 圖片泡泡尺寸上限（內容自適應，SpeechBubble 依量測尺寸繪製外框）
// 寬 276 = 圖片最長邊 240 + 內距(尾側24 + 另側12 = 36)，確保 240 的圖片完整放進泡泡不溢出
const BUBBLE_MAX_W = 276
const BUBBLE_MAX_H = 520

const hasImage = computed(() => !!props.bubble.message.imageUrl)

const wrapperStyle = computed(() => ({
    transform: `translate(${props.bubble.x}px, ${props.bubble.y}px)`,
    zIndex: props.bubble.zIndex,
}))

const innerClass = computed(() => ({
    'floating-bubble__inner': true,
    'floating-bubble__inner--entering': !props.bubble.isExiting,
    'floating-bubble__inner--exiting': props.bubble.isExiting,
}))
</script>

<template>
    <div class="floating-bubble" :style="wrapperStyle">
        <div :class="innerClass">
            <img
                class="floating-bubble__avatar"
                :class="{ 'floating-bubble__avatar--right': bubble.direction === 'right' }"
                :src="resolveAvatarSrc(bubble.message.avatarUrl)"
                :style="avatarRingStyle"
                alt=""
            />
            <SpeechBubble
                :direction="bubble.direction"
                :max-width="hasImage ? BUBBLE_MAX_W : undefined"
                :max-height="BUBBLE_MAX_H"
            >
                <div v-if="!hasImage" class="floating-bubble__text">{{ bubble.message.content }}</div>
                <div v-else class="floating-bubble__image-wrap">
                    <img
                        class="floating-bubble__image"
                        :src="bubble.message.imageUrl"
                        alt=""
                    />
                    <span v-if="bubble.message.content" class="floating-bubble__caption">{{ bubble.message.content }}</span>
                </div>
            </SpeechBubble>
        </div>
    </div>
</template>
