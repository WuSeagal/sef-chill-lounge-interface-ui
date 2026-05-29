<script setup lang="ts">
import './ToggleSwitch.css'

defineProps<{
    modelValue: boolean
    ariaLabel?: string
}>()

const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void
}>()

function onChange(event: Event): void {
    emit('update:modelValue', (event.target as HTMLInputElement).checked)
}
</script>

<template>
    <label class="toggle-switch">
        <input
            class="toggle-switch__input"
            type="checkbox"
            role="switch"
            :checked="modelValue"
            :aria-label="ariaLabel"
            @change="onChange"
        />
        <span class="toggle-switch__track" aria-hidden="true">
            <span class="toggle-switch__knob"></span>
        </span>
    </label>
</template>
