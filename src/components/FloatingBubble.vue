<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
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

// 泡泡外框色：啟用頭像外框且有代表色 → 用該色（與色環同色）；否則 fallback #9c8f68
const bubbleStrokeColor = computed(() => {
    const { avatarColor, avatarBorder } = props.bubble.message
    return (avatarBorder && avatarColor) ? avatarColor : '#9c8f68'
})

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
    // 只有標記為新到達（animateEntrance）且未退場的泡泡才播後空翻入場動畫
    'floating-bubble__inner--entering': props.bubble.animateEntrance && !props.bubble.isExiting,
    'floating-bubble__inner--exiting': props.bubble.isExiting,
}))

// 量測頭像在 wrapper 內的垂直 offset / 高度，回寫給漂浮物理（垂直碰撞以頭像頂/底為基準）。
// 用 offsetTop（版面值，不受入場後空翻 transform 影響）；圖片載入等內容尺寸變動時由 ResizeObserver 重新量測。
const innerEl = ref<HTMLElement | null>(null)
const avatarEl = ref<HTMLImageElement | null>(null)
let resizeObserver: ResizeObserver | null = null

function measureAvatar() {
    const el = avatarEl.value
    if (!el) return
    // offsetTop 相對 offsetParent（.floating-bubble，position:absolute）。目前 wrapper 無 padding/border、
    // inner 貼齊 wrapper 原點，故此值 = 頭像在 inner 內的垂直 offset。若日後替 wrapper 加內距或讓 inner 帶
    // position，這個對應會失準，需改量「頭像相對 inner」。
    props.bubble.avatarOffsetTop = el.offsetTop
    props.bubble.avatarH = el.offsetHeight
}

onMounted(() => {
    measureAvatar()
    if (typeof ResizeObserver !== 'undefined' && innerEl.value) {
        resizeObserver = new ResizeObserver(() => measureAvatar())
        resizeObserver.observe(innerEl.value)
    }
})

onBeforeUnmount(() => {
    resizeObserver?.disconnect()
    resizeObserver = null
})
</script>

<template>
    <div class="floating-bubble" :style="wrapperStyle">
        <div ref="innerEl" :class="innerClass">
            <img
                ref="avatarEl"
                class="floating-bubble__avatar"
                :class="{ 'floating-bubble__avatar--right': bubble.direction === 'right' }"
                :src="resolveAvatarSrc(bubble.message.avatarUrl)"
                :style="avatarRingStyle"
                alt=""
                decoding="async"
            />
            <SpeechBubble
                :direction="bubble.direction"
                :max-width="hasImage ? BUBBLE_MAX_W : undefined"
                :max-height="BUBBLE_MAX_H"
                :stroke-color="bubbleStrokeColor"
            >
                <div v-if="!hasImage" class="floating-bubble__text">{{ bubble.message.content }}</div>
                <div v-else class="floating-bubble__image-wrap">
                    <img
                        class="floating-bubble__image"
                        :src="bubble.message.imageUrl"
                        alt=""
                        decoding="async"
                    />
                    <span v-if="bubble.message.content" class="floating-bubble__caption">{{ bubble.message.content }}</span>
                </div>
            </SpeechBubble>
        </div>
    </div>
</template>
