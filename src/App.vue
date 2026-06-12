<template>
    <Teleport to="body">
        <Notivue v-slot="item">
            <Notifications :item="item" />
        </Notivue>
    </Teleport>
    <LizardLoading v-if="!routerReady" message="載入中" />
    <router-view v-else />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Notivue, Notifications } from 'notivue'
import LizardLoading from '@/components/LizardLoading.vue'

const router = useRouter()
const routerReady = ref(false)
router.isReady().then(() => { routerReady.value = true })
</script>

<style>
:root {
    --nv-z: 9999;
}
</style>
