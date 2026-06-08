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
            <p class="topic-card-tab__hint">想要開話題的好點子？ 抽抽看不同的話題卡來找個新話題來聊天吧！</p>
            <div class="topic-card-tab__card">
                <span class="topic-card-tab__content">
                    <template v-if="topicContent"><b>"</b>{{ topicContent }}<b>"</b></template>
                    <template v-else>(未抽取)</template>
                </span>
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
