<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import './ErrorPage.css'
import heroSrc from '@/assets/error-hero.svg'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const code = computed<number>(() => {
    const raw = route.query.code
    if (raw === undefined || raw === null || raw === '') return 0
    const n = Number(raw)
    return Number.isFinite(n) ? n : 0
})

const from = computed<string | null>(() => {
    const raw = route.query.from
    return typeof raw === 'string' && raw.length > 0 ? raw : null
})

const subtitle = computed(() => {
    const c = code.value
    if (c >= 400 && c < 500) return t('error.subtitleNotFound')
    if (c >= 500) return t('error.subtitleServer')
    return t('error.subtitleNetwork')
})

function goHome(): void {
    router.push('/')
}
</script>

<template>
    <div class="error-page">
        <div class="error-page__card">
            <img
                :src="heroSrc"
                alt=""
                class="error-page__hero"
                data-test="error-hero" />
            <h1 class="error-page__title">{{ t('error.title') }}</h1>
            <p class="error-page__subtitle">{{ subtitle }}</p>
            <p class="error-page__code">{{ t('error.codeLabel') }} {{ code }}</p>
            <p v-if="from" class="error-page__from">{{ t('error.fromLabel') }}: {{ from }}</p>
            <button
                type="button"
                class="error-page__cta"
                data-test="back-home"
                @click="goHome">
                {{ t('error.backHome') }}
            </button>
        </div>
    </div>
</template>
