<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import './DashboardView.css'
import '@/assets/grid-paper.css'
import FloatingBubble from '@/components/FloatingBubble.vue'
import { useDashboardBubbles } from '@/composables/useDashboardBubbles'
import { useMockMessages } from '@/composables/useMockMessages'

const { messages } = useMockMessages()
const { bubbles, addBubble, startAnimation, cleanup } = useDashboardBubbles()

const isFullscreen = ref(false)

function onFullscreenChange() {
    isFullscreen.value = !!document.fullscreenElement
}

onMounted(() => {
    const initial = messages.value.slice(0, 30)
    initial.forEach(msg => addBubble(msg))
    startAnimation()
    document.addEventListener('fullscreenchange', onFullscreenChange)
})

onBeforeUnmount(() => {
    cleanup()
    document.removeEventListener('fullscreenchange', onFullscreenChange)
})

function onFullscreenClick() {
    if (isFullscreen.value) {
        document.exitFullscreen()
    } else {
        document.documentElement.requestFullscreen()
    }
}
</script>

<template>
    <div class="dashboard-view grid-paper">
        <FloatingBubble
            v-for="b in bubbles"
            :key="b.id"
            :bubble="b"
        />

        <button
            class="dashboard-view__fullscreen-btn"
            :class="{ 'dashboard-view__fullscreen-btn--hidden': isFullscreen }"
            type="button"
            aria-label="toggle fullscreen"
            @click="onFullscreenClick"
        >
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                    v-if="!isFullscreen"
                    d="M4 4h6M4 4v6M20 4h-6M20 4v6M4 20h6M4 20v-6M20 20h-6M20 20v-6"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                />
                <path
                    v-else
                    d="M10 4v6H4M14 4v6h6M10 20v-6H4M14 20v-6h6"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                />
            </svg>
        </button>
    </div>
</template>
