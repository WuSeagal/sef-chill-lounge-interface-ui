<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import './UserPopup.css'
import type { MockUser } from '@/mocks/mockUser'

const props = defineProps<{
    open: boolean
    member: MockUser | null
}>()

const emit = defineEmits<{
    (e: 'close'): void
}>()

const rootEl = ref<HTMLElement | null>(null)
const visible = computed(() => props.open && props.member !== null)

function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && visible.value) {
        emit('close')
    }
}

// Uses 'click' (NOT 'mousedown') so that the avatar's @click.stop in
// MessageItem can prevent its click from bubbling here. Otherwise the
// avatar's mousedown would close the popup, then its click would reopen
// it, breaking the same-avatar toggle behavior.
function onOutsideClick(event: MouseEvent) {
    if (!visible.value) return
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
</script>

<template>
    <div v-if="visible" ref="rootEl" class="user-popup" @click="onSelfClick">
        <h3 class="user-popup__nickname">{{ member!.nickname }}</h3>
        <ul v-if="member!.tags.length > 0" class="user-popup__tags">
            <li v-for="tag in member!.tags" :key="tag" class="user-popup__tag">{{ tag }}</li>
        </ul>
        <ul v-if="member!.socialLinks.length > 0" class="user-popup__socials">
            <li v-for="link in member!.socialLinks" :key="link.url">
                <a
                    class="user-popup__social-link"
                    :href="link.url"
                    target="_blank"
                    rel="noopener noreferrer"
                >{{ link.platform }} →</a>
            </li>
        </ul>
    </div>
</template>
