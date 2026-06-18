<script setup lang="ts">
import './UnreadDivider.css'

defineProps<{
    leaving?: boolean
}>()
</script>

<template>
    <div
        class="unread-divider"
        :class="{ 'is-leaving': leaving }"
        role="separator"
        aria-label="新訊息"
        aria-live="polite"
    >
        <span class="unread-divider__pill">
            <span class="unread-divider__label">新訊息</span>
            <svg class="unread-divider__arrow" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M12 4 V20 M5 13 L12 20 L19 13" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" fill="none" />
            </svg>
        </span>
    </div>
</template>
