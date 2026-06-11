import { ref, computed, watch, type Ref, type ComputedRef } from 'vue'
import {
    TagType,
    type Tag,
    type Member,
    TAG_TYPE_PREFIX,
    TAG_TYPE_SECOND_CHAR,
    TAG_TYPE_ORDER,
} from '@/types/user'

export interface TagOption {
    kind: 'tag'
    type: TagType
    prefix: string
    content: string
    fullText: string
    tagId: string
}

export interface MentionOption {
    kind: 'mention'
    userId: string
    furName: string
    avatar: string | null
    avatarColor: string | null
}

export type AutofillerOption = TagOption | MentionOption

/** select() 回傳：取代後完整輸入字串與新游標位置。 */
export interface SelectResult {
    value: string
    caret: number
}

export interface UseChatAutofiller {
    options: ComputedRef<AutofillerOption[]>
    focusedIndex: Ref<number>
    isOpen: ComputedRef<boolean>
    onKeydown(event: KeyboardEvent, onSelect?: (opt: AutofillerOption) => void): boolean
    select(option: AutofillerOption): SelectResult
    dismiss(): void
}

/** 對 caret 之前的文字找最近的 @ mention token；回傳 { at, query } 或 null。 */
function findMentionToken(value: string, caret: number): { at: number; query: string } | null {
    const before = value.slice(0, Math.max(0, Math.min(caret, value.length)))
    const at = before.lastIndexOf('@')
    if (at === -1) return null
    const prevChar = at === 0 ? '' : before[at - 1]
    // @ 前一字元須為字串開頭或空白
    if (at !== 0 && !/\s/.test(prevChar)) return null
    const query = before.slice(at + 1)
    // @ 到 caret 之間不含空白
    if (/\s/.test(query)) return null
    return { at, query }
}

export function useChatAutofiller(
    inputValue: Ref<string>,
    userTags: Ref<Tag[]>,
    members: Ref<Member[]> = ref([]),
    caretIndex: Ref<number> = ref(0),
): UseChatAutofiller {
    const focusedIndex = ref(0)
    const dismissed = ref(false)

    const tagOptions = computed<TagOption[]>(() => {
        const v = inputValue.value
        if (v.length === 0 || v.length > 2) return []
        if (v[0] !== '我') return []

        const toOption = (t: Tag): TagOption => ({
            kind: 'tag',
            type: t.type,
            prefix: TAG_TYPE_PREFIX[t.type]!,
            content: t.content,
            fullText: `${TAG_TYPE_PREFIX[t.type]} ${t.content}`,
            tagId: t.tagId,
        })

        if (v === '我') {
            return userTags.value
                .filter(t => t.type !== TagType.CUSTOM && TAG_TYPE_PREFIX[t.type])
                .slice()
                .sort((a, b) => TAG_TYPE_ORDER.indexOf(a.type) - TAG_TYPE_ORDER.indexOf(b.type))
                .map(toOption)
        }

        const x = v[1]
        const matchedType = (Object.entries(TAG_TYPE_SECOND_CHAR) as Array<[TagType, string]>)
            .find(([, c]) => c === x)?.[0]
        if (!matchedType) return []

        return userTags.value.filter(t => t.type === matchedType).map(toOption)
    })

    const mentionOptions = computed<MentionOption[]>(() => {
        const token = findMentionToken(inputValue.value, caretIndex.value)
        if (!token) return []
        const query = token.query.toLowerCase()
        return members.value
            .filter((m): m is Member & { furName: string } => Boolean(m.furName))
            .filter(m => m.furName.toLowerCase().includes(query))
            .map(m => ({
                kind: 'mention',
                userId: m.userId,
                furName: m.furName,
                avatar: m.avatar,
                avatarColor: m.avatarColor,
            }))
    })

    // mention 與 TAG 觸發條件天然互斥；mention 優先。
    const options = computed<AutofillerOption[]>(() =>
        mentionOptions.value.length > 0 ? mentionOptions.value : tagOptions.value,
    )

    const isOpen = computed(() => options.value.length > 0 && !dismissed.value)

    watch(options, () => {
        focusedIndex.value = 0
    }, { flush: 'sync' })

    watch(inputValue, () => {
        dismissed.value = false
    })

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
        // Enter 與 Tab 皆插入 focused 選項（popup 開啟時 Tab 不跳焦點、改為確認補完）。
        if (event.key === 'Enter' || event.key === 'Tab') {
            event.preventDefault()
            const focused = options.value[focusedIndex.value]
            if (focused && onSelect) onSelect(focused)
            return true
        }
        if (event.key === 'Escape') {
            event.preventDefault()
            dismissed.value = true
            return true
        }
        return false
    }

    function select(option: AutofillerOption): SelectResult {
        if (option.kind === 'mention') {
            const value = inputValue.value
            const caret = Math.max(0, Math.min(caretIndex.value, value.length))
            const at = value.slice(0, caret).lastIndexOf('@')
            const insert = `@${option.furName} `
            const newValue = value.slice(0, at) + insert + value.slice(caret)
            return { value: newValue, caret: at + insert.length }
        }
        const value = `${option.fullText} `
        return { value, caret: value.length }
    }

    // 點外部 / 失焦時關閉 popup（inputValue 變動時會自動恢復，與 Esc 同一 dismissed 機制）。
    function dismiss(): void {
        dismissed.value = true
    }

    return { options, focusedIndex, isOpen, onKeydown, select, dismiss }
}
