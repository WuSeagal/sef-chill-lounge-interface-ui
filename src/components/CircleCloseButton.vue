<script setup lang="ts">
import './CircleCloseButton.css'

defineProps<{ ariaLabel: string }>()
const emit = defineEmits<{ (e: 'remove'): void }>()
</script>

<template>
  <button type="button" class="circle-close" :aria-label="ariaLabel" @click="emit('remove')">
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M7 7l10 10M17 7L7 17" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" fill="none" />
    </svg>
  </button>
</template>
