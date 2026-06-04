<script setup lang="ts">
import { computed, ref } from 'vue'
import './TopicCardTab.css'
import { useUser } from '@/composables/useUser'

const user = useUser()
const topicContent = computed(() => user.profile.value?.topic?.content ?? '')
const redrawing = ref(false)

async function onRedraw(): Promise<void> {
    if (redrawing.value) return
    redrawing.value = true
    try { await user.redrawTopicCard() } finally { redrawing.value = false }
}
</script>

<template>
    <div class="topic-card-tab" data-test="topic-card-tab">
        <div class="topic-card-tab__stage">
            <h3 class="topic-card-tab__title">話題卡</h3>
            <p class="topic-card-tab__hint">每張話題卡會顯示在 Dashboard 與 ChatView。重抽即時生效</p>
            <div class="topic-card-tab__card">
                <span class="topic-card-tab__content">{{ topicContent || '(未抽取)' }}</span>
            </div>
            <button
                type="button"
                class="topic-card-tab__redraw"
                data-test="redraw-btn"
                :disabled="redrawing"
                @click="onRedraw"
            >{{ redrawing ? '重抽中...' : '重抽' }}</button>
        </div>
    </div>
</template>
