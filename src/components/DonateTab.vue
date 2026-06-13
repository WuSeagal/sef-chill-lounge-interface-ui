<script setup lang="ts">
import './DonateTab.css'
import donateBoba from '@/assets/images/donate_boba.png'

// 斗內連結（比照 Lizardchi-UI GameDonateModal）
const DONATE_URL = 'https://wuseagal.bobaboba.me'
</script>

<template>
    <div class="donate-tab">
        <a
            :href="DONATE_URL"
            target="_blank"
            rel="noopener noreferrer"
            class="donate-tab__link"
        >
            <img class="donate-tab__img" :src="donateBoba" alt="贊助斗內" />
        </a>
    </div>
</template>
