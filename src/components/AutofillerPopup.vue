<script setup lang="ts">
import './AutofillerPopup.css'
import type { AutofillerOption } from '@/composables/useChatAutofiller'

defineProps<{
    open: boolean
    options: AutofillerOption[]
    focusedIndex: number
}>()
defineEmits<{ (e: 'select', option: AutofillerOption): void }>()
</script>

<template>
    <div v-if="open" class="autofiller-popup" role="listbox" data-test="autofiller-popup">
        <div
            v-for="(opt, idx) in options"
            :key="opt.tagId"
            class="autofiller-popup__option"
            :class="{ 'autofiller-popup__option--focus': idx === focusedIndex }"
            role="option"
            :aria-selected="idx === focusedIndex"
            :data-test="`af-option-${opt.tagId}`"
            @mousedown.prevent="$emit('select', opt)"
        >
            <span class="autofiller-popup__prefix">{{ opt.prefix }}</span>
            <span class="autofiller-popup__content">{{ opt.content }}</span>
        </div>
    </div>
</template>
