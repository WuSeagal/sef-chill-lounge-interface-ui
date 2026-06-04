<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { PLATFORM_LIST, PLATFORMS, type SocialPlatform } from '@/constants/platforms'
import './PlatformSelect.css'

/**
 * 自訂平台下拉（取代原生 <select>，因原生 <option> 無法顯示 SVG icon）。
 * ARIA combobox/listbox 模式 + 鍵盤操作（Up/Down/Enter/Esc/Home/End）+ 點外關閉。
 * icon 以 v-html 內嵌信任的靜態 SVG（同 BottomBar/UserPopup 慣例；來源為本專案 assets，非使用者輸入）。
 */
const props = withDefaults(defineProps<{
  modelValue: SocialPlatform | ''
  placeholder?: string
  dataTest?: string
  ariaLabel?: string
}>(), {
  placeholder: '選擇平台…',
  dataTest: undefined,
  ariaLabel: '選擇平台',
})

const emit = defineEmits<{ (e: 'update:modelValue', v: SocialPlatform): void }>()

const options = PLATFORM_LIST
const open = ref(false)
const activeIndex = ref(-1)
const rootRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLButtonElement | null>(null)

const selected = computed(() => (props.modelValue ? PLATFORMS[props.modelValue] : null))
const listId = `ps-list-${Math.random().toString(36).slice(2, 8)}`
const optionId = (v: string) => `${listId}-opt-${v}`
const activeDescendant = computed(() =>
  open.value && activeIndex.value >= 0 ? optionId(options[activeIndex.value].value) : undefined)

function selectedIndex(): number {
  return Math.max(0, options.findIndex(o => o.value === props.modelValue))
}

function openList(active: number): void {
  open.value = true
  activeIndex.value = active
  document.addEventListener('mousedown', onDocMouseDown)
}

function closeList(refocus = false): void {
  open.value = false
  activeIndex.value = -1
  document.removeEventListener('mousedown', onDocMouseDown)
  if (refocus) triggerRef.value?.focus()
}

function toggle(): void {
  if (open.value) closeList()
  else openList(selectedIndex())
}

function selectAt(i: number): void {
  const opt = options[i]
  if (!opt) return
  emit('update:modelValue', opt.value)
  closeList(true)
}

function onDocMouseDown(e: MouseEvent): void {
  if (rootRef.value && !rootRef.value.contains(e.target as Node)) closeList()
}

function onKeydown(e: KeyboardEvent): void {
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault()
      if (!open.value) openList(0)
      else activeIndex.value = Math.min(activeIndex.value + 1, options.length - 1)
      break
    case 'ArrowUp':
      e.preventDefault()
      if (!open.value) openList(options.length - 1)
      else activeIndex.value = Math.max(activeIndex.value - 1, 0)
      break
    case 'Home':
      if (open.value) { e.preventDefault(); activeIndex.value = 0 }
      break
    case 'End':
      if (open.value) { e.preventDefault(); activeIndex.value = options.length - 1 }
      break
    case 'Enter':
    case ' ':
      e.preventDefault()
      if (!open.value) openList(selectedIndex())
      else if (activeIndex.value >= 0) selectAt(activeIndex.value)
      break
    case 'Escape':
      if (open.value) { e.preventDefault(); closeList(true) }
      break
    case 'Tab':
      if (open.value) closeList()
      break
  }
}

onBeforeUnmount(() => document.removeEventListener('mousedown', onDocMouseDown))
</script>

<template>
  <div ref="rootRef" class="platform-select" :data-test="dataTest">
    <button
      ref="triggerRef"
      type="button"
      class="ps-trigger"
      role="combobox"
      aria-haspopup="listbox"
      :aria-expanded="open ? 'true' : 'false'"
      :aria-controls="listId"
      :aria-activedescendant="activeDescendant"
      :aria-label="ariaLabel"
      @click="toggle"
      @keydown="onKeydown"
    >
      <span v-if="selected" class="ps-icon" :style="{ color: selected.brandColor }" v-html="selected.icon" />
      <span class="ps-label" :class="{ 'ps-label--placeholder': !selected }">
        {{ selected ? selected.label : placeholder }}
      </span>
      <span class="ps-caret" aria-hidden="true">▾</span>
    </button>

    <ul v-if="open" :id="listId" class="ps-list" role="listbox" :aria-label="ariaLabel">
      <li
        v-for="(p, i) in options"
        :id="optionId(p.value)"
        :key="p.value"
        class="ps-opt"
        :class="{ 'ps-opt--active': i === activeIndex }"
        role="option"
        :data-value="p.value"
        :aria-selected="p.value === modelValue ? 'true' : 'false'"
        @click="selectAt(i)"
        @mouseenter="activeIndex = i"
      >
        <span class="ps-icon" :style="{ color: p.brandColor }" v-html="p.icon" />
        <span class="ps-label">{{ p.label }}</span>
      </li>
    </ul>
  </div>
</template>
