<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import './ConfirmDialog.css'

/**
 * 泛用確認對話框：取代原生 window.confirm。teleport 至 body、半透明 scrim + 卡片，
 * role="alertdialog"、Esc / 點背景＝取消、開啟時焦點落在「取消」鈕（安全預設）。
 * 視覺沿用專案既有 token（比照 AvatarCropModal），不自創顏色。
 */
const props = withDefaults(defineProps<{
    open: boolean
    message: string
    /** 選用：在訊息下方以等寬框完整顯示的細節文字（如離站連結的完整 URL），不截斷、可換行。 */
    detail?: string
    confirmText?: string
    cancelText?: string
}>(), {
    detail: '',
    confirmText: '確定',
    cancelText: '取消',
})

const emit = defineEmits<{ (e: 'confirm'): void; (e: 'cancel'): void }>()

const cancelRef = ref<HTMLButtonElement | null>(null)
let lastFocused: HTMLElement | null = null

function onCancel(): void {
    emit('cancel')
}
function onConfirm(): void {
    emit('confirm')
}

function onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
    }
}

watch(
    () => props.open,
    (open) => {
        if (open) {
            lastFocused = (document.activeElement as HTMLElement) ?? null
            window.addEventListener('keydown', onKeydown)
            void nextTick(() => cancelRef.value?.focus())
        } else {
            window.removeEventListener('keydown', onKeydown)
            const el = lastFocused
            lastFocused = null
            if (el && el !== document.body && typeof el.focus === 'function') el.focus()
        }
    },
    { immediate: true },
)

onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
    <Teleport to="body">
        <div
            v-if="open"
            class="confirm-dialog"
            @click.self="onCancel"
        >
            <div
                class="confirm-dialog__card"
                role="alertdialog"
                aria-modal="true"
                @click.stop
            >
                <p class="confirm-dialog__message">{{ message }}</p>
                <p v-if="detail" class="confirm-dialog__detail">{{ detail }}</p>
                <div class="confirm-dialog__actions">
                    <button
                        ref="cancelRef"
                        type="button"
                        class="confirm-dialog__btn confirm-dialog__cancel"
                        @click="onCancel"
                    >{{ cancelText }}</button>
                    <button
                        type="button"
                        class="confirm-dialog__btn confirm-dialog__confirm"
                        @click="onConfirm"
                    >{{ confirmText }}</button>
                </div>
            </div>
        </div>
    </Teleport>
</template>
