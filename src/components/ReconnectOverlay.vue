<script setup lang="ts">
import lizardchiPng from '@/assets/lizardchi.png'

// 純展示元件：狀態由父層（ChatView）餵入，不直接讀 composable，方便單測。
// 視覺沿用 LizardLoading 的蜥蜴卡片（牛皮紙卡 + 像素蜥蜴 + 跳動/dots 動畫），
// 但失敗態需自己的「重新整理」行為（location.reload，非 LizardLoading 內建的 goHome）。
defineProps<{
    reconnecting: boolean
    failed: boolean
}>()

function onRefresh() {
    window.location.reload()
}
</script>

<template>
    <div
        v-if="reconnecting || failed"
        :key="failed ? 'failed' : 'reconnecting'"
        class="reconnect-overlay"
        data-test="reconnect-overlay"
        :role="failed ? 'alertdialog' : 'status'"
        :aria-live="failed ? undefined : 'polite'"
        aria-label="連線狀態"
    >
        <div class="reconnect-overlay__card">
            <!-- 失敗態優先（載重邏輯，非保險）：重連達上限後，useChatWebSocket 的
                 scheduleReconnect 會設 wsFailed=true 但不重置前次設的 wsReconnecting，
                 故失敗終態實際是 reconnecting 與 failed「同時為真」，必須先判斷 failed。
                 根節點以 :key 區分兩態，使 reconnecting→failed 重新掛載、alertdialog 被報讀。 -->
            <template v-if="failed">
                <img
                    class="reconnect-overlay__lizard reconnect-overlay__lizard--dead"
                    :src="lizardchiPng"
                    alt="lizardchi"
                />
                <p class="reconnect-overlay__text">連線已中斷</p>
                <button
                    type="button"
                    class="reconnect-overlay__refresh"
                    data-test="reconnect-overlay-refresh"
                    @click="onRefresh"
                >
                    重新整理
                </button>
            </template>
            <template v-else>
                <img class="reconnect-overlay__lizard" :src="lizardchiPng" alt="lizardchi" />
                <div class="reconnect-overlay__shadow"></div>
                <p class="reconnect-overlay__text">
                    重新連線中<span class="reconnect-overlay__dots"></span>
                </p>
            </template>
        </div>
    </div>
</template>

<style scoped>
/* 比照 KickedModal 的全螢幕阻斷遮罩：position:fixed 覆蓋整個 viewport（不受
   chat-view 內定位祖先影響）。z-index 高於所有既有 modal/dialog
   （ConfirmDialog/TagEditorModal=1100、AvatarCropModal=1200、其餘=1000），
   因為「連線已死、完全不能用」是最高優先的狀態，斷線時不論開著什麼都該蓋過。 */
.reconnect-overlay {
    position: fixed;
    inset: 0;
    z-index: 1300;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(74, 68, 51, 0.45);
}

@media (prefers-reduced-motion: no-preference) {
    .reconnect-overlay {
        animation: reconnect-fade-in 0.2s ease-out both;
    }
}

@keyframes reconnect-fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
}

.reconnect-overlay__card {
    background: #f9f5e5;
    border: 1px solid #d7d0b8;
    border-radius: 18px;
    box-shadow: 0 14px 30px rgba(98, 89, 69, 0.28);
    padding: 30px 40px 26px;
    text-align: center;
    width: 250px;
}

.reconnect-overlay__lizard {
    width: 84px;
    height: auto;
    display: block;
    margin: 0 auto;
    image-rendering: pixelated;
    transform-origin: 50% 70%;
}

@media (prefers-reduced-motion: no-preference) {
    .reconnect-overlay__lizard:not(.reconnect-overlay__lizard--dead) {
        animation: reconnect-hop 0.6s infinite alternate;
    }
}

@keyframes reconnect-hop {
    from { transform: translateY(0); }
    to { transform: translateY(-7px); }
}

.reconnect-overlay__lizard--dead {
    opacity: 0.5;
    filter: grayscale(0.6);
}

.reconnect-overlay__shadow {
    width: 62px;
    height: 9px;
    margin: 5px auto 0;
    background: radial-gradient(ellipse at center, rgba(98, 89, 69, 0.28), transparent 70%);
    border-radius: 50%;
}

@media (prefers-reduced-motion: no-preference) {
    .reconnect-overlay__shadow {
        animation: reconnect-shadow 0.6s infinite alternate;
    }
}

@keyframes reconnect-shadow {
    from { transform: scaleX(1); opacity: 0.8; }
    to { transform: scaleX(0.82); opacity: 0.5; }
}

.reconnect-overlay__text {
    margin: 16px 0 0;
    font-family: 'PingFang TC', 'Noto Sans TC', sans-serif;
    color: #8c8672;
    font-size: 0.95rem;
    font-weight: 600;
}

.reconnect-overlay__dots::after {
    content: '';
}

@media (prefers-reduced-motion: no-preference) {
    .reconnect-overlay__dots::after {
        animation: reconnect-dots 1.4s steps(4, end) infinite;
    }
}

@keyframes reconnect-dots {
    0% { content: ''; }
    25% { content: '·'; }
    50% { content: '··'; }
    75% { content: '···'; }
    100% { content: ''; }
}

.reconnect-overlay__refresh {
    margin: 18px auto 0;
    padding: 9px 22px;
    font-family: 'PingFang TC', 'Noto Sans TC', sans-serif;
    font-size: 0.92rem;
    font-weight: 700;
    color: #4a4433;
    background: #ebe3ce;
    border: 1px solid #d7cdaf;
    border-radius: 10px;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease;
}

.reconnect-overlay__refresh:hover {
    background: #e2d8bc;
    border-color: #8c8672;
}
</style>
