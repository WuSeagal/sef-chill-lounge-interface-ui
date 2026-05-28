<script setup lang="ts">
import { computed } from 'vue'
import './StickerTab.css'
import { useUser } from '@/composables/useUser'
import { assetUrl } from '@/utils/assetUrl'

const user = useUser()
const stickers = computed(() => user.profile.value?.stickers ?? [])

function onStickerFileChange(index: number, event: Event): void {
    const target = event.target as HTMLInputElement
    console.log(`[StickerTab] sticker ${index} file selected:`, target.files?.[0]?.name ?? 'none')
}
</script>

<template>
    <div class="sticker-tab" data-test="sticker-tab">
        <h3 class="sticker-tab__title">自訂貼圖</h3>
        <p class="sticker-tab__hint">5 個 slot,點擊上傳即時生效</p>
        <div class="sticker-tab__grid">
            <div v-for="s in stickers" :key="s.id" class="sticker-tab__slot">
                <img
                    class="sticker-tab__img"
                    :src="assetUrl(s.sticker ?? '')"
                    :alt="'sticker ' + s.stickerNo"
                />
                <input
                    class="sticker-tab__upload"
                    type="file"
                    accept="image/*"
                    @change="onStickerFileChange(s.stickerNo, $event)"
                />
            </div>
        </div>
    </div>
</template>
