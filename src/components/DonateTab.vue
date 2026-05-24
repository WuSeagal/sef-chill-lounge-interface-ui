<script setup lang="ts">
import './DonateTab.css'

// 捐款資訊全站共用，寫死在前端（依 openspec/backlog.md 待辦：
//   - 之後申請正式捐款帳號後更新此 URL）
const DONATE_URL = 'https://example.com/donate-placeholder'
</script>

<template>
    <div class="donate-tab">
        <a
            :href="DONATE_URL"
            target="_blank"
            rel="noopener noreferrer"
            class="donate-tab__link"
        >
            <div class="donate-tab__placeholder">
                Donate
            </div>
        </a>
    </div>
</template>
