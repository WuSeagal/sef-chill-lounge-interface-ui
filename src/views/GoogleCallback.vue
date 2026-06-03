<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import lizardchiPng from '@/assets/lizardchi.png'

const router = useRouter()

const lizardRef = ref<HTMLImageElement | null>(null)
const flipTimeoutRef = ref<ReturnType<typeof setTimeout> | null>(null)

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

onMounted(async () => {
    scheduleFlip()

    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')

    if (!code) {
        router.replace('/')
        return
    }

    try {
        const res = await fetch(import.meta.env.VITE_ENDPOINT + '/user/googleAuth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ code })
        })

        if (res.ok) {
            router.replace('/chat')
        } else {
            console.error('googleAuth failed, status:', res.status)
            router.replace('/')
        }
    } catch (e) {
        console.error('googleAuth error:', e)
        router.replace('/')
    }
})

onBeforeUnmount(() => {
    if (flipTimeoutRef.value !== null) {
        clearTimeout(flipTimeoutRef.value)
        flipTimeoutRef.value = null
    }
})
</script>

<template>
    <div class="lz-stage">
        <div class="lz-card">
            <p class="lz-brand">SEF·CLI</p>
            <div class="lz-arena">
                <img
                    ref="lizardRef"
                    class="lz-lizard"
                    :src="lizardchiPng"
                    alt="lizardchi"
                />
            </div>
            <div class="lz-shadow"></div>
            <p class="lz-text">正在替你找位子<span class="lz-dots"></span></p>
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
</style>
