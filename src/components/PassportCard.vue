<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, type CSSProperties } from 'vue'
import './PassportCard.css'
import { PLATFORMS, type SocialPlatform } from '@/constants/platforms'
import { TagType, TAG_TYPE_ORDER, TAG_TYPE_PREFIX, type Tag } from '@/types/user'
import { useScrollEdges } from '@/composables/useScrollEdges'

/**
 * 護照卡（review 確認頁 + 放大遮罩共用）。固定設計寬度 800，依容器寬度整體等比例縮放
 * （transform: scale，寬高+內容一起縮，不重排）。full=true 時以全尺寸 scale 1 呈現（放大遮罩用）。
 * 樣式自帶於 PassportCard.css（不依賴 IntroView.css 全域載入），確保任何路由皆可獨立渲染。
 * TAG 區依 TagType 分組以 prefix 行（我是…/我會…）唯讀呈現；社群連結全部顯示且可點開。
 */
interface SocialItem { platform: string; links: string }

const props = withDefaults(defineProps<{
  furName: string
  avatarSrc: string
  avatarStyle?: CSSProperties
  tags?: Tag[]
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

const emit = defineEmits<{
  (e: 'sticker-click', url: string): void
}>()

const DESIGN_W = 800
const fitRef = ref<HTMLElement | null>(null)
const cardRef = ref<HTMLElement | null>(null)
let ro: ResizeObserver | null = null

// scroll affordance：TAG 區 / 社群區各自獨立捲動，上/下還有內容時顯示漸層 + 箭頭
const tagScrollRef = ref<HTMLElement | null>(null)
const socialScrollRef = ref<HTMLElement | null>(null)
const { edges: tagEdges, update: updateTagEdges } = useScrollEdges(tagScrollRef)
const { edges: socialEdges, update: updateSocialEdges } = useScrollEdges(socialScrollRef)
function refreshEdges(): void {
  updateTagEdges()
  updateSocialEdges()
}

const platformMeta = (p: string) => PLATFORMS[p as SocialPlatform] ?? PLATFORMS.OTHER

// TAG 依型別分組（沿用 UserPopup 慣例）：同型別歸一行，行首顯示 prefix（CUSTOM 無 prefix）
const groupedTags = computed<Record<TagType, Tag[]>>(() => {
  const acc: Record<TagType, Tag[]> = {
    [TagType.ROLE]: [], [TagType.LANGUAGE]: [], [TagType.FRAMEWORK]: [],
    [TagType.DATABASE]: [], [TagType.DEVOPS]: [], [TagType.CUSTOM]: [],
  }
  for (const t of props.tags) {
    if (acc[t.type]) acc[t.type].push(t)
  }
  return acc
})
const visibleTagTypes = computed(() => TAG_TYPE_ORDER.filter(type => groupedTags.value[type].length > 0))
const tagPrefix = (type: TagType): string | undefined => TAG_TYPE_PREFIX[type]

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

onMounted(() => {
  void nextTick(() => { fit(); refreshEdges() })
  if (typeof ResizeObserver !== 'undefined' && fitRef.value) {
    ro = new ResizeObserver(() => void nextTick(() => { fit(); refreshEdges() }))
    ro.observe(fitRef.value)
  }
})
watch(
  () => [props.furName, props.tags, props.socials, props.stickers, props.full] as const,
  () => void nextTick(() => { fit(); refreshEdges() }),
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
            <div
              class="ps-scroll-wrap"
              :class="{
                'ps-scroll-wrap--cue-top': tagEdges.overflowing && !tagEdges.atTop,
                'ps-scroll-wrap--cue-bottom': tagEdges.overflowing && !tagEdges.atBottom,
              }"
            >
              <div ref="tagScrollRef" class="ps-tag-scroll" data-test="review-tags">
                <div
                  v-for="type in visibleTagTypes"
                  :key="type"
                  class="ps-tag-row"
                  :class="{ 'ps-tag-row--custom': type === TagType.CUSTOM }"
                >
                  <span v-if="tagPrefix(type)" class="ps-tag-prefix">{{ tagPrefix(type) }}</span>
                  <span class="ps-tag-row-chips">
                    <span v-for="tag in groupedTags[type]" :key="tag.tagId" class="ps-chip">{{ tag.content }}</span>
                  </span>
                </div>
              </div>
              <span class="ps-scroll-arrow ps-scroll-arrow--top" aria-hidden="true">▲</span>
              <span class="ps-scroll-arrow ps-scroll-arrow--bottom" aria-hidden="true">▼</span>
            </div>
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
              <div
                class="ps-scroll-wrap"
                :class="{
                  'ps-scroll-wrap--cue-top': socialEdges.overflowing && !socialEdges.atTop,
                  'ps-scroll-wrap--cue-bottom': socialEdges.overflowing && !socialEdges.atBottom,
                }"
              >
                <ul ref="socialScrollRef" class="ps-social ps-social-scroll" data-test="review-socials">
                  <li v-for="link in socials" :key="link.platform + link.links">
                    <a
                      class="ps-social-link"
                      :href="link.links"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span
                        class="ps-ic"
                        :style="{ background: platformMeta(link.platform).brandColor }"
                        v-html="platformMeta(link.platform).icon"
                      ></span>
                      <span class="ps-handle">{{ link.links }}</span>
                    </a>
                  </li>
                </ul>
                <span class="ps-scroll-arrow ps-scroll-arrow--top" aria-hidden="true">▲</span>
                <span class="ps-scroll-arrow ps-scroll-arrow--bottom" aria-hidden="true">▼</span>
              </div>
            </template>
          </div>
          <div class="ps-block ps-block--stickers">
            <template v-if="stickers.length > 0">
              <p class="ps-stk-label">STICKERS</p>
              <div class="ps-stickers">
                <img
                  v-for="(url, i) in stickers"
                  :key="i"
                  class="ps-sticker"
                  :src="url"
                  alt="sticker"
                  role="button"
                  tabindex="0"
                  @click="emit('sticker-click', url)"
                  @keydown.enter.space.prevent="emit('sticker-click', url)"
                />
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
