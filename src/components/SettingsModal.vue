<script setup lang="ts">
import { ref, computed, onBeforeUnmount, watch } from 'vue'
import './SettingsModal.css'
import SettingsTab from './SettingsTab.vue'
import StickerTab from './StickerTab.vue'
import TopicCardTab from './TopicCardTab.vue'
import FeedbackTab from './FeedbackTab.vue'
import DonateTab from './DonateTab.vue'
import ExportPassportTab from './ExportPassportTab.vue'
import AnnouncementTab from './AnnouncementTab.vue'
import ConfirmDialog from './ConfirmDialog.vue'
import { useAuthStore } from '@/stores/auth'
import { isHost } from '@/utils/host'

type TabId = 'settings' | 'export' | 'sticker' | 'topic' | 'feedback' | 'donate' | 'announcement'

const TABS: { id: TabId; label: string }[] = [
    { id: 'settings', label: '個人資料' },
    { id: 'sticker', label: '貼圖設定' },
    { id: 'export', label: '輸出護照' },
    { id: 'topic', label: '重抽話題卡' },
    { id: 'feedback', label: '意見回饋' },
    { id: 'donate', label: '斗內連結' },
]

// 公告分頁僅 host 可見（重用 ① 的 isHost；非 host 不顯示）
const authStore = useAuthStore()
const visibleTabs = computed<{ id: TabId; label: string }[]>(() =>
    isHost(authStore.user?.providerUserId) ? [...TABS, { id: 'announcement', label: '公告' }] : TABS,
)

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const activeTab = ref<TabId>('settings')

// Explicit shape for SettingsTab.defineExpose — keeps type safety even though Vue
// auto-unwraps ComputedRef when accessed via parent ref. If SettingsTab's exposed
// shape changes, TS will catch it instead of silently breaking this guard.
interface UnsavedTabExposed {
    isDirty: boolean
    saveAll: () => Promise<void>
    discardDrafts: () => void
}
const settingsTabRef = ref<(InstanceType<typeof SettingsTab> & UnsavedTabExposed) | null>(null)
const stickerTabRef = ref<UnsavedTabExposed | null>(null)

// 當前若停在有 staged-save 的分頁（個人資料 / 貼圖設定），回傳其 expose，否則 null
function activeUnsavedTab(): UnsavedTabExposed | null {
    if (activeTab.value === 'settings') return settingsTabRef.value
    if (activeTab.value === 'sticker') return stickerTabRef.value
    return null
}

function activeDirty(): boolean {
    return activeUnsavedTab()?.isDirty ?? false
}

// modal 層級未儲存浮層：當前分頁可 staged-save 且 dirty 時，從 panel 底部滑出
const showUnsavedBar = computed(() =>
    (activeTab.value === 'settings' || activeTab.value === 'sticker') && activeDirty())

function onBarSave(): void {
    void activeUnsavedTab()?.saveAll()
}
function onBarDiscard(): void {
    activeUnsavedTab()?.discardDrafts()
}

// 未儲存離開警告改用自訂 ConfirmDialog（非同步）：以 pendingAction 記住待執行動作
const pendingAction = ref<{ type: 'switch'; tab: TabId } | { type: 'close' } | null>(null)

function attemptSwitch(id: TabId): void {
    if (id === activeTab.value) return
    if (activeDirty()) {
        pendingAction.value = { type: 'switch', tab: id }
        return
    }
    activeTab.value = id
}

function attemptClose(): void {
    if (activeDirty()) {
        pendingAction.value = { type: 'close' }
        return
    }
    emit('close')
}

// ConfirmDialog「狠心離開」→ 執行待辦動作；「取消」→ 留在原處
function onConfirmLeave(): void {
    const action = pendingAction.value
    pendingAction.value = null
    if (!action) return
    if (action.type === 'switch') activeTab.value = action.tab
    else emit('close')
}
function onCancelLeave(): void {
    pendingAction.value = null
}

function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && props.open) {
        // ConfirmDialog 開著時讓它自己處理 Esc（取消），不重複觸發關閉流程
        if (pendingAction.value !== null) return
        attemptClose()
    }
}

watch(
    () => props.open,
    (open) => {
        if (open) {
            activeTab.value = 'settings'
            pendingAction.value = null
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
                            v-for="tab in visibleTabs"
                            :key="tab.id"
                            class="settings-modal__tab"
                            :class="{ 'settings-modal__tab--active': tab.id === activeTab }"
                            type="button"
                            role="tab"
                            :aria-selected="tab.id === activeTab"
                            @click="attemptSwitch(tab.id)"
                        >{{ tab.label }}</button>
                    </nav>
                    <div
                        class="settings-modal__body"
                        :class="{ 'settings-modal__body--with-bar': showUnsavedBar }"
                    >
                        <SettingsTab v-if="activeTab === 'settings'" ref="settingsTabRef" />
                        <ExportPassportTab v-if="activeTab === 'export'" />
                        <StickerTab v-if="activeTab === 'sticker'" ref="stickerTabRef" />
                        <TopicCardTab v-if="activeTab === 'topic'" />
                        <FeedbackTab v-if="activeTab === 'feedback'" />
                        <DonateTab v-if="activeTab === 'donate'" />
                        <AnnouncementTab v-if="activeTab === 'announcement'" />
                    </div>
                </div>
                <!-- #12 未儲存浮層：附在 panel 底、從下滑出；個人資料/貼圖設定 dirty 時顯示，原頁面與原儲存鈕不變 -->
                <Transition name="unsaved-bar">
                    <div v-if="showUnsavedBar" class="settings-modal__unsaved" data-test="unsaved-bar">
                        <span class="settings-modal__unsaved-msg">您有未儲存的改動！</span>
                        <div class="settings-modal__unsaved-actions">
                            <button
                                type="button"
                                class="settings-modal__unsaved-discard"
                                @click="onBarDiscard"
                            >還原</button>
                            <button
                                type="button"
                                class="settings-modal__unsaved-save"
                                @click="onBarSave"
                            >儲存</button>
                        </div>
                    </div>
                </Transition>
            </div>
            <ConfirmDialog
                :open="pendingAction !== null"
                message="有尚未儲存的改動，要離開嗎？"
                confirm-text="狠心離開"
                cancel-text="取消"
                @confirm="onConfirmLeave"
                @cancel="onCancelLeave"
            />
        </div>
    </Transition>
</template>

