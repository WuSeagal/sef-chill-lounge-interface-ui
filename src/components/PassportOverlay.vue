<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch, type CSSProperties } from 'vue'
import './PassportOverlay.css'
import PassportCard from './PassportCard.vue'
import ImageLightbox from './ImageLightbox.vue'
import type { Tag } from '@/types/user'
import { exportPassportToPng, buildPassportFileName } from '@/utils/exportPassport'
import { push } from 'notivue'

/**
 * 放大護照共用遮罩（lightbox）：teleport 至 body、半透明背景 + 全尺寸護照，
 * 由 onboarding review 放大與 /chat profile 共用。內含 sticker → ImageLightbox 串接、
 * body scroll lock、Escape / 點空白 / 關閉鈕關閉、開啟時 focus 關閉鈕。
 */
interface SocialItem { platform: string; links: string }

const props = withDefaults(defineProps<{
  open: boolean
  furName: string
  avatarSrc: string
  avatarStyle?: CSSProperties
  tags?: Tag[]
  socials?: SocialItem[]
  stickers?: string[]
  exportable?: boolean
}>(), {
  avatarStyle: () => ({}),
  tags: () => [],
  socials: () => [],
  stickers: () => [],
  exportable: false,
})

const emit = defineEmits<{ (e: 'close'): void }>()

const closeRef = ref<HTMLButtonElement | null>(null)
const lightboxUrl = ref<string | null>(null)
// a11y：記住開啟前的焦點元素，關閉/卸載時還原（onboarding 與 /chat 兩條路徑共用）
let lastFocused: HTMLElement | null = null

function onStickerClick(url: string): void {
  lightboxUrl.value = url
}
function onAvatarClick(url: string): void {
  lightboxUrl.value = url
}

const exporting = ref(false)
async function onSave(): Promise<void> {
  if (exporting.value) return
  const card = document.querySelector('.passport-overlay .passport') as HTMLElement | null
  if (!card) return
  exporting.value = true
  try {
    await exportPassportToPng(card, { fileName: buildPassportFileName(props.furName) })
  } catch (e) {
    console.error('[匯出護照] 失敗:', e)
    push.error('匯出失敗，請再試一次')
  } finally {
    exporting.value = false
  }
}
function closeLightbox(): void {
  lightboxUrl.value = null
}

function restoreFocus(): void {
  const el = lastFocused
  lastFocused = null
  if (el && el !== document.body && typeof el.focus === 'function') el.focus()
}

function onKeydown(e: KeyboardEvent): void {
  if (e.key !== 'Escape' || !props.open) return
  // sticker lightbox 開著時讓 lightbox 自己處理 Escape（內層先關），不關整個護照
  if (lightboxUrl.value !== null) return
  emit('close')
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      lastFocused = (document.activeElement as HTMLElement) ?? null
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', onKeydown)
      void nextTick(() => closeRef.value?.focus())
    } else {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKeydown)
      lightboxUrl.value = null
      restoreFocus()
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  document.body.style.overflow = ''
  window.removeEventListener('keydown', onKeydown)
  // /chat 路徑以 v-if 卸載本元件（open watcher 的 false 分支不會觸發），於此補還原焦點
  restoreFocus()
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="passport-overlay"
      data-test="passport-zoom"
      @click.self="emit('close')"
    >
      <button
        ref="closeRef"
        type="button"
        class="passport-overlay__close"
        aria-label="關閉放大檢視"
        @click="emit('close')"
      >✕</button>
      <div
        class="passport-overlay__viewport"
        data-passport-fit-viewport
        @click.self="emit('close')"
      >
        <div class="passport-overlay__group">
          <PassportCard
            class="passport-overlay__inner"
            :full="true"
            :reserve-bottom="exportable ? 44 : 0"
            :fur-name="furName"
            :avatar-src="avatarSrc"
            :avatar-style="avatarStyle"
            :tags="tags"
            :socials="socials"
            :stickers="stickers"
            :avatar-zoomable="true"
            @sticker-click="onStickerClick"
            @avatar-click="onAvatarClick"
          />
          <button
            v-if="exportable"
            type="button"
            class="passport-overlay__save"
            :disabled="exporting"
            @click="onSave"
          >{{ exporting ? '匯出中…' : '儲存護照' }}</button>
        </div>
      </div>
    </div>
    <ImageLightbox
      :open="lightboxUrl !== null"
      :image-url="lightboxUrl"
      @close="closeLightbox"
    />
  </Teleport>
</template>
