<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import './DashboardView.css'
import '@/assets/grid-paper.css'
import FloatingBubble from '@/components/FloatingBubble.vue'
import DashboardOnlineCounter from '@/components/DashboardOnlineCounter.vue'
import PeopleModal from '@/components/PeopleModal.vue'
import UserPopup from '@/components/UserPopup.vue'
import LizardLoading from '@/components/LizardLoading.vue'
import BannedScreen from '@/components/BannedScreen.vue'
import { useDashboardFeed } from '@/composables/useDashboardFeed'
import { useAuthStore } from '@/stores/auth'

const { bubbles, onlineCount, connected, ready, connect, disconnect, startAnimation, cleanup } = useDashboardFeed()

// people-directory：點線上人數計數器開 People 名單；點名單某人開唯讀護照（重用 UserPopup）。
const peopleOpen = ref(false)
const selectedUserId = ref<string | null>(null)
function onSelectPerson(userId: string): void {
    selectedUserId.value = userId
}

// 封禁 gate（design D7）：banned 來自 check-auth（進入/重整即生效）；為真則整頁顯示 BannedScreen
// 取代儀表板內容。WS viewer 連線被後端拒絕為防守縱深第二層。
const authStore = useAuthStore()
const banned = computed(() => authStore.user?.banned ?? false)

const isFullscreen = ref(false)

function onFullscreenChange() {
    isFullscreen.value = !!document.fullscreenElement
}

onMounted(() => {
    connect()
    startAnimation()
    document.addEventListener('fullscreenchange', onFullscreenChange)
})

onBeforeUnmount(() => {
    cleanup()
    disconnect()
    document.removeEventListener('fullscreenchange', onFullscreenChange)
})

function onFullscreenClick() {
    if (isFullscreen.value) {
        document.exitFullscreen()
    } else {
        document.documentElement.requestFullscreen()
    }
}
</script>

<template>
    <BannedScreen v-if="banned" />
    <div v-else class="dashboard-view grid-paper">
        <DashboardOnlineCounter :count="onlineCount" :connected="connected" @click="peopleOpen = true" />

        <div v-if="!ready" class="dashboard-view__loading">
            <LizardLoading variant="inline" message="連線中" />
        </div>

        <FloatingBubble
            v-for="b in bubbles"
            :key="b.id"
            :bubble="b"
        />

        <button
            class="dashboard-view__fullscreen-btn"
            :class="{ 'dashboard-view__fullscreen-btn--hidden': isFullscreen }"
            type="button"
            aria-label="toggle fullscreen"
            @click="onFullscreenClick"
        >
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                    v-if="!isFullscreen"
                    d="M4 4h6M4 4v6M20 4h-6M20 4v6M4 20h6M4 20v-6M20 20h-6M20 20v-6"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                />
                <path
                    v-else
                    d="M10 4v6H4M14 4v6h6M10 20v-6H4M14 20v-6h6"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                />
            </svg>
        </button>

        <PeopleModal :open="peopleOpen" @close="peopleOpen = false" @select="onSelectPerson" />
        <UserPopup :open="selectedUserId !== null" :user-id="selectedUserId" @close="selectedUserId = null" />
    </div>
</template>
