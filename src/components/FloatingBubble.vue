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

const BUBBLE_WIDTH = 200
const BUBBLE_HEIGHT_TEXT = 60
const BUBBLE_HEIGHT_IMAGE = 130

const hasImage = computed(() => !!props.bubble.message.imageUrl)
const bubbleHeight = computed(() => hasImage.value ? BUBBLE_HEIGHT_IMAGE : BUBBLE_HEIGHT_TEXT)

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
                :width="BUBBLE_WIDTH"
                :height="bubbleHeight"
                :direction="bubble.direction"
            >
                <span v-if="!hasImage" class="floating-bubble__text">{{ bubble.message.content }}</span>
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
