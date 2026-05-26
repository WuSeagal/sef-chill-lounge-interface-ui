<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from 'vue'
import './ImageLightbox.css'
import { assetUrl } from '@/utils/assetUrl'

const props = defineProps<{
    open: boolean
    imageUrl: string | null
}>()

const resolvedUrl = computed(() => assetUrl(props.imageUrl))

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

function onFrameClick(event: Event) {
    // Clicks inside the frame (image, link) do NOT close the lightbox.
    event.stopPropagation()
}
</script>

<template>
    <div v-if="visible" class="image-lightbox" @click="onBackdropClick">
        <div class="image-lightbox__frame" @click="onFrameClick">
            <img class="image-lightbox__img" :src="resolvedUrl" alt="" />
            <a
                class="image-lightbox__open-link"
                :href="resolvedUrl || '#'"
                target="_blank"
                rel="noopener noreferrer"
            >在瀏覽器中開啟</a>
        </div>
    </div>
</template>
