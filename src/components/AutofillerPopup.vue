<script setup lang="ts">
import './AutofillerPopup.css'
import type { AutofillerOption } from '@/composables/useChatAutofiller'
import { resolveAvatarSrc } from '@/utils/avatarSource'

defineProps<{
    open: boolean
    options: AutofillerOption[]
    focusedIndex: number
}>()
defineEmits<{ (e: 'select', option: AutofillerOption): void }>()

/** 通用 key：tag 用 tagId、mention 用 userId。 */
function optionKey(opt: AutofillerOption): string {
    return opt.kind === 'mention' ? opt.userId : opt.tagId
}
</script>

<template>
    <div v-if="open" class="autofiller-popup" role="listbox" data-test="autofiller-popup">
        <div
            v-for="(opt, idx) in options"
            :key="optionKey(opt)"
            class="autofiller-popup__option"
            :class="{ 'autofiller-popup__option--focus': idx === focusedIndex }"
            role="option"
            :aria-selected="idx === focusedIndex"
            :data-test="`af-option-${optionKey(opt)}`"
            @mousedown.prevent="$emit('select', opt)"
        >
            <template v-if="opt.kind === 'mention'">
                <span
                    class="autofiller-popup__avatar"
                    :style="{ backgroundImage: `url(${resolveAvatarSrc(opt.avatar)})` }"
                ></span>
                <span class="autofiller-popup__mention">@{{ opt.furName }}</span>
            </template>
            <template v-else>
                <span class="autofiller-popup__prefix">{{ opt.prefix }}</span>
                <span class="autofiller-popup__content">{{ opt.content }}</span>
            </template>
        </div>
    </div>
</template>
