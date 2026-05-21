<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import './BottomBar.css'
import EmojiPicker from './EmojiPicker.vue'
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

const emojiPickerOpen = ref(false)
const textareaEl = ref<HTMLTextAreaElement | null>(null)
const TEXTAREA_MAX_HEIGHT = 120

// Discord-style auto-grow: collapse to natural height, then expand to
// content height up to TEXTAREA_MAX_HEIGHT. Beyond that an internal
// scrollbar appears.
function autoResize() {
    const ta = textareaEl.value
    if (!ta) return
    ta.style.height = 'auto'
    if (ta.scrollHeight > 0) {
        ta.style.height = Math.min(ta.scrollHeight, TEXTAREA_MAX_HEIGHT) + 'px'
    }
}

function onInput(event: Event) {
    const target = event.target as HTMLTextAreaElement
    emit('update:inputValue', target.value)
    autoResize()
}

function onSend() {
    emit('send', props.inputValue)
}

// Enter (no shift) submits and prevents the default newline. Shift+Enter
// falls through with the browser's default behaviour, which inserts \n.
function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        onSend()
    }
}

// React to parent-driven inputValue changes (post-send clear, emoji
// append, etc.) so the textarea resizes without the user typing.
watch(
    () => props.inputValue,
    () => {
        nextTick(autoResize)
    }
)

onMounted(autoResize)

// @click.stop on the emoji button prevents the click from bubbling to
// the EmojiPicker's window-level outside-click listener, which would
// otherwise close the picker right after this handler opens it.
function onEmojiButtonClick() {
    emojiPickerOpen.value = !emojiPickerOpen.value
    emit('emoji-click')
}

function onEmojiSelect(emoji: string) {
    emit('update:inputValue', props.inputValue + emoji)
}

function onEmojiPickerClose() {
    emojiPickerOpen.value = false
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
        <textarea
            ref="textareaEl"
            class="bottom-bar__input"
            rows="1"
            :value="inputValue"
            placeholder="輸入訊息…"
            @input="onInput"
            @keydown="onKeydown"
        ></textarea>
        <button
            class="bottom-bar__btn"
            data-btn="emoji"
            type="button"
            @click.stop="onEmojiButtonClick"
        >
            <span class="bottom-bar__icon" v-html="iconEmojiRaw"></span>
        </button>
        <button class="bottom-bar__btn" data-btn="sticker" type="button" @click="emit('sticker-click')">
            <span class="bottom-bar__icon" v-html="iconStickerRaw"></span>
        </button>
        <button class="bottom-bar__btn" data-btn="send" type="button" @click="onSend">
            <span class="bottom-bar__icon" v-html="iconSendRaw"></span>
        </button>

        <EmojiPicker
            :open="emojiPickerOpen"
            @select="onEmojiSelect"
            @close="onEmojiPickerClose"
        />
    </div>
</template>
