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
    // Skeleton: empty path. Real path computed in Task 14 (left) and Task 15 (right).
    // An empty d attribute is valid SVG and renders no shape, allowing skeleton tests to pass.
    void safeW.value
    void safeH.value
    void props.direction
    return ''
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
