<script setup lang="ts">
import { ref, computed } from 'vue'
import { push } from 'notivue'
import './TagEditorModal.css'
import {
    TagType, TAG_TYPE_ORDER, TAG_TYPE_LABEL, type GroupedTags, type Tag,
} from '@/types/user'
import type { UseTagEditorStateReturn } from '@/composables/useTagEditorState'

const props = withDefaults(defineProps<{
    open: boolean
    selectable: GroupedTags
    state: UseTagEditorStateReturn
    maxPerUser: number
    /** 使用者實際持有清單（profile.tags，未過濾）；含未達標但已持有的 custom，需顯示為已選可取消（design D7）。 */
    held?: Tag[]
}>(), {
    held: () => [],
})
const emit = defineEmits<{ (e: 'close'): void }>()

const expanded = ref<TagType | null>(null)
const searchByType = ref<Record<TagType, string>>({
    [TagType.ROLE]: '', [TagType.LANGUAGE]: '', [TagType.FRAMEWORK]: '',
    [TagType.DATABASE]: '', [TagType.DEVOPS]: '', [TagType.CUSTOM]: '',
})
const newInputByType = ref<Record<TagType, string>>({
    [TagType.ROLE]: '', [TagType.LANGUAGE]: '', [TagType.FRAMEWORK]: '',
    [TagType.DATABASE]: '', [TagType.DEVOPS]: '', [TagType.CUSTOM]: '',
})

function toggleExpand(type: TagType): void {
    expanded.value = expanded.value === type ? null : type
}

// 可選池 ∪ 持有但未達標（不在可選池）的同型別 TAG，去重。
// 讓「已持有但未達 threshold」的 custom 仍以已選 chip 出現、可取消（design D7）。
function chipsForType(type: TagType): Tag[] {
    const selectable = props.selectable[type] ?? []
    const ids = new Set(selectable.map(t => t.tagId))
    const extraHeld = props.held.filter(t => t.type === type && !ids.has(t.tagId))
    return [...selectable, ...extraHeld]
}

function filteredChips(type: TagType): Tag[] {
    const q = searchByType.value[type].trim().toLowerCase()
    const all = chipsForType(type)
    if (!q) return all
    return all.filter(t => t.content.toLowerCase().includes(q))
}

function isSelected(tagId: string): boolean {
    return props.state.selectedTagIds.value.has(tagId)
}

function onChipClick(tag: Tag): void {
    if (!isSelected(tag.tagId) && props.state.totalCount.value >= props.maxPerUser) {
        push.warning(`最多只能選 ${props.maxPerUser} 個 TAG`)
        return
    }
    props.state.toggle(tag.tagId)
}

function onAddCustom(type: TagType): void {
    const content = newInputByType.value[type].trim()
    if (!content) return
    if (props.state.totalCount.value >= props.maxPerUser) {
        push.warning(`最多只能選 ${props.maxPerUser} 個 TAG`)
        return
    }
    props.state.addCustom(type, content)
    newInputByType.value[type] = ''
}

function chipsInRowForHeader(type: TagType): string[] {
    const selected: string[] = chipsForType(type)
        .filter(t => isSelected(t.tagId))
        .map(t => t.content)
    const newCustoms = props.state.newCustomTags.value.get(type) ?? []
    return [...selected, ...newCustoms]
}

const counterClass = computed(() => ({
    'tag-editor-modal__counter--warn': props.state.totalCount.value >= props.maxPerUser,
}))
</script>

<template>
  <Transition name="settings-modal">
    <div v-if="open" class="tag-editor-modal" @click="emit('close')">
      <div class="tag-editor-modal__panel" @click.stop>
        <div class="tag-editor-modal__header">
          <span>
            <span class="tag-editor-modal__title">編輯 TAG</span>
            <span
              class="tag-editor-modal__counter"
              :class="counterClass"
              data-test="counter"
            >已選 {{ state.totalCount.value }} / {{ maxPerUser }}</span>
          </span>
          <button
            type="button"
            class="tag-editor-modal__close"
            aria-label="close"
            data-test="close-btn"
            @click="emit('close')"
          >&#x2715;</button>
        </div>
        <div class="tag-editor-modal__body">
          <div
            v-for="type in TAG_TYPE_ORDER"
            :key="type"
            class="tag-editor-modal__row"
          >
            <div
              class="tag-editor-modal__row-head"
              :class="{ 'tag-editor-modal__row-head--open': expanded === type }"
              :data-test="`row-head-${type}`"
              @click="toggleExpand(type)"
            >
              <span class="tag-editor-modal__row-label">
                <span
                  class="tag-editor-modal__caret"
                  :class="{ 'tag-editor-modal__caret--open': expanded === type }"
                >▶</span>
                {{ TAG_TYPE_LABEL[type] }}
              </span>
              <div class="tag-editor-modal__inline-chips">
                <span
                  v-for="content in chipsInRowForHeader(type)"
                  :key="content"
                  class="tag-editor-modal__chip-mini"
                >{{ content }}</span>
              </div>
            </div>
            <div v-if="expanded === type" class="tag-editor-modal__row-body">
              <input
                v-model="searchByType[type]"
                class="tag-editor-modal__search"
                :placeholder="`搜尋${TAG_TYPE_LABEL[type]}...`"
              />
              <div class="tag-editor-modal__chips">
                <span
                  v-for="tag in filteredChips(type)"
                  :key="tag.tagId"
                  :data-test="`chip-${tag.tagId}`"
                  class="tag-editor-modal__chip"
                  :class="{ 'tag-editor-modal__chip--selected': isSelected(tag.tagId) }"
                  @click="onChipClick(tag)"
                >{{ tag.content }}{{ isSelected(tag.tagId) ? ' ✓' : '' }}</span>
              </div>
              <div class="tag-editor-modal__add-row">
                <input
                  v-model="newInputByType[type]"
                  :placeholder="`輸入新的${TAG_TYPE_LABEL[type]}...`"
                  :data-test="`add-input-${type}`"
                  maxlength="30"
                  @keydown.enter="onAddCustom(type)"
                />
                <button
                  type="button"
                  :data-test="`add-btn-${type}`"
                  @click="onAddCustom(type)"
                >＋ 新增</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>
