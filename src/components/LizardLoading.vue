<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import lizardchiPng from '@/assets/lizardchi.png'

const props = withDefaults(defineProps<{
    /** 載入文字（顯示在蜥蜴下方） */
    message: string
    /** 卡片標題 */
    brand?: string
    /** 設定後，畫面停留超過這個毫秒數會出現「重新整理」按鈕；不設定則永遠不出現 */
    refreshAfterMs?: number
}>(), {
    brand: 'SEF·CLI',
    refreshAfterMs: undefined,
})

const lizardRef = ref<HTMLImageElement | null>(null)
const flipTimeoutRef = ref<ReturnType<typeof setTimeout> | null>(null)
const refreshTimeoutRef = ref<ReturnType<typeof setTimeout> | null>(null)
const showRefresh = ref(false)

// 蜥蜴定時跳動，間或來一次後空翻（沿用 GoogleCallback 既有節奏）
function scheduleFlip() {
    const delay = 2600 + Math.random() * 2600
    flipTimeoutRef.value = setTimeout(() => {
        const el = lizardRef.value
        if (!el) return
        el.classList.add('is-backflipping')
        flipTimeoutRef.value = setTimeout(() => {
            el.classList.remove('is-backflipping')
            scheduleFlip()
        }, 870)
    }, delay)
}

// 取巧：導回 /（而非 reload，避免保留奇怪的 query/state）。
// 全站 VITE_BASE_URL=/，故 '/' 即 app 根。整頁導向會觸發新的 checkAuth + router guard：
// 已登入 → 被導去 /chat；未登入 → 正常進登入畫面。
function goHome() {
    window.location.href = '/'
}

onMounted(() => {
    scheduleFlip()
    if (props.refreshAfterMs !== undefined) {
        refreshTimeoutRef.value = setTimeout(() => {
            showRefresh.value = true
        }, props.refreshAfterMs)
    }
})

onBeforeUnmount(() => {
    if (flipTimeoutRef.value !== null) {
        clearTimeout(flipTimeoutRef.value)
        flipTimeoutRef.value = null
    }
    if (refreshTimeoutRef.value !== null) {
        clearTimeout(refreshTimeoutRef.value)
        refreshTimeoutRef.value = null
    }
})
</script>

<template>
    <div class="lz-stage">
        <div class="lz-card">
            <p class="lz-brand">{{ brand }}</p>
            <div class="lz-arena">
                <img
                    ref="lizardRef"
                    class="lz-lizard"
                    :src="lizardchiPng"
                    alt="lizardchi"
                />
            </div>
            <div class="lz-shadow"></div>
            <p class="lz-text">{{ message }}<span class="lz-dots"></span></p>
            <button
                v-if="showRefresh"
                type="button"
                class="lz-refresh"
                data-test="lizard-refresh"
                @click="goHome"
            >重新整理</button>
        </div>
    </div>
</template>

<style scoped>
.lz-stage {
    position: relative;
    background:
        repeating-linear-gradient(to right, #dfd6be 0 1px, transparent 1px 26px),
        repeating-linear-gradient(to bottom, #dfd6be 0 1px, transparent 1px 26px),
        repeating-linear-gradient(to right, #d6cdb2 0 1.5px, transparent 1.5px 130px),
        repeating-linear-gradient(to bottom, #d6cdb2 0 1.5px, transparent 1.5px 130px),
        #ebe3ce;
    width: 100vw;
    min-height: 100dvh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px 0;
}

.lz-card {
    background: #f9f5e5;
    border: 1px solid #d7d0b8;
    border-radius: 18px;
    box-shadow: 0 14px 30px rgba(98, 89, 69, 0.18);
    padding: 40px 56px 34px;
    text-align: center;
    width: 340px;
}

.lz-brand {
    font-family: 'PingFang TC', 'Noto Sans TC', sans-serif;
    font-weight: 800;
    letter-spacing: 0.1em;
    color: #4a4433;
    font-size: 1.45rem;
    margin: 0 0 30px;
}

.lz-arena {
    height: 170px;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    transform: scale(1.3);
    transform-origin: center bottom;
}

.lz-lizard {
    width: 132px;
    height: auto;
    display: block;
    image-rendering: pixelated;
    transform-origin: 50% 70%;
    animation: lz-hop 0.6s infinite alternate;
}

.lz-lizard.is-backflipping {
    animation: lz-backflip 0.85s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes lz-hop {
    from { transform: translateY(0); }
    to   { transform: translateY(-8px); }
}

@keyframes lz-backflip {
    0%   { transform: translateY(0)     rotate(0deg); }
    25%  { transform: translateY(-72px) rotate(-90deg); }
    55%  { transform: translateY(-72px) rotate(-240deg); }
    85%  { transform: translateY(-12px) rotate(-340deg); }
    100% { transform: translateY(0)     rotate(-360deg); }
}

.lz-shadow {
    width: 96px;
    height: 12px;
    margin: 6px auto 0;
    background: radial-gradient(ellipse at center, rgba(98, 89, 69, 0.28), transparent 70%);
    border-radius: 50%;
    animation: lz-shadow 0.6s infinite alternate;
}

@keyframes lz-shadow {
    from { transform: scaleX(1); opacity: 0.8; }
    to   { transform: scaleX(0.82); opacity: 0.5; }
}

.lz-text {
    margin: 26px 0 0;
    font-family: 'PingFang TC', 'Noto Sans TC', sans-serif;
    color: #8c8672;
    font-size: 0.95rem;
    font-weight: 600;
}

.lz-dots::after {
    content: '';
    animation: lz-dots 1.4s steps(4, end) infinite;
}

@keyframes lz-dots {
    0%   { content: ''; }
    25%  { content: '·'; }
    50%  { content: '··'; }
    75%  { content: '···'; }
    100% { content: ''; }
}

.lz-refresh {
    margin: 22px auto 0;
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

.lz-refresh:hover {
    background: #e2d8bc;
    border-color: #8c8672;
}
</style>
