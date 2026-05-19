<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.ts'

const router = useRouter()
const auth = useAuthStore()

const handleLogout = async () => {
    await fetch(import.meta.env.VITE_ENDPOINT + '/logout', {
        method: 'POST',
        credentials: 'include'
    })
    auth.$reset()
    router.replace('/')
}
</script>

<template>
    <div class="home-wrapper">
        <div class="home-card">
            <h1 class="title">SEF Chill Lounge</h1>
            <div class="user-info">
                <p class="welcome">歡迎回來，{{ auth.user?.googleName }}</p>
                <p class="email">{{ auth.user?.email }}</p>
            </div>
            <button class="logout-btn" @click="handleLogout">登出</button>
        </div>
    </div>
</template>

<style scoped>
.home-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100vw;
    height: 100dvh;
    background: #f0f2f5;
}

.home-card {
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

.user-info {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.welcome {
    font-size: 1.1rem;
    font-weight: 600;
    color: #333;
    margin: 0;
}

.email {
    font-size: 0.9rem;
    color: #888;
    margin: 0;
}

.logout-btn {
    padding: 10px 24px;
    background: #e53e3e;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 0.95rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
}

.logout-btn:hover {
    background: #c53030;
}
</style>
