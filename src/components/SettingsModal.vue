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
    { id: 'settings', label: '設定' },
    { id: 'sticker', label: '貼圖' },
    { id: 'topic', label: '話題卡' },
    { id: 'feedback', label: '回饋' },
    { id: 'donate', label: '斗內' },
]

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const activeTab = ref<TabId>('settings')
const settingsTabRef = ref<InstanceType<typeof SettingsTab> | null>(null)

function attemptClose(): void {
    const dirty = (settingsTabRef.value as any)?.isDirty?.value
    if (dirty) {
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
                <div class="settings-modal__header">
                    <div class="settings-modal__tabs" role="tablist">
                        <button
                            v-for="tab in TABS"
                            :key="tab.id"
                            class="settings-modal__tab"
                            :class="{ 'settings-modal__tab--active': tab.id === activeTab }"
                            type="button"
                            role="tab"
                            :aria-selected="tab.id === activeTab"
                            @click="activeTab = tab.id"
                        >{{ tab.label }}</button>
                    </div>
                    <button
                        class="settings-modal__close"
                        type="button"
                        aria-label="close"
                        @click="attemptClose"
                    >&#x2715;</button>
                </div>
                <div class="settings-modal__body">
                    <SettingsTab v-if="activeTab === 'settings'" ref="settingsTabRef" />
                    <StickerTab v-if="activeTab === 'sticker'" />
                    <TopicCardTab v-if="activeTab === 'topic'" />
                    <FeedbackTab v-if="activeTab === 'feedback'" />
                    <DonateTab v-if="activeTab === 'donate'" />
                </div>
            </div>
        </div>
    </Transition>
</template>
