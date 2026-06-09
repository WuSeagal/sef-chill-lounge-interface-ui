<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, type CSSProperties } from 'vue'
import './PassportCard.css'
import { PLATFORMS, type SocialPlatform } from '@/constants/platforms'
import { formatSocialDisplay } from '@/utils/socialUrl'
import { TagType, TAG_TYPE_ORDER, TAG_TYPE_PREFIX, type Tag } from '@/types/user'
import { useScrollEdges } from '@/composables/useScrollEdges'
import { computeFitScale } from '@/utils/passportFit'

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
  avatarZoomable?: boolean
  /** full 模式下，量測可用高度時預留的底部空間（px），供外層在護照下方放按鈕用 */
  reserveBottom?: number
}>(), {
  avatarStyle: () => ({}),
  tags: () => [],
  socials: () => [],
  stickers: () => [],
  full: false,
  avatarZoomable: false,
  reserveBottom: 0,
})

const emit = defineEmits<{
  (e: 'sticker-click', url: string): void
  (e: 'avatar-click', url: string): void
}>()

const DESIGN_W = 800
const fitRef = ref<HTMLElement | null>(null)
const cardRef = ref<HTMLElement | null>(null)
let ro: ResizeObserver | null = null
let roRaf: number | null = null
// fit() 冪等 guard：full 模式觀察的父容器是 overflow:auto，護照溢出時捲軸出現/消失會改變其
// clientWidth/Height 而再次觸發 RO。收斂由等比 fit-both 數學本身保證（縮放後卡片必定塞進可用
// 空間→捲軸消失→重算的 scale 仍塞得進→穩定，不會在兩值間振盪）；此 guard 的作用是「相同
// (scale, natH) 不重複寫 DOM」，吃掉收斂後那次多餘回呼與 "ResizeObserver loop" console 警告。
// 注意必須同時比對 natH——內容變高時 scale 可能仍鎖在 1 但 fitEl 高度仍需重算，只比 scale 會漏掉高度更新。
let lastScale = -1
let lastNatH = -1

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
  const natH = card.offsetHeight // transform 不影響 layout box，量到的恆為原寸高
  let availW: number
  let availH: number
  if (props.full) {
    // full（放大遮罩）：以標記的固定 viewport 容器（data-passport-fit-viewport）為可用空間，
    // 寬高皆適配並扣掉 reserveBottom（保留底部按鈕空間）。量「固定 viewport」而非直接父層，
    // 是為了讓外層可用「縮到護照尺寸」的群組包按鈕，而不會與寬度量測產生循環依賴。
    const viewport = (fitEl.closest('[data-passport-fit-viewport]') as HTMLElement | null) ?? fitEl.parentElement
    if (viewport) {
      const cs = getComputedStyle(viewport)
      availW = viewport.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
      availH = viewport.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - props.reserveBottom
    } else {
      availW = fitEl.clientWidth
      availH = natH
    }
  } else {
    availW = fitEl.clientWidth
    availH = natH
  }
  const scale = computeFitScale({ availW, availH, natW: DESIGN_W, natH, full: props.full })
  // 冪等：相同結果不重複寫 DOM，斷開「縮放→捲軸變化→RO 再觸發」的回授
  if (scale === lastScale && natH === lastNatH) return
  lastScale = scale
  lastNatH = natH
  card.style.transform = `scale(${scale})`
  // transform 不改變佈局盒尺寸，手動把外層設成縮放後視覺尺寸，避免留白/溢位
  fitEl.style.height = `${natH * scale}px`
  if (props.full) fitEl.style.width = `${DESIGN_W * scale}px`
}

onMounted(() => {
  void nextTick(() => { fit(); refreshEdges() })
  if (typeof ResizeObserver !== 'undefined') {
    const target = props.full
      ? ((fitRef.value?.closest('[data-passport-fit-viewport]') as HTMLElement | null) ?? fitRef.value?.parentElement ?? fitRef.value)
      : fitRef.value
    if (target) {
      // rAF debounce：把 fit 推到下一幀，避免 RO callback 在同一幀內又改變佈局造成
      // "ResizeObserver loop completed with undelivered notifications" 警告（配合冪等 guard 收斂）
      ro = new ResizeObserver(() => {
        if (roRaf !== null) return
        roRaf = requestAnimationFrame(() => {
          roRaf = null
          fit()
          refreshEdges()
        })
      })
      ro.observe(target)
    }
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
  if (roRaf !== null) {
    cancelAnimationFrame(roRaf)
    roRaf = null
  }
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
            <img
              class="ps-photo"
              :class="{ 'ps-photo--zoomable': avatarZoomable }"
              :src="avatarSrc"
              alt="avatar"
              :style="avatarStyle"
              :role="avatarZoomable ? 'button' : undefined"
              :aria-label="avatarZoomable ? '放大檢視頭像' : undefined"
              :tabindex="avatarZoomable ? 0 : undefined"
              @click="avatarZoomable && emit('avatar-click', avatarSrc)"
              @keydown.enter.space.prevent="avatarZoomable && emit('avatar-click', avatarSrc)"
            />
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
                      <span class="ps-handle">{{ formatSocialDisplay(link.platform, link.links) }}</span>
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
