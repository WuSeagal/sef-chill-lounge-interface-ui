<script setup lang="ts">
import './DashboardOnlineCounter.css'

defineProps<{
    count: number
    connected: boolean
}>()
</script>

<template>
    <div class="dashboard-online-counter" role="status" aria-label="線上人數">
        <span class="dashboard-online-counter__dot" :class="{ 'is-live': connected }"></span>
        <span class="dashboard-online-counter__num">{{ count }}</span>
    </div>
</template>
