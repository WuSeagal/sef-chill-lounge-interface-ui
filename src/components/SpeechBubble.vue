<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import './SpeechBubble.css'

type Direction = 'left' | 'right'

const props = withDefaults(defineProps<{
    direction: Direction
    maxWidth?: number
    maxHeight?: number
    /** 主體泡泡描邊顏色；未傳時維持站內預設 --bubble-border */
    strokeColor?: string
}>(), {
    strokeColor: 'var(--bubble-border)',
})

const MIN_W = 80
const MIN_H = 40

// 內容自適應：以 ResizeObserver 量測容器實際 box，再據此繪製 SVG 外框。
const rootRef = ref<HTMLElement | null>(null)
const measuredW = ref(MIN_W)
const measuredH = ref(MIN_H)
let ro: ResizeObserver | null = null

function measure(): void {
    const el = rootRef.value
    if (!el) return
    measuredW.value = Math.max(MIN_W, Math.round(el.clientWidth))
    measuredH.value = Math.max(MIN_H, Math.round(el.clientHeight))
}

onMounted(() => {
    if (typeof ResizeObserver !== 'undefined') {
        ro = new ResizeObserver(() => measure())
        if (rootRef.value) ro.observe(rootRef.value)
    }
    measure()
})

onBeforeUnmount(() => {
    ro?.disconnect()
    ro = null
})

const rootStyle = computed(() => ({
    maxWidth: props.maxWidth ? `${props.maxWidth}px` : undefined,
    maxHeight: props.maxHeight ? `${props.maxHeight}px` : undefined,
}))

const pathD = computed(() => {
    const W = measuredW.value
    const H = measuredH.value
    const hMid = H / 2
    if (props.direction === 'left') {
        return [
            `M18 0`,
            `L${W - 6} 0`,
            `Q${W} 0 ${W} 6`,
            `L${W} ${H - 6}`,
            `Q${W} ${H} ${W - 6} ${H}`,
            `L18 ${H}`,
            `Q12 ${H} 12 ${H - 6}`,
            `L12 ${hMid + 10}`,
            `L0 ${hMid}`,
            `L12 ${hMid - 10}`,
            `L12 6`,
            `Q12 0 18 0`,
            `Z`,
        ].join(' ')
    }
    return [
        `M6 0`,
        `L${W - 18} 0`,
        `Q${W - 12} 0 ${W - 12} 6`,
        `L${W - 12} ${hMid - 10}`,
        `L${W} ${hMid}`,
        `L${W - 12} ${hMid + 10}`,
        `L${W - 12} ${H - 6}`,
        `Q${W - 12} ${H} ${W - 18} ${H}`,
        `L6 ${H}`,
        `Q0 ${H} 0 ${H - 6}`,
        `L0 6`,
        `Q0 0 6 0`,
        `Z`,
    ].join(' ')
})

const contentStyle = computed(() => {
    if (props.direction === 'left') {
        return { paddingTop: '12px', paddingRight: '12px', paddingBottom: '12px', paddingLeft: '24px' }
    }
    return { paddingTop: '12px', paddingRight: '24px', paddingBottom: '12px', paddingLeft: '12px' }
})
</script>

<template>
    <div ref="rootRef" class="speech-bubble" :style="rootStyle">
        <svg
            class="speech-bubble__bg"
            :width="measuredW"
            :height="measuredH"
            :viewBox="`0 0 ${measuredW} ${measuredH}`"
        >
            <!-- 重疊分隔光暈：同形 path 畫在主體下層，僅露出外緣白邊作為相鄰泡泡分界 -->
            <path
                class="speech-bubble__halo"
                :d="pathD"
                fill="none"
                stroke="#ffffff"
                stroke-width="6"
            />
            <path
                class="speech-bubble__path"
                :d="pathD"
                fill="var(--bubble-bg)"
                :stroke="strokeColor"
                stroke-width="2"
            />
        </svg>
        <div class="content" :style="contentStyle">
            <slot></slot>
        </div>
    </div>
</template>
