<script setup lang="ts">
import { computed, ref } from 'vue'
import './StickerTab.css'
import StickerManager from './StickerManager.vue'
import { useUser } from '@/composables/useUser'
import { push } from 'notivue'

const user = useUser()
const managerRef = ref<InstanceType<typeof StickerManager> | null>(null)
const saving = ref(false)

const initial = computed(() => user.profile.value?.stickers ?? [])
const isDirty = computed(() => managerRef.value?.isDirty ?? false)

async function onSave(): Promise<void> {
    if (!managerRef.value || saving.value) return
    saving.value = true
    try {
        await managerRef.value.saveAll()
        await user.fetchProfile()
        push.success('貼圖已更新')
    } catch {
        push.warning('貼圖儲存失敗，請重試')
    } finally {
        saving.value = false
    }
}

async function saveAll(): Promise<void> {
    await onSave()
}

// 「還原」：清掉所有暫存的貼圖新增/刪除（供 modal 層級未儲存浮層用）
function discardDrafts(): void {
    managerRef.value?.clearStaging()
}

defineExpose({ isDirty, saveAll, discardDrafts })
</script>

<template>
    <div class="sticker-tab" data-test="sticker-tab">
        <div class="sticker-tab__stage">
            <h3 class="sticker-tab__title">自訂貼圖</h3>
            <StickerManager ref="managerRef" :initial="initial" :key="initial.length" />
            <button
                class="sticker-tab__save"
                type="button"
                data-test="sticker-save"
                :disabled="!isDirty || saving"
                @click="onSave"
            >{{ saving ? '儲存中…' : '儲存貼圖' }}</button>
        </div>
    </div>
</template>
