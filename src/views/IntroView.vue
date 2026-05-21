<script setup lang="ts">
import './IntroView.css'

function handleGoogleLogin() {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    const redirectUri = `${window.location.origin}/oauth2/callback`
    const scope = 'openid email profile'
    const url =
        `https://accounts.google.com/o/oauth2/v2/auth` +
        `?client_id=${clientId}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=code` +
        `&scope=${encodeURIComponent(scope)}`
    window.location.href = url
}
</script>

<template>
    <div class="intro-view">
        <button class="intro-view__google-btn" @click="handleGoogleLogin">
            <img src="https://www.google.com/favicon.ico" alt="Google" />
            <span>使用 Google 登入</span>
        </button>
    </div>
</template>
