<script setup lang="ts">
import { computed } from 'vue'
import './MessageItem.css'
import type { MockMessage } from '@/mocks/mockMessages'
import { useMockMember } from '@/composables/useMockMember'

const props = defineProps<{
    message: MockMessage
}>()

const emit = defineEmits<{
    (e: 'avatar-click', userId: string): void
    (e: 'image-click', imageUrl: string): void
}>()

const member = useMockMember(computed(() => props.message.userId))
const displayNickname = computed(() => props.message.nickname || member.value?.nickname || '')

const formattedTime = computed(() => {
    const d = new Date(props.message.timestamp)
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    return `${hh}:${mm}`
})

function onAvatarClick() {
    emit('avatar-click', props.message.userId)
}

function onImageClick() {
    if (props.message.imageUrl) {
        emit('image-click', props.message.imageUrl)
    }
}

const avatarStyle = computed(() => ({
    backgroundImage: `url(${props.message.avatarUrl})`,
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
            <img
                v-if="message.imageUrl"
                class="message-item__image"
                :src="message.imageUrl"
                alt=""
                :style="{ maxWidth: '240px', maxHeight: '240px' }"
                @click="onImageClick"
            />
        </div>
    </div>
</template>
