<script setup lang="ts">
import './KickedModal.css'
import LizardCard from './LizardCard.vue'

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
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="kicked-modal-title"
    >
        <LizardCard @click.stop>
            <template #title>
                <span id="kicked-modal-title">你已在其他裝置登入</span>
            </template>
            <template #body>這個連線已被新登入的裝置取代。</template>
            <template #actions>
                <button
                    type="button"
                    class="lizard-card__btn"
                    data-test="kicked-modal-reconnect"
                    @click="onReconnect"
                >
                    重新連線
                </button>
            </template>
        </LizardCard>
    </div>
</template>
