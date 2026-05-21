<script setup lang="ts">
import './BottomBar.css'
import IconSettings from '@/assets/icons/icon-settings.svg'
import IconAttach from '@/assets/icons/icon-attach.svg'
import IconEmoji from '@/assets/icons/icon-emoji.svg'
import IconSticker from '@/assets/icons/icon-sticker.svg'
import IconSend from '@/assets/icons/icon-send.svg'

const props = defineProps<{
    inputValue: string
}>()

const emit = defineEmits<{
    (e: 'update:inputValue', v: string): void
    (e: 'gear-click'): void
    (e: 'attach-click'): void
    (e: 'emoji-click'): void
    (e: 'sticker-click'): void
    (e: 'send', v: string): void
}>()

function onInput(event: Event) {
    const target = event.target as HTMLInputElement
    emit('update:inputValue', target.value)
}

function onSend() {
    emit('send', props.inputValue)
}
</script>

<template>
    <div class="bottom-bar">
        <button class="bottom-bar__btn" data-btn="gear" type="button" @click="emit('gear-click')">
            <img :src="IconSettings" alt="settings" />
        </button>
        <button class="bottom-bar__btn" data-btn="attach" type="button" @click="emit('attach-click')">
            <img :src="IconAttach" alt="attach" />
        </button>
        <input
            class="bottom-bar__input"
            type="text"
            :value="inputValue"
            placeholder="輸入訊息…"
            @input="onInput"
        />
        <button class="bottom-bar__btn" data-btn="emoji" type="button" @click="emit('emoji-click')">
            <img :src="IconEmoji" alt="emoji" />
        </button>
        <button class="bottom-bar__btn" data-btn="sticker" type="button" @click="emit('sticker-click')">
            <img :src="IconSticker" alt="sticker" />
        </button>
        <button class="bottom-bar__btn" data-btn="send" type="button" @click="onSend">
            <img :src="IconSend" alt="send" />
        </button>
    </div>
</template>
