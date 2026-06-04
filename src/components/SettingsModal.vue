<script setup lang="ts">
import { ref, onBeforeUnmount, watch } from 'vue'
import './SettingsModal.css'
import SettingsTab from './SettingsTab.vue'
import StickerTab from './StickerTab.vue'
import TopicCardTab from './TopicCardTab.vue'
import FeedbackTab from './FeedbackTab.vue'
import DonateTab from './DonateTab.vue'

type TabId = 'settings' | 'sticker' | 'topic' | 'feedback' | 'donate'

const TABS: { id: TabId; label: string }[] = [
    { id: 'settings', label: '個人資料' },
    { id: 'sticker', label: '貼圖設定' },
    { id: 'topic', label: '重抽話題卡' },
    { id: 'feedback', label: '意見回饋' },
    { id: 'donate', label: '斗內連結' },
]

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const activeTab = ref<TabId>('settings')

// Explicit shape for SettingsTab.defineExpose — keeps type safety even though Vue
// auto-unwraps ComputedRef when accessed via parent ref. If SettingsTab's exposed
// shape changes, TS will catch it instead of silently breaking this guard.
interface SettingsTabExposed {
    isDirty: boolean
    saveAll: () => Promise<void>
}
const settingsTabRef = ref<(InstanceType<typeof SettingsTab> & SettingsTabExposed) | null>(null)
const stickerTabRef = ref<{ isDirty: boolean; saveAll: () => Promise<void> } | null>(null)

function activeDirty(): boolean {
    if (activeTab.value === 'settings') return settingsTabRef.value?.isDirty ?? false
    if (activeTab.value === 'sticker') return stickerTabRef.value?.isDirty ?? false
    return false
}

function attemptSwitch(id: TabId): void {
    if (id === activeTab.value) return
    if (activeDirty()) {
        const ok = window.confirm('有未儲存的變更,確定要切換頁簽?')
        if (!ok) return
    }
    activeTab.value = id
}

function attemptClose(): void {
    if (activeDirty()) {
        const ok = window.confirm('有未儲存的變更,確定要關閉?')
        if (!ok) return
    }
    emit('close')
}

function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && props.open) {
        attemptClose()
    }
}

watch(
    () => props.open,
    (open) => {
        if (open) {
            activeTab.value = 'settings'
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
</script>

<template>
    <Transition name="settings-modal">
        <div v-if="open" class="settings-modal" @click="attemptClose">
            <div class="settings-modal__panel" @click.stop>
                <button
                    class="settings-modal__close"
                    type="button"
                    aria-label="close"
                    @click="attemptClose"
                >&#x2715;</button>
                <div class="settings-modal__layout">
                    <nav class="settings-modal__rail" role="tablist" aria-label="設定分頁">
                        <button
                            v-for="tab in TABS"
                            :key="tab.id"
                            class="settings-modal__tab"
                            :class="{ 'settings-modal__tab--active': tab.id === activeTab }"
                            type="button"
                            role="tab"
                            :aria-selected="tab.id === activeTab"
                            @click="attemptSwitch(tab.id)"
                        >{{ tab.label }}</button>
                    </nav>
                    <div class="settings-modal__body">
                        <SettingsTab v-if="activeTab === 'settings'" ref="settingsTabRef" />
                        <StickerTab v-if="activeTab === 'sticker'" ref="stickerTabRef" />
                        <TopicCardTab v-if="activeTab === 'topic'" />
                        <FeedbackTab v-if="activeTab === 'feedback'" />
                        <DonateTab v-if="activeTab === 'donate'" />
                    </div>
                </div>
            </div>
        </div>
    </Transition>
</template>
