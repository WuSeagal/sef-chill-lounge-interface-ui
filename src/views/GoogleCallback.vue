<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
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
            router.replace('/')
        }
    } catch (e) {
        console.error('googleAuth error:', e)
        router.replace('/')
    }
})
</script>

<template>
    <LizardLoading message="正在替你找位子" />
</template>
