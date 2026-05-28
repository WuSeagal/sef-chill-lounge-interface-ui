import { ref, computed, watch, type Ref, type ComputedRef } from 'vue'
import {
    TagType,
    type Tag,
    TAG_TYPE_PREFIX,
    TAG_TYPE_SECOND_CHAR,
    TAG_TYPE_ORDER,
} from '@/types/user'

export interface AutofillerOption {
    type: TagType
    prefix: string
    content: string
    fullText: string
    tagId: string
}

export interface UseChatAutofiller {
    options: ComputedRef<AutofillerOption[]>
    focusedIndex: Ref<number>
    isOpen: ComputedRef<boolean>
    onKeydown(event: KeyboardEvent, onSelect?: (opt: AutofillerOption) => void): boolean
    select(option: AutofillerOption): string
}

export function useChatAutofiller(
    inputValue: Ref<string>,
    userTags: Ref<Tag[]>,
): UseChatAutofiller {
    const focusedIndex = ref(0)

    const options = computed<AutofillerOption[]>(() => {
        const v = inputValue.value
        if (v.length === 0 || v.length > 2) return []
        if (v[0] !== '我') return []

        if (v === '我') {
            return userTags.value
                .filter(t => t.type !== TagType.CUSTOM && TAG_TYPE_PREFIX[t.type])
                .slice()
                .sort((a, b) => TAG_TYPE_ORDER.indexOf(a.type) - TAG_TYPE_ORDER.indexOf(b.type))
                .map(t => ({
                    type: t.type,
                    prefix: TAG_TYPE_PREFIX[t.type]!,
                    content: t.content,
                    fullText: `${TAG_TYPE_PREFIX[t.type]} ${t.content}`,
                    tagId: t.tagId,
                }))
        }

        const x = v[1]
        const matchedType = (Object.entries(TAG_TYPE_SECOND_CHAR) as Array<[TagType, string]>)
            .find(([, c]) => c === x)?.[0]
        if (!matchedType) return []

        return userTags.value
            .filter(t => t.type === matchedType)
            .map(t => ({
                type: t.type,
                prefix: TAG_TYPE_PREFIX[t.type]!,
                content: t.content,
                fullText: `${TAG_TYPE_PREFIX[t.type]} ${t.content}`,
                tagId: t.tagId,
            }))
    })

    const isOpen = computed(() => options.value.length > 0)

    watch(options, () => {
        focusedIndex.value = 0
    }, { flush: 'sync' })

    function onKeydown(event: KeyboardEvent, onSelect?: (opt: AutofillerOption) => void): boolean {
        if (!isOpen.value) return false
        if (event.key === 'ArrowDown') {
            event.preventDefault()
            focusedIndex.value = (focusedIndex.value + 1) % options.value.length
            return true
        }
        if (event.key === 'ArrowUp') {
            event.preventDefault()
            focusedIndex.value = (focusedIndex.value - 1 + options.value.length) % options.value.length
            return true
        }
        if (event.key === 'Enter') {
            event.preventDefault()
            const focused = options.value[focusedIndex.value]
            if (focused && onSelect) onSelect(focused)
            return true
        }
        if (event.key === 'Escape') {
            event.preventDefault()
            return true
        }
        return false
    }

    function select(option: AutofillerOption): string {
        return `${option.fullText} `
    }

    return { options, focusedIndex, isOpen, onKeydown, select }
}
