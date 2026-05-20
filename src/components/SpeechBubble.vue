<script setup lang="ts">
import { computed } from 'vue'

type Direction = 'left' | 'right'

const props = defineProps<{
    width: number
    height: number
    direction: Direction
}>()

const MIN_W = 80
const MIN_H = 40

const safeW = computed(() => Math.max(MIN_W, props.width))
const safeH = computed(() => Math.max(MIN_H, props.height))

const pathD = computed(() => {
    const W = safeW.value
    const H = safeH.value
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
    const hMidR = H / 2
    return [
        `M6 0`,
        `L${W - 18} 0`,
        `Q${W - 12} 0 ${W - 12} 6`,
        `L${W - 12} ${hMidR - 10}`,
        `L${W} ${hMidR}`,
        `L${W - 12} ${hMidR + 10}`,
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
    // Skeleton: no padding. Real padding computed in Task 16.
    return {}
})
</script>

<template>
    <div class="speech-bubble" :style="{ width: safeW + 'px', height: safeH + 'px' }">
        <svg :width="safeW" :height="safeH" :viewBox="`0 0 ${safeW} ${safeH}`">
            <path
                :d="pathD"
                fill="var(--bubble-bg)"
                stroke="var(--bubble-border)"
                stroke-width="1.5"
            />
        </svg>
        <div class="content" :style="contentStyle">
            <slot></slot>
        </div>
    </div>
</template>

<style scoped>
.speech-bubble {
    position: relative;
    display: inline-block;
}

.speech-bubble svg {
    position: absolute;
    inset: 0;
    pointer-events: none;
}

.content {
    position: relative;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    color: var(--input-text);
    font-family: var(--font-family-base);
}
</style>
