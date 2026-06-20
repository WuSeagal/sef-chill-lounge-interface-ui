<script setup lang="ts">
import './DashboardOnlineCounter.css'

defineProps<{
    count: number
    connected: boolean
    // clickable=true 時為可點擊入口（/chat：開 People 名單）；否則為純展示（/dashboard 投影，不互動）。
    clickable?: boolean
}>()

const emit = defineEmits<{
    (e: 'click'): void
}>()
</script>

<template>
    <button
        v-if="clickable"
        type="button"
        class="dashboard-online-counter"
        :aria-label="`線上人數 ${count}，點擊查看參加成員`"
        @click="emit('click')"
    >
        <span class="dashboard-online-counter__dot" :class="{ 'is-live': connected }"></span>
        <span class="dashboard-online-counter__num">{{ count }}</span>
    </button>
    <div
        v-else
        class="dashboard-online-counter"
        role="status"
        :aria-label="`線上人數 ${count}`"
    >
        <span class="dashboard-online-counter__dot" :class="{ 'is-live': connected }"></span>
        <span class="dashboard-online-counter__num">{{ count }}</span>
    </div>
</template>
