<script setup lang="ts">
import { computed } from 'vue'
import './MessageItem.css'
import type { MessageResponse } from '@/types/message'
import { assetUrl } from '@/utils/assetUrl'
import { buildAvatarRingStyle } from '@/utils/avatarRing'
import { resolveAvatarSrc } from '@/utils/avatarSource'

const props = defineProps<{
    message: MessageResponse
}>()

const emit = defineEmits<{
    (e: 'avatar-click', userId: string): void
    (e: 'image-click', imageUrl: string): void
    (e: 'image-load'): void
}>()

const displayNickname = computed(() => props.message.furName || '')

const formattedTime = computed(() => {
    const d = new Date(props.message.createdDate)
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    return `${hh}:${mm}`
})

function onAvatarClick() {
    emit('avatar-click', props.message.userId)
}

const avatarStyle = computed(() => ({
    backgroundImage: `url(${resolveAvatarSrc(props.message.avatar)})`,
    ...buildAvatarRingStyle(props.message.avatarColor, props.message.avatarBorder, 'sm'),
}))
</script>

<template>
    <div class="message-item">
        <button
            class="message-item__avatar"
            type="button"
            :style="avatarStyle"
            :aria-label="`open ${displayNickname} profile`"
            @click.stop="onAvatarClick"
        ></button>
        <div class="message-item__body">
            <div class="message-item__meta">
                <span class="message-item__nickname">{{ displayNickname }}</span>
                <span class="message-item__timestamp">{{ formattedTime }}</span>
            </div>
            <div v-if="message.content" class="message-item__line">
                <span class="message-item__prompt" aria-hidden="true">&gt;</span>
                <span class="message-item__content">{{ message.content }}</span>
            </div>
            <div
                v-if="message.messageType === 'TEXT' && message.imageUrls.length"
                class="message-item__images"
            >
                <div
                    v-for="imageUrl in message.imageUrls"
                    :key="imageUrl"
                    class="message-item__image-frame"
                    @click="emit('image-click', imageUrl)"
                >
                    <img
                        class="message-item__image"
                        :src="assetUrl(imageUrl)"
                        alt=""
                        @load="emit('image-load')"
                    />
                </div>
            </div>
            <img
                v-if="message.messageType === 'STICKER' && message.stickerImageUrl"
                class="message-item__sticker"
                :src="assetUrl(message.stickerImageUrl)"
                alt=""
                role="button"
                tabindex="0"
                @click="emit('image-click', message.stickerImageUrl)"
                @keydown.enter.space.prevent="emit('image-click', message.stickerImageUrl)"
                @load="emit('image-load')"
            />
        </div>
    </div>
</template>
