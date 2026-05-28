import { ref, computed, type Ref, type ComputedRef } from 'vue'
import { TagType, type Tag } from '@/types/user'

export interface UseTagEditorStateOptions {
    maxPerUser: number
}

export interface UseTagEditorStateReturn {
    selectedTagIds: Ref<Set<string>>
    newCustomTags: Ref<Map<TagType, string[]>>
    totalCount: ComputedRef<number>
    isOverLimit: ComputedRef<boolean>
    isDirty: ComputedRef<boolean>
    reset(tags: Tag[]): void
    toggle(tagId: string): void
    addCustom(type: TagType, content: string): void
    removeCustom(type: TagType, content: string): void
    diff(currentTags: Tag[]): {
        toAdd: string[]
        toRemove: string[]
        toCreate: Array<{ type: TagType; content: string }>
    }
}

export function useTagEditorState(opts: UseTagEditorStateOptions): UseTagEditorStateReturn {
    const initialIds = ref<Set<string>>(new Set())
    const selectedTagIds = ref<Set<string>>(new Set())
    const newCustomTags = ref<Map<TagType, string[]>>(new Map())

    const totalCount = computed(() => {
        let n = selectedTagIds.value.size
        for (const arr of newCustomTags.value.values()) n += arr.length
        return n
    })
    const isOverLimit = computed(() => totalCount.value > opts.maxPerUser)
    const isDirty = computed(() => {
        for (const arr of newCustomTags.value.values()) {
            if (arr.length > 0) return true
        }
        if (selectedTagIds.value.size !== initialIds.value.size) return true
        for (const id of selectedTagIds.value) {
            if (!initialIds.value.has(id)) return true
        }
        return false
    })

    function reset(tags: Tag[]): void {
        const ids = new Set(tags.map(t => t.tagId))
        initialIds.value = new Set(ids)
        selectedTagIds.value = new Set(ids)
        newCustomTags.value = new Map()
    }
    function toggle(tagId: string): void {
        const next = new Set(selectedTagIds.value)
        if (next.has(tagId)) next.delete(tagId)
        else next.add(tagId)
        selectedTagIds.value = next
    }
    function addCustom(type: TagType, content: string): void {
        const trimmed = content.trim()
        if (!trimmed) return
        const arr = newCustomTags.value.get(type) ?? []
        if (arr.includes(trimmed)) return
        const next = new Map(newCustomTags.value)
        next.set(type, [...arr, trimmed])
        newCustomTags.value = next
    }
    function removeCustom(type: TagType, content: string): void {
        const arr = newCustomTags.value.get(type)
        if (!arr) return
        const next = new Map(newCustomTags.value)
        next.set(type, arr.filter(c => c !== content))
        newCustomTags.value = next
    }
    function diff(currentTags: Tag[]): {
        toAdd: string[]
        toRemove: string[]
        toCreate: Array<{ type: TagType; content: string }>
    } {
        const current = new Set(currentTags.map(t => t.tagId))
        const toAdd = [...selectedTagIds.value].filter(id => !current.has(id))
        const toRemove = [...current].filter(id => !selectedTagIds.value.has(id))
        const toCreate: Array<{ type: TagType; content: string }> = []
        for (const [type, arr] of newCustomTags.value) {
            for (const content of arr) toCreate.push({ type, content })
        }
        return { toAdd, toRemove, toCreate }
    }

    return {
        selectedTagIds, newCustomTags, totalCount, isOverLimit, isDirty,
        reset, toggle, addCustom, removeCustom, diff,
    }
}
