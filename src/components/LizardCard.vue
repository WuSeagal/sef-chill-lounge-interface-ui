<script setup lang="ts">
import './LizardCard.css'
import lizardchiPng from '@/assets/lizardchi.png'

// 共用「灰階蜥蜴卡片」：灰階靜止蜥蜴 + 標題 / 內文 / 動作三個 slot。
// 只負責「卡片本體」（牛皮紙卡），背板（整頁方格 / 半透明遮罩）由使用端各自決定（見 design D6）。
// 蜥蜴靜止灰階（grayscale .6 / opacity .5、不跳動）表「終局」狀態。
</script>

<template>
    <div class="lizard-card">
        <img class="lizard-card__lizard" :src="lizardchiPng" alt="lizardchi" />
        <p v-if="$slots.title" class="lizard-card__title">
            <slot name="title" />
        </p>
        <p v-if="$slots.body" class="lizard-card__body">
            <slot name="body" />
        </p>
        <div v-if="$slots.actions" class="lizard-card__actions">
            <slot name="actions" />
        </div>
    </div>
</template>
