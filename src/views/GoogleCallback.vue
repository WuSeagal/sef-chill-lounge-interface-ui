<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { push } from 'notivue'
import LizardLoading from '@/components/LizardLoading.vue'

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
            push.error('Google 登入失敗，請再試一次')
            router.replace('/')
        }
    } catch (e) {
        console.error('googleAuth error:', e)
        push.error('Google 登入失敗，請稍後再試')
        router.replace('/')
    }
})
</script>

<template>
    <LizardLoading message="正在替你找位子" />
</template>
