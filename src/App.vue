<template>
    <Teleport to="body">
        <Notivue v-slot="item">
            <Notifications :item="item" />
        </Notivue>
    </Teleport>
    <div v-if="!routerReady" class="app-loading">
        <div class="app-loading-spinner"></div>
    </div>
    <router-view v-else />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Notivue, Notifications } from 'notivue'

const router = useRouter()
const routerReady = ref(false)
router.isReady().then(() => { routerReady.value = true })
</script>

<style>
:root {
    --nv-z: 9999;
}

.app-loading {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f0f2f5;
}

.app-loading-spinner {
    width: 48px;
    height: 48px;
    border: 4px solid #e0e0e0;
    border-top: 4px solid #4285f4;
    border-radius: 50%;
    animation: app-spin 1s linear infinite;
}

@keyframes app-spin {
    to { transform: rotate(360deg); }
}
</style>
