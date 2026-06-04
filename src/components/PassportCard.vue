<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, type CSSProperties } from 'vue'
import { PLATFORMS, type SocialPlatform } from '@/constants/platforms'

/**
 * 護照卡（review 確認頁 + 放大遮罩共用）。固定設計寬度 800，依容器寬度整體等比例縮放
 * （transform: scale，寬高+內容一起縮，不重排）。full=true 時以全尺寸 scale 1 呈現（放大遮罩用）。
 * ps-* 樣式來自 IntroView.css（全域載入；本元件僅在 IntroView 內使用）。
 */
interface TagItem { tagId: string; content: string }
interface SocialItem { platform: string; links: string }

const props = withDefaults(defineProps<{
  furName: string
  avatarSrc: string
  avatarStyle?: CSSProperties
  tags?: TagItem[]
  socials?: SocialItem[]
  stickers?: string[]
  full?: boolean
}>(), {
  avatarStyle: () => ({}),
  tags: () => [],
  socials: () => [],
  stickers: () => [],
  full: false,
})

const DESIGN_W = 800
const fitRef = ref<HTMLElement | null>(null)
const cardRef = ref<HTMLElement | null>(null)
const chiprowRef = ref<HTMLElement | null>(null)
const tagsClipped = ref(false)
let ro: ResizeObserver | null = null

const platformMeta = (p: string) => PLATFORMS[p as SocialPlatform] ?? PLATFORMS.OTHER
const shownSocials = computed(() => props.socials.slice(0, 3))
const hasMoreSocials = computed(() => props.socials.length > 3)

function measureTags(): void {
  const el = chiprowRef.value
  tagsClipped.value = !!el && el.scrollHeight > el.clientHeight + 1
}
function fit(): void {
  const card = cardRef.value
  const fitEl = fitRef.value
  if (!card || !fitEl) return
  const scale = props.full ? 1 : Math.min(1, fitEl.clientWidth / DESIGN_W)
  card.style.transform = `scale(${scale})`
  // transform 不改變佈局盒尺寸，手動把外層設成縮放後視覺尺寸，避免留白/溢位
  fitEl.style.height = `${card.offsetHeight * scale}px`
  if (props.full) fitEl.style.width = `${DESIGN_W * scale}px`
}
function refresh(): void {
  measureTags()
  void nextTick(fit)
}

onMounted(() => {
  refresh()
  if (typeof ResizeObserver !== 'undefined' && fitRef.value) {
    ro = new ResizeObserver(() => refresh())
    ro.observe(fitRef.value)
  }
})
watch(
  () => [props.furName, props.tags, props.socials, props.stickers, props.full] as const,
  () => void nextTick(refresh),
  { deep: true },
)
onBeforeUnmount(() => {
  ro?.disconnect()
  ro = null
})
</script>

<template>
  <div ref="fitRef" class="passport-fit" :class="{ 'passport-fit--full': full }">
    <div ref="cardRef" class="passport">
      <div class="ps-head">
        <span class="ps-brand">SEF·CLI</span>
        <span class="ps-kind">
          ✈ BOARDING&nbsp;PASS
          <span class="ps-bars">
            <i></i><i></i><i></i><i></i><i></i><i></i>
            <i></i><i></i><i></i><i></i><i></i><i></i>
          </span>
        </span>
      </div>

      <div class="ps-body">
        <!-- LEFT: avatar + tags -->
        <div class="ps-left">
          <div class="ps-photo-wrap" data-test="review-avatar">
            <img class="ps-photo" :src="avatarSrc" alt="avatar" :style="avatarStyle" />
            <span class="ps-photo-tick tick-tl"></span>
            <span class="ps-photo-tick tick-br"></span>
          </div>
          <div v-if="tags.length > 0" class="ps-tags">
            <p class="ps-tags-label">TAGS</p>
            <div ref="chiprowRef" class="ps-chiprow">
              <span v-for="tag in tags" :key="tag.tagId" class="ps-chip">{{ tag.content }}</span>
            </div>
            <span v-if="tagsClipped" class="ps-tags-more" data-test="review-tags-more">…</span>
          </div>
        </div>

        <!-- RIGHT: furname / socials / stickers -->
        <div class="ps-right">
          <div>
            <p class="ps-furname-label">FUR NAME</p>
            <h3 class="ps-furname" data-test="review-furname">{{ furName }}</h3>
          </div>
          <div class="ps-section-line"></div>
          <div class="ps-block ps-block--social">
            <template v-if="socials.length > 0">
              <p class="ps-social-label">SOCIAL LINKS</p>
              <ul class="ps-social" data-test="review-socials">
                <li v-for="link in shownSocials" :key="link.platform + link.links">
                  <span
                    class="ps-ic"
                    :style="{ background: platformMeta(link.platform).brandColor }"
                    v-html="platformMeta(link.platform).icon"
                  ></span>
                  <span class="ps-handle">{{ link.links }}</span>
                </li>
                <li v-if="hasMoreSocials" class="ps-more" data-test="review-socials-more">more...</li>
              </ul>
            </template>
          </div>
          <div class="ps-block ps-block--stickers">
            <template v-if="stickers.length > 0">
              <p class="ps-stk-label">STICKERS</p>
              <div class="ps-stickers">
                <img v-for="(url, i) in stickers" :key="i" class="ps-sticker" :src="url" alt="sticker" />
              </div>
            </template>
          </div>
        </div>
      </div>

      <div class="ps-stamp" aria-hidden="true">
        <span class="ps-stamp-l1">SEF-CLI</span>
        <span class="ps-stamp-l2">for UTFG</span>
        <span class="ps-stamp-l3">環遊世界</span>
      </div>
    </div>
  </div>
</template>
