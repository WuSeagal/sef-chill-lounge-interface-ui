<script setup lang="ts">
import './BottomBar.css'
// SVGs use stroke="currentColor" / fill="currentColor" so we inline
// them via Vite's ?raw import and v-html. <img> would treat the SVG
// as opaque image data and lose color inheritance.
import iconSettingsRaw from '@/assets/icons/icon-settings.svg?raw'
import iconAttachRaw from '@/assets/icons/icon-attach.svg?raw'
import iconEmojiRaw from '@/assets/icons/icon-emoji.svg?raw'
import iconStickerRaw from '@/assets/icons/icon-sticker.svg?raw'
import iconSendRaw from '@/assets/icons/icon-send.svg?raw'

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

function onInputKeyup(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
        onSend()
    }
}
</script>

<template>
    <div class="bottom-bar">
        <button class="bottom-bar__btn" data-btn="gear" type="button" @click="emit('gear-click')">
            <span class="bottom-bar__icon" v-html="iconSettingsRaw"></span>
        </button>
        <button class="bottom-bar__btn" data-btn="attach" type="button" @click="emit('attach-click')">
            <span class="bottom-bar__icon" v-html="iconAttachRaw"></span>
        </button>
        <input
            class="bottom-bar__input"
            type="text"
            :value="inputValue"
            placeholder="輸入訊息…"
            @input="onInput"
            @keyup="onInputKeyup"
        />
        <button class="bottom-bar__btn" data-btn="emoji" type="button" @click="emit('emoji-click')">
            <span class="bottom-bar__icon" v-html="iconEmojiRaw"></span>
        </button>
        <button class="bottom-bar__btn" data-btn="sticker" type="button" @click="emit('sticker-click')">
            <span class="bottom-bar__icon" v-html="iconStickerRaw"></span>
        </button>
        <button class="bottom-bar__btn" data-btn="send" type="button" @click="onSend">
            <span class="bottom-bar__icon" v-html="iconSendRaw"></span>
        </button>
    </div>
</template>
