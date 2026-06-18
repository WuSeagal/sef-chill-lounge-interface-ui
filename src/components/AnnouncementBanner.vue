<script setup lang="ts">
import { computed } from 'vue'
import './AnnouncementBanner.css'
import { parseMessageSegments } from '@/utils/messageLinks'
// 圖示存成可重用的 svg 檔，循專案慣例以 ?raw 內嵌（保留 currentColor，<img> 無法）。
import announcementIconRaw from '@/assets/icons/icon-announcement.svg?raw'

const props = defineProps<{ text: string }>()
const emit = defineEmits<{ (e: 'link-click', url: string): void }>()

// 與聊天訊息相同的安全拆分：純文字 + 安全超連結，危險 scheme 屏蔽為 ***，嚴禁 v-html。
// 公告無 @mention 情境，故 memberNames 留空。
const segments = computed(() => parseMessageSegments(props.text, []))
</script>

<template>
    <div class="announcement-banner" role="region" aria-label="公告" aria-live="polite">
        <div class="announcement-banner__card">
            <span class="announcement-banner__icon" v-html="announcementIconRaw"></span>
            <div class="announcement-banner__text"><template
                v-for="(seg, idx) in segments"
                :key="idx"
            ><a
                    v-if="seg.kind === 'link'"
                    class="announcement-banner__link"
                    :href="seg.url"
                    @click.prevent="emit('link-click', seg.url)"
                >{{ seg.display }}</a><span
                    v-else-if="seg.kind === 'blocked'"
                >***</span><span
                    v-else-if="seg.kind === 'mention'"
                >{{ seg.display }}</span><template v-else>{{ seg.text }}</template></template></div>
        </div>
    </div>
</template>
