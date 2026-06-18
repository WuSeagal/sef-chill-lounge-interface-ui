<script setup lang="ts">
import { computed } from 'vue'
import { resolveAvatarSrc } from '@/utils/avatarSource'
import type { TypingUser } from '@/composables/useTypingIndicator'

// 純展示元件：顯示正在打字的他人（頭像 + 三點氣泡），不顯示「名字＋輸入中」文字。
const AVATAR_CAP = 3

const props = defineProps<{
    typers: TypingUser[]
}>()

const shown = computed(() => props.typers.slice(0, AVATAR_CAP))
const overflow = computed(() => Math.max(0, props.typers.length - AVATAR_CAP))
const ariaLabel = computed(() => {
    const names = props.typers.map((t) => t.furName).filter((n): n is string => !!n)
    if (names.length === 0) return '有人正在輸入'
    return `${names.join('、')} 正在輸入`
})
</script>

<template>
    <div
        v-if="typers.length > 0"
        class="typing-indicator"
        data-test="typing-indicator"
        role="status"
        aria-live="polite"
        :aria-label="ariaLabel"
    >
        <div class="typing-indicator__avatars">
            <img
                v-for="t in shown"
                :key="t.userId"
                class="typing-indicator__avatar"
                :src="resolveAvatarSrc(t.avatar)"
                alt=""
                :style="t.avatarColor ? { borderColor: t.avatarColor } : undefined"
            />
            <span v-if="overflow > 0" class="typing-indicator__more">+{{ overflow }}</span>
        </div>
        <span class="typing-indicator__bubble" aria-hidden="true">
            <i></i><i></i><i></i>
        </span>
    </div>
</template>

<style scoped>
.typing-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 16px;
    min-height: 40px;
    border-top: 1px dashed var(--bubble-border, #d7d0b8);
    background: rgba(255, 255, 255, 0.4);
}

.typing-indicator__avatars {
    display: flex;
    align-items: center;
}

.typing-indicator__avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid #f1ece0;
    margin-left: -9px;
    background: var(--avatar-default-bg, #8c8672);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}

.typing-indicator__avatar:first-child {
    margin-left: 0;
}

.typing-indicator__more {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    margin-left: -9px;
    border-radius: 50%;
    border: 2px solid #f1ece0;
    background: #cfc6ab;
    color: #5b5340;
    font-size: 0.72rem;
    font-weight: 700;
}

.typing-indicator__bubble {
    display: inline-flex;
    gap: 4px;
    align-items: center;
    background: var(--surface-raised, #fff);
    border: 1px solid var(--bubble-border, #d7d0b8);
    border-radius: 14px;
    padding: 8px 11px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.typing-indicator__bubble i {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #b3a98c;
    display: inline-block;
}

@media (prefers-reduced-motion: no-preference) {
    .typing-indicator__bubble i {
        animation: typing-blink 1.3s infinite both;
    }
    .typing-indicator__bubble i:nth-child(2) {
        animation-delay: 0.18s;
    }
    .typing-indicator__bubble i:nth-child(3) {
        animation-delay: 0.36s;
    }
}

@keyframes typing-blink {
    0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
    30% { opacity: 1; transform: translateY(-2px); }
}
</style>
