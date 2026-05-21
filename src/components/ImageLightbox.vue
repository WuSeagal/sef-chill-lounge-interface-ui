<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from 'vue'
import './ImageLightbox.css'

const props = defineProps<{
    open: boolean
    imageUrl: string | null
}>()

const emit = defineEmits<{
    (e: 'close'): void
}>()

const visible = computed(() => props.open && props.imageUrl !== null)

function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && visible.value) {
        emit('close')
    }
}

watch(
    () => props.open,
    (open) => {
        if (open) {
            window.addEventListener('keydown', onKeydown)
        } else {
            window.removeEventListener('keydown', onKeydown)
        }
    },
    { immediate: true }
)

onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKeydown)
})

function onBackdropClick() {
    emit('close')
}

function onImageClick(event: Event) {
    event.stopPropagation()
}
</script>

<template>
    <div v-if="visible" class="image-lightbox" @click="onBackdropClick">
        <img class="image-lightbox__img" :src="imageUrl ?? ''" alt="" @click="onImageClick" />
    </div>
</template>
