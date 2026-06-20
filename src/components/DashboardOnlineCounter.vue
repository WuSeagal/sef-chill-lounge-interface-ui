<script setup lang="ts">
import './DashboardOnlineCounter.css'

defineProps<{
    count: number
    connected: boolean
}>()

const emit = defineEmits<{
    (e: 'click'): void
}>()
</script>

<template>
    <button
        type="button"
        class="dashboard-online-counter"
        :aria-label="`線上人數 ${count}，點擊查看現場成員`"
        @click="emit('click')"
    >
        <span class="dashboard-online-counter__dot" :class="{ 'is-live': connected }"></span>
        <span class="dashboard-online-counter__num">{{ count }}</span>
    </button>
</template>
