<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import './BottomBar.css'
import EmojiPicker from './EmojiPicker.vue'
import StickerPicker from './StickerPicker.vue'
import type { Sticker } from '@/types/user'
// SVGs use stroke="currentColor" / fill="currentColor" so we inline
// them via Vite's ?raw import and v-html. <img> would treat the SVG
// as opaque image data and lose color inheritance.
import iconSettingsRaw from '@/assets/icons/icon-settings.svg?raw'
import iconAttachRaw from '@/assets/icons/icon-attach.svg?raw'
import iconEmojiRaw from '@/assets/icons/icon-emoji.svg?raw'
import iconStickerRaw from '@/assets/icons/icon-sticker.svg?raw'
import iconSendRaw from '@/assets/icons/icon-send.svg?raw'
import iconCloseRaw from '@/assets/icons/icon-close.svg?raw'

const props = withDefaults(defineProps<{
    inputValue: string
    attachDisabled?: boolean
    autofillerOpen?: boolean
    autofillerHandleKeydown?: (event: KeyboardEvent) => boolean
    stickers?: Sticker[]
    rateLimited?: boolean
    rateLimitRemaining?: number
    replyPreview?: { furName: string; snippet: string } | null
}>(), {
    attachDisabled: false,
    autofillerOpen: false,
    autofillerHandleKeydown: undefined,
    stickers: () => [],
    rateLimited: false,
    rateLimitRemaining: 0,
    replyPreview: null,
})

// During a server-imposed rate-limit window the composer is locked and the
// placeholder counts down the remaining seconds; the gear (settings) button
// stays usable so the user is never trapped.
const inputPlaceholder = computed(() =>
    props.rateLimited
        ? `訊息發送太快了，請${props.rateLimitRemaining}秒後再發送！`
        : '輸入訊息…'
)

const emit = defineEmits<{
    (e: 'update:inputValue', v: string): void
    (e: 'gear-click'): void
    (e: 'attach-click'): void
    (e: 'emoji-click'): void
    (e: 'sticker-click'): void
    (e: 'sticker-select', url: string): void
    (e: 'send', v: string): void
    (e: 'image-paste', files: File[]): void
    (e: 'caret-change', pos: number): void
    (e: 'reply-cancel'): void
}>()

function onPaste(event: ClipboardEvent) {
    const items = event.clipboardData?.items
    if (!items) return
    const imageFiles: File[] = []
    for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.kind === 'file' && item.type.startsWith('image/')) {
            const file = item.getAsFile()
            if (file) imageFiles.push(file)
        }
    }
    if (imageFiles.length > 0) {
        event.preventDefault() // 阻止 image-as-text 之類的 fallback
        emit('image-paste', imageFiles)
    }
}

const emojiPickerOpen = ref(false)
const stickerPickerOpen = ref(false)
const textareaEl = ref<HTMLTextAreaElement | null>(null)
let composing = false

// Auto-grow: reset to 'auto' to remeasure, then set height to the
// natural content height. CSS owns the upper bound (max-height: 50dvh)
// so the textarea grows freely until it would crowd the viewport.
//
// Overflow decision: compare natural content height to the CSS cap.
// We avoid the older `scrollHeight > clientHeight` check because at
// single-line state subpixel rounding made scrollHeight 1px larger
// than clientHeight, flashing a stray scrollbar even though the content
// actually fit. Comparing against the explicit CSS cap is round-off
// safe — overflow only switches on when the user really hit the limit.
function autoResize() {
    const ta = textareaEl.value
    if (!ta) return
    ta.style.height = 'auto'
    const desired = ta.scrollHeight
    if (desired <= 0) return

    const cssMax = parseFloat(getComputedStyle(ta).maxHeight)
    if (Number.isFinite(cssMax) && desired > cssMax) {
        ta.style.height = cssMax + 'px'
        ta.style.overflowY = 'auto'
    } else {
        ta.style.height = desired + 'px'
        ta.style.overflowY = 'hidden'
    }
}

// 把 textarea 當下 caret（selectionStart）回報給父層，供 @mention autofiller 做 caret-aware 觸發。
function emitCaret(event: Event) {
    const target = event.target as HTMLTextAreaElement
    emit('caret-change', target.selectionStart ?? 0)
}

function onInput(event: Event) {
    const target = event.target as HTMLTextAreaElement
    emit('update:inputValue', target.value)
    emitCaret(event)
    autoResize()
}

function onSend() {
    emit('send', props.inputValue)
}

function onCompositionStart() {
    composing = true
}

function onCompositionEnd() {
    composing = false
}

// Enter (no shift) submits and prevents the default newline. Shift+Enter
// falls through with the browser's default behaviour, which inserts \n.
function onKeydown(event: KeyboardEvent) {
    const isImeEnter = event.key === 'Enter'
        && (composing || event.isComposing || event.keyCode === 229)
    if (isImeEnter || (event.key === 'Enter' && event.repeat)) return

    if (props.autofillerOpen && props.autofillerHandleKeydown?.(event)) {
        return
    }
    const isTouchDevice = typeof window.matchMedia === 'function'
        ? window.matchMedia('(pointer: coarse)').matches
        : false
    if (event.key === 'Enter' && !event.shiftKey && !isTouchDevice) {
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
    stickerPickerOpen.value = false
    emojiPickerOpen.value = !emojiPickerOpen.value
    emit('emoji-click')
}

function onEmojiSelect(emoji: string) {
    emit('update:inputValue', props.inputValue + emoji)
}

function onEmojiPickerClose() {
    emojiPickerOpen.value = false
}

// 選檔完成後讓父層把 focus 移回輸入框，Enter 才能直接送出
// （而不是停在 + 按鈕上再次打開選檔視窗）。
function focusInput() {
    textareaEl.value?.focus()
}

// mention 插入後讓父層把游標還原到插入文字之後（與 focusInput 同一暴露介面）。
function setCaret(pos: number) {
    const ta = textareaEl.value
    if (!ta) return
    ta.focus()
    ta.setSelectionRange(pos, pos)
}

defineExpose({ focusInput, setCaret })

// @click.stop on the sticker button prevents the click from bubbling to
// StickerPicker's window-level outside-click listener (same pattern as emoji).
function onStickerButtonClick() {
    emojiPickerOpen.value = false
    stickerPickerOpen.value = !stickerPickerOpen.value
    emit('sticker-click')
}

function onStickerSelect(url: string) {
    emit('sticker-select', url)
    stickerPickerOpen.value = false
}
</script>

<template>
    <div class="bottom-bar">
        <div v-if="replyPreview" class="bottom-bar__reply-preview">
            <div class="bottom-bar__reply-preview-accent"></div>
            <div class="bottom-bar__reply-preview-text">
                <span class="bottom-bar__reply-preview-label">回覆給 </span>
                <span class="bottom-bar__reply-preview-author">{{ replyPreview.furName }}：</span>
                <span class="bottom-bar__reply-preview-snippet">{{ replyPreview.snippet }}</span>
            </div>
            <button
                class="bottom-bar__reply-preview-cancel"
                type="button"
                aria-label="取消回覆"
                @click="emit('reply-cancel')"
            ><span v-html="iconCloseRaw" aria-hidden="true"></span></button>
        </div>
        <div class="bottom-bar__row">
            <button class="bottom-bar__btn" data-btn="gear" type="button" aria-label="設定" @click="emit('gear-click')">
                <span class="bottom-bar__icon" v-html="iconSettingsRaw" aria-hidden="true"></span>
            </button>
            <button
                class="bottom-bar__btn"
                data-btn="attach"
                type="button"
                aria-label="附加圖片"
                :disabled="attachDisabled || rateLimited"
                :title="attachDisabled ? '已達 5 張上限' : ''"
                @click="emit('attach-click')"
            >
                <span class="bottom-bar__icon" v-html="iconAttachRaw" aria-hidden="true"></span>
            </button>
            <textarea
                ref="textareaEl"
                class="bottom-bar__input"
                rows="1"
                :value="inputValue"
                :placeholder="inputPlaceholder"
                :disabled="rateLimited"
                @input="onInput"
                @compositionstart="onCompositionStart"
                @compositionend="onCompositionEnd"
                @keydown="onKeydown"
                @keyup="emitCaret"
                @click="emitCaret"
                @paste="onPaste"
            ></textarea>
            <button
                class="bottom-bar__btn"
                data-btn="emoji"
                type="button"
                aria-label="表情符號"
                :disabled="rateLimited"
                @click.stop="onEmojiButtonClick"
            >
                <span class="bottom-bar__icon" v-html="iconEmojiRaw" aria-hidden="true"></span>
            </button>
            <button
                class="bottom-bar__btn"
                data-btn="sticker"
                type="button"
                aria-label="貼圖"
                :disabled="rateLimited"
                @click.stop="onStickerButtonClick"
            >
                <span class="bottom-bar__icon" v-html="iconStickerRaw" aria-hidden="true"></span>
            </button>
            <button
                class="bottom-bar__btn"
                data-btn="send"
                type="button"
                aria-label="送出"
                :disabled="rateLimited"
                @click="onSend"
            >
                <span class="bottom-bar__icon" v-html="iconSendRaw" aria-hidden="true"></span>
            </button>
        </div>

        <EmojiPicker
            :open="emojiPickerOpen"
            @select="onEmojiSelect"
            @close="onEmojiPickerClose"
        />
        <StickerPicker
            :open="stickerPickerOpen"
            :stickers="stickers"
            @select="onStickerSelect"
            @close="stickerPickerOpen = false"
        />
        <slot name="popup" />
    </div>
</template>
