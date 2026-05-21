<script setup lang="ts">
import { ref } from 'vue'
import './FeedbackTab.css'
import { push } from 'notivue'
import { useMockUser } from '@/composables/useMockUser'

const { user } = useMockUser()

const subject = ref('')
const body = ref('')

function onSubmit() {
    if (!subject.value.trim() || !body.value.trim()) return
    console.log('[FeedbackTab] submit:', {
        nickname: user.value.nickname,
        subject: subject.value,
        body: body.value,
    })
    push.success('已送出（mock）')
    subject.value = ''
    body.value = ''
}
</script>

<template>
    <div class="feedback-tab">
        <div class="feedback-tab__field">
            <label class="feedback-tab__label">暱稱</label>
            <input
                class="feedback-tab__nickname"
                type="text"
                :value="user.nickname"
                disabled
            />
        </div>
        <div class="feedback-tab__field">
            <label class="feedback-tab__label">主旨</label>
            <input
                v-model="subject"
                class="feedback-tab__subject"
                type="text"
                placeholder="信件標題"
            />
        </div>
        <div class="feedback-tab__field">
            <label class="feedback-tab__label">內文</label>
            <textarea
                v-model="body"
                class="feedback-tab__body"
                placeholder="請輸入回饋內容..."
            ></textarea>
        </div>
        <button class="feedback-tab__submit" type="button" @click="onSubmit">送出</button>
    </div>
</template>
