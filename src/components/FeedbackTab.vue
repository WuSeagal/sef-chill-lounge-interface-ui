<script setup lang="ts">
import { ref, computed } from 'vue'
import './FeedbackTab.css'
import { push } from 'notivue'
import { useUser } from '@/composables/useUser'
import { submitFeedback } from '@/api/feedbackApi'

const user = useUser()
const displayName = computed(() => user.profile.value?.furName ?? user.profile.value?.username ?? '')

const subject = ref('')
const body = ref('')

async function onSubmit() {
    if (!subject.value.trim() || !body.value.trim()) {
        push.warning('問題主題與問題描述不能為空')
        return
    }

    const notif = push.promise('傳送中...')
    try {
        await submitFeedback({
            title: subject.value.trim(),
            content: body.value.trim(),
            username: displayName.value,
        })
        notif.resolve('已送出，感謝你的回饋！')
        subject.value = ''
        body.value = ''
    } catch {
        notif.reject('傳送失敗，請稍後再試')
    }
}
</script>

<template>
    <div class="feedback-tab">
        <div class="feedback-tab__form">
            <p class="feedback-tab__hint">不論是使用中有問題需反應，或是想要回饋心得，都歡迎在此回報。</p>
            <div class="feedback-tab__field">
                <label class="feedback-tab__label">回報者</label>
                <input
                    class="feedback-tab__nickname"
                    type="text"
                    :value="displayName"
                    disabled
                />
            </div>
            <div class="feedback-tab__field">
                <label class="feedback-tab__label">問題主題</label>
                <input
                    v-model="subject"
                    class="feedback-tab__subject"
                    type="text"
                    placeholder="問題主要關於什麼？"
                />
            </div>
            <div class="feedback-tab__field">
                <label class="feedback-tab__label">問題描述</label>
                <textarea
                    v-model="body"
                    class="feedback-tab__body"
                    placeholder="請輸入回報內容"
                ></textarea>
            </div>
            <button class="feedback-tab__submit" type="button" @click="onSubmit">送出</button>
        </div>
    </div>
</template>
