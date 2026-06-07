<script setup lang="ts">
import { computed, ref } from 'vue'
import PassportCard from './PassportCard.vue'
import PassportOverlay from './PassportOverlay.vue'
import { useUser } from '@/composables/useUser'
import { resolveAvatarSrc } from '@/utils/avatarSource'
import { buildAvatarRingStyle } from '@/utils/avatarRing'
import { assetUrl } from '@/utils/assetUrl'

const user = useUser()
const furName = computed(() => user.profile.value?.furName || user.profile.value?.username || '')
const avatarSrc = computed(() => resolveAvatarSrc(user.profile.value?.avatar))
const avatarStyle = computed(() =>
  buildAvatarRingStyle(user.profile.value?.avatarColor ?? null, user.profile.value?.avatarBorder ?? false, 'lg'))
const tags = computed(() => user.profile.value?.tags ?? [])
const socials = computed(() =>
  (user.profile.value?.socials ?? []).map(s => ({ platform: s.platform, links: s.links })))
const stickers = computed(() =>
  (user.profile.value?.stickers ?? []).map(s => assetUrl(s.sticker)).filter((u): u is string => !!u))

const overlayOpen = ref(false)
</script>

<template>
  <div class="export-passport-tab">
    <p class="export-passport-tab__hint">點擊護照放大檢視，拉動TAG和社群連結至想輸出的畫面樣子，之後點擊右下「儲存護照」匯出PNG圖檔。</p>
    <div
      class="export-passport-tab__preview"
      role="button"
      tabindex="0"
      @click="overlayOpen = true"
      @keydown.enter.space.prevent="overlayOpen = true"
    >
      <PassportCard
        :fur-name="furName"
        :avatar-src="avatarSrc"
        :avatar-style="avatarStyle"
        :tags="tags"
        :socials="socials"
        :stickers="stickers"
      />
    </div>
    <PassportOverlay
      v-if="overlayOpen"
      :open="true"
      :exportable="true"
      :fur-name="furName"
      :avatar-src="avatarSrc"
      :avatar-style="avatarStyle"
      :tags="tags"
      :socials="socials"
      :stickers="stickers"
      @close="overlayOpen = false"
    />
  </div>
</template>

<style scoped>
.export-passport-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100%;
  gap: 16px;
  padding: 8px;
}
.export-passport-tab__hint {
  color: #8c8672;
  font-size: 0.9rem;
}
.export-passport-tab__preview {
  width: 100%;
  cursor: pointer;
}
/* 放大前禁用護照本體互動：點擊穿透回外層 wrapper 開 overlay，避免誤觸頭像/貼圖/社群連結 */
.export-passport-tab__preview :deep(.passport-fit) {
  pointer-events: none;
}
</style>
