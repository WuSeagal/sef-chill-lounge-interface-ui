<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

onMounted(async () => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')

    if (!code) {
        router.replace('/')
        return
    }

    try {
        const res = await fetch(import.meta.env.VITE_ENDPOINT + '/user/googleAuth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ code })
        })

        if (res.ok) {
            router.replace('/chat')
        } else {
            console.error('googleAuth failed, status:', res.status)
            router.replace('/')
        }
    } catch (e) {
        console.error('googleAuth error:', e)
        router.replace('/')
    }
})
</script>

<template>
    <div class="callback-wrapper">
        <div class="callback-card">
            <div class="loading-spinner"></div>
            <p class="loading-text">登入中，請稍候...</p>
        </div>
    </div>
</template>

<style scoped>
.callback-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100vw;
    height: 100dvh;
    background: #f0f2f5;
}

.callback-card {
    background: white;
    border-radius: 12px;
    padding: 48px 40px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
}

.loading-spinner {
    width: 48px;
    height: 48px;
    border: 4px solid #e0e0e0;
    border-top: 4px solid #4285f4;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

.loading-text {
    color: #555;
    font-size: 1rem;
    margin: 0;
}
</style>
