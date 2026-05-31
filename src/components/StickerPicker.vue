<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import './StickerPicker.css'
import { assetUrl } from '@/utils/assetUrl'
import type { Sticker } from '@/types/user'

const props = defineProps<{ open: boolean; stickers: Sticker[] }>()
const emit = defineEmits<{ (e: 'select', url: string): void; (e: 'close'): void }>()

const rootEl = ref<HTMLElement | null>(null)

function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && props.open) emit('close')
}
function onOutsideClick(event: MouseEvent) {
    if (!props.open) return
    const target = event.target as Node | null
    if (target && rootEl.value && rootEl.value.contains(target)) return
    emit('close')
}
function onSelfClick(event: MouseEvent) {
    event.stopPropagation()
}

watch(() => props.open, (open) => {
    if (open) {
        window.addEventListener('keydown', onKeydown)
        window.addEventListener('click', onOutsideClick)
    } else {
        window.removeEventListener('keydown', onKeydown)
        window.removeEventListener('click', onOutsideClick)
    }
}, { immediate: true })

onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKeydown)
    window.removeEventListener('click', onOutsideClick)
})

function onPick(url: string | null) {
    if (url) emit('select', url)
}
</script>

<template>
    <div v-if="open" ref="rootEl" class="sticker-picker" @click="onSelfClick">
        <div v-if="stickers.length === 0" class="sticker-picker__empty" data-test="picker-empty">
            尚無貼圖，先到設定上傳
        </div>
        <div v-else class="sticker-picker__grid">
            <button
                v-for="s in stickers"
                :key="s.id"
                class="sticker-picker__item"
                type="button"
                data-test="picker-sticker"
                :aria-label="'傳送貼圖 ' + s.stickerNo"
                @click="onPick(s.sticker)"
            >
                <img class="sticker-picker__img" :src="assetUrl(s.sticker ?? '')" :alt="'貼圖 ' + s.stickerNo" />
            </button>
        </div>
    </div>
</template>
