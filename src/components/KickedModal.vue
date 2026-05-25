<script setup lang="ts">
import './KickedModal.css'

defineProps<{
    open: boolean
}>()

const emit = defineEmits<{
    reconnect: []
}>()

function onReconnect() {
    emit('reconnect')
}
</script>

<template>
    <div
        v-if="open"
        class="kicked-modal-backdrop"
        data-test="kicked-modal-backdrop"
        role="dialog"
        aria-modal="true"
        aria-labelledby="kicked-modal-title"
    >
        <div class="kicked-modal" @click.stop>
            <h2 id="kicked-modal-title" class="kicked-modal__title">你已在其他裝置登入</h2>
            <p class="kicked-modal__body">這個連線已被新登入的裝置取代。</p>
            <button
                type="button"
                class="kicked-modal__button"
                data-test="kicked-modal-reconnect"
                @click="onReconnect"
            >
                重新連線
            </button>
        </div>
    </div>
</template>
