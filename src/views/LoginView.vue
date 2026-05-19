<script setup lang="ts">
const handleGoogleLogin = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    const redirectUri = `${window.location.origin}/oauth2/callback`
    const scope = 'openid email profile'
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`
    window.location.href = url
}
</script>

<template>
    <div class="login-wrapper">
        <div class="login-card">
            <h1 class="title">SEF Chill Lounge</h1>
            <p class="subtitle">請使用 Google 帳號登入</p>
            <button class="google-btn" @click="handleGoogleLogin">
                <img src="https://www.google.com/favicon.ico" alt="google" width="18" />
                使用 Google 登入
            </button>
        </div>
    </div>
</template>

<style scoped>
.login-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100vw;
    height: 100dvh;
    background: #f0f2f5;
}

.login-card {
    background: white;
    border-radius: 12px;
    padding: 48px 40px;
    max-width: 400px;
    width: 90%;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.title {
    font-size: 1.8rem;
    font-weight: 700;
    color: #1a1a2e;
    margin: 0;
}

.subtitle {
    color: #666;
    margin: 0;
    font-size: 0.95rem;
}

.google-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 12px 24px;
    background: white;
    border: 1.5px solid #dadce0;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 500;
    color: #3c4043;
    cursor: pointer;
    transition: background 0.2s, box-shadow 0.2s;
}

.google-btn:hover {
    background: #f8f9fa;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}
</style>
