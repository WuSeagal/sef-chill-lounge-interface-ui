<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import './EmojiPicker.css'
import { EMOJI_CATEGORIES } from './emojiCategories'

const props = defineProps<{
    open: boolean
}>()

const emit = defineEmits<{
    (e: 'select', emoji: string): void
    (e: 'close'): void
}>()

const rootEl = ref<HTMLElement | null>(null)
const activeId = ref<string>(EMOJI_CATEGORIES[0]?.id ?? '')

const activeCategory = computed(() =>
    EMOJI_CATEGORIES.find((c) => c.id === activeId.value) ?? EMOJI_CATEGORIES[0]
)

function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && props.open) {
        emit('close')
    }
}

// Same outside-click pattern as UserPopup: listen on 'click' (not
// mousedown) so the BottomBar emoji button can use @click.stop to
// prevent toggle races.
function onOutsideClick(event: MouseEvent) {
    if (!props.open) return
    const target = event.target as Node | null
    if (target && rootEl.value && rootEl.value.contains(target)) {
        return
    }
    emit('close')
}

function onSelfClick(event: MouseEvent) {
    event.stopPropagation()
}

watch(
    () => props.open,
    (open) => {
        if (open) {
            window.addEventListener('keydown', onKeydown)
            window.addEventListener('click', onOutsideClick)
        } else {
            window.removeEventListener('keydown', onKeydown)
            window.removeEventListener('click', onOutsideClick)
        }
    },
    { immediate: true }
)

onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKeydown)
    window.removeEventListener('click', onOutsideClick)
})

function onTabClick(id: string) {
    activeId.value = id
}

function onEmojiClick(emoji: string) {
    emit('select', emoji)
}
</script>

<template>
    <div v-if="open" ref="rootEl" class="emoji-picker" @click="onSelfClick">
        <div class="emoji-picker__tabs" role="tablist">
            <button
                v-for="cat in EMOJI_CATEGORIES"
                :key="cat.id"
                class="emoji-picker__tab"
                :class="{ 'emoji-picker__tab--active': cat.id === activeId }"
                type="button"
                role="tab"
                :title="cat.label"
                :aria-selected="cat.id === activeId"
                @click="onTabClick(cat.id)"
            >{{ cat.icon }}</button>
        </div>
        <div class="emoji-picker__content">
            <div class="emoji-picker__title">{{ activeCategory?.label }}</div>
            <div class="emoji-picker__grid">
                <button
                    v-for="emoji in activeCategory?.emojis ?? []"
                    :key="emoji"
                    class="emoji-picker__item"
                    type="button"
                    @click="onEmojiClick(emoji)"
                >{{ emoji }}</button>
            </div>
        </div>
    </div>
</template>
