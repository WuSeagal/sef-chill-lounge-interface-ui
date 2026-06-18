<script setup lang="ts">
import { ref } from 'vue'
import './AnnouncementTab.css'
import { setAnnouncement } from '@/api/announcementApi'
import { push } from 'notivue'

const MAX = 200
const text = ref('')
const submitting = ref(false)

// 即時動作（非草稿）：按下即送出，故此分頁不參與 SettingsModal 的未存檔離開守則。
async function pin() {
    submitting.value = true
    try {
        await setAnnouncement(text.value)
    } catch {
        push.error('公告設定失敗，請稍後再試')
    } finally {
        submitting.value = false
    }
}

async function unpin() {
    submitting.value = true
    try {
        await setAnnouncement('')
        text.value = ''
    } catch {
        push.error('取消釘選失敗，請稍後再試')
    } finally {
        submitting.value = false
    }
}
</script>

<template>
    <div class="announcement-tab">
        <h3 class="announcement-tab__title">置頂公告</h3>
        <p class="announcement-tab__hint">釘選訊息，可包含連結。(最大200字)</p>
        <textarea
            v-model="text"
            class="announcement-tab__input"
            :maxlength="MAX"
            rows="4"
            placeholder="置頂內容"
            data-test="announcement-input"
        ></textarea>
        <div class="announcement-tab__count">{{ text.length }} / {{ MAX }}</div>
        <div class="announcement-tab__actions">
            <button
                type="button"
                class="announcement-tab__btn announcement-tab__btn--unpin"
                :disabled="submitting"
                data-test="announcement-unpin"
                @click="unpin"
            >取消釘選</button>
            <button
                type="button"
                class="announcement-tab__btn announcement-tab__btn--pin"
                :disabled="submitting"
                data-test="announcement-pin"
                @click="pin"
            >釘選</button>
        </div>
    </div>
</template>
