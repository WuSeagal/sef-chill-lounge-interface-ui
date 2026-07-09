<script setup lang="ts">
import './DateDivider.css'

defineProps<{
    label: string
}>()
</script>

<template>
    <div class="date-divider" role="separator" :aria-label="label">
        <span class="date-divider__label">{{ label }}</span>
    </div>
</template>
