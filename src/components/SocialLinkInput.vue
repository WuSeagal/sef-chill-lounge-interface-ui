<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { PLATFORMS, type SocialPlatform } from '@/constants/platforms'
import { composeSocialUrl, parseSocialHandle } from '@/utils/socialUrl'

const props = withDefaults(defineProps<{
  platform: string
  modelValue: string
  dataTest?: string
  disabled?: boolean
}>(), { modelValue: '', dataTest: undefined, disabled: false })

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const meta = computed(() => (PLATFORMS as Record<string, typeof PLATFORMS[SocialPlatform]>)[props.platform])
const isTemplate = computed(() => meta.value?.inputMode === 'template')

/** 前綴 affix（移到輸入框外、上方當輔助文字；去 scheme 給人看，過長自動換行） */
const affix = computed(() => {
  if (!isTemplate.value || !meta.value?.urlTemplate) return ''
  return meta.value.urlTemplate.split('{{}}')[0].replace(/^https?:\/\//, '')
})

// template 模式用 fillPlaceholder（username/id/key/name）；free 模式（PERSONAL/OTHER）留白
const fieldPlaceholder = computed(() => (isTemplate.value ? (meta.value?.fillPlaceholder ?? '') : ''))

function isTemplateMode(platform: string): boolean {
  return (PLATFORMS as Record<string, { inputMode?: string }>)[platform]?.inputMode === 'template'
}
function deriveSlot(platform: string, links: string): string {
  if (!isTemplateMode(platform)) return links
  return parseSocialHandle(platform, links) ?? ''
}
function toLinks(platform: string, slotValue: string): string {
  return isTemplateMode(platform) ? composeSocialUrl(platform, slotValue) : slotValue
}

/** 內部 slot：template 模式為帳號槽位；free 模式為完整 URL。撐過平台切換。 */
const slot = ref(deriveSlot(props.platform, props.modelValue))

// 外部 modelValue 改變且與目前 slot 組出的不一致時（如 parent reset 成空）→ 重新反解
watch(() => props.modelValue, (mv) => {
  if (mv !== toLinks(props.platform, slot.value)) slot.value = deriveSlot(props.platform, mv)
})

// 平台切換：
// - 平台被清空（取消選擇 / parent reset）時跳過，避免用 stale slot 蓋掉 parent 重置的值。
// - 跨 free↔template 邊界時，slot 語意不同（free 存完整 URL、template 存帳號），
//   需依新平台從 modelValue 重新反解，否則會把完整 URL 當帳號 double-encode 成壞連結。
// - 同為 template（或同為 free）時保留 slot，讓帳號跨平台沿用。
watch(() => props.platform, (newPlatform, oldPlatform) => {
  if (!newPlatform) return
  if (isTemplateMode(newPlatform) !== isTemplateMode(oldPlatform)) {
    slot.value = deriveSlot(newPlatform, props.modelValue)
  }
  emit('update:modelValue', toLinks(newPlatform, slot.value))
})

function onInput(value: string): void {
  if (isTemplate.value) {
    const pasted = parseSocialHandle(props.platform, value)
    slot.value = pasted !== null ? pasted : value
  } else {
    slot.value = value
  }
  emit('update:modelValue', toLinks(props.platform, slot.value))
}
</script>

<template>
  <div class="social-link-input">
    <span v-if="isTemplate && affix" class="social-link-input__affix">{{ affix }}</span>
    <input
      class="social-link-input__field"
      :value="slot"
      :placeholder="fieldPlaceholder"
      :data-test="dataTest"
      :disabled="disabled"
      maxlength="200"
      type="text"
      @input="onInput(($event.target as HTMLInputElement).value)"
    />
  </div>
</template>

<style scoped>
/* 直式：affix（上，灰字可換行）+ input（下，整行）。
   input 欄位樣式由元件自有，透過繼承的 CSS 變數主題化（parent 在容器上覆寫即可，
   避免 scoped class 無法套進子元件內層的限制）。預設為 onboarding 暖色系。 */
.social-link-input {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}
.social-link-input__affix {
  font-size: 0.8rem;
  color: var(--sli-affix, #8c8672);
  line-height: 1.4;
  word-break: break-all;
}
.social-link-input__field {
  width: 100%;
  min-width: 0;
  padding: var(--sli-pad, 10px 12px);
  border: 1px solid var(--sli-border, #d7cdaf);
  border-radius: var(--sli-radius, 11px);
  background: var(--sli-bg, #fffdf6);
  color: var(--sli-text, #3f3a2c);
  font: inherit;
  /* 預設 ≥16px 防 iOS 聚焦自動放大（mobile-a11y-polish）。 */
  font-size: var(--sli-font, 16px);
  line-height: 1.5;
}
.social-link-input__field:focus {
  outline: none;
  border-color: var(--sli-border-focus, #8c8672);
}
.social-link-input__field:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
