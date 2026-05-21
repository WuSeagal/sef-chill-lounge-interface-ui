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

// Auto-grow: reset to 'auto' to remeasure, then set height to the
// natural content height. CSS owns the upper bound (max-height: 50dvh)
// so the textarea grows freely until it would crowd the viewport.
// Overflow toggles to 'auto' ONLY when the CSS cap clamped the height
// (scrollHeight > clientHeight). At every other state the scrollbar
// stays hidden and the textarea is unscrollable — so a single-line
// message can't get a stray scrollbar from subpixel rounding.
function autoResize() {
    const ta = textareaEl.value
    if (!ta) return
    ta.style.height = 'auto'
    const desired = ta.scrollHeight
    if (desired > 0) {
        ta.style.height = desired + 'px'
        // CSS max-height clamps inline height; clientHeight reflects the
        // clamped value while scrollHeight stays at the natural size.
        ta.style.overflowY = ta.scrollHeight > ta.clientHeight ? 'auto' : 'hidden'
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
