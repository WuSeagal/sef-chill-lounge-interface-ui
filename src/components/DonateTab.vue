<script setup lang="ts">
import './DonateTab.css'
import { useMockUser } from '@/composables/useMockUser'

const { user } = useMockUser()
</script>

<template>
    <div class="donate-tab">
        <a
            :href="user.donateUrl"
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
