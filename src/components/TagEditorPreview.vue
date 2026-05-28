<script setup lang="ts">
import { computed } from 'vue'
import './TagEditorPreview.css'
import {
    TagType, TAG_TYPE_ORDER, TAG_TYPE_PREFIX, type Tag,
} from '@/types/user'

const props = defineProps<{ tags: Tag[] }>()
defineEmits<{ (e: 'edit'): void }>()

const grouped = computed<Record<TagType, Tag[]>>(() => {
    const acc: Record<TagType, Tag[]> = {
        [TagType.ROLE]: [], [TagType.LANGUAGE]: [], [TagType.FRAMEWORK]: [],
        [TagType.DATABASE]: [], [TagType.DEVOPS]: [], [TagType.CUSTOM]: [],
    }
    for (const t of props.tags) {
        if (acc[t.type]) acc[t.type].push(t)
    }
    return acc
})
</script>

<template>
  <div class="tag-editor-preview">
    <span class="tag-editor-preview__title">TAG</span>
    <div
      v-for="type in TAG_TYPE_ORDER"
      :key="type"
      class="tag-editor-preview__row"
      :class="{ 'tag-editor-preview__row--custom': type === TagType.CUSTOM }"
      data-test="tag-row"
    >
      <span
        v-if="type !== TagType.CUSTOM"
        class="tag-editor-preview__label"
        data-test="tag-row-label"
      >{{ TAG_TYPE_PREFIX[type] }}</span>
      <div class="tag-editor-preview__chips">
        <span
          v-for="tag in grouped[type]"
          :key="tag.tagId"
          class="tag-editor-preview__chip"
        >{{ tag.content }}</span>
      </div>
    </div>
    <div class="tag-editor-preview__actions">
      <button
        type="button"
        class="tag-editor-preview__edit-btn"
        data-test="edit-button"
        @click="$emit('edit')"
      >編輯 TAG</button>
    </div>
  </div>
</template>
