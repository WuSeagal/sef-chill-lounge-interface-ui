<script setup lang="ts">
import './BannedScreen.css'
import '@/assets/grid-paper.css'
import LizardCard from './LizardCard.vue'

// 被封禁者整頁封禁畫面（design D6/D7、demo 中性變體 A）：onboarding 方格紙背景 + 灰階蜥蜴卡片。
// email 與「聯絡管理員」按鈕皆為寫死 mailto:anonywsg@gmail.com（需求明確要求寫死）。
const CONTACT_MAILTO = 'mailto:anonywsg@gmail.com'
const CONTACT_EMAIL = 'anonywsg@gmail.com'
</script>

<template>
    <div class="banned-screen grid-paper" role="alert">
        <LizardCard>
            <template #title>你已被禁用</template>
            <template #body>
                請透過信箱
                <a
                    :href="CONTACT_MAILTO"
                    class="banned-screen__email"
                    data-test="banned-email-link"
                >{{ CONTACT_EMAIL }}</a>
                <br />聯絡管理員
            </template>
            <template #actions>
                <a
                    :href="CONTACT_MAILTO"
                    class="lizard-card__btn"
                    data-test="banned-contact-btn"
                >聯絡管理員</a>
            </template>
        </LizardCard>
    </div>
</template>
