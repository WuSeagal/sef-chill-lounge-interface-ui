import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useChatAutofiller } from '@/composables/useChatAutofiller'
import { TagType, type Tag } from '@/types/user'

const tags: Tag[] = [
    { tagId: 't-1', type: TagType.LANGUAGE, content: 'Java', isCustom: false },
    { tagId: 't-2', type: TagType.LANGUAGE, content: 'TypeScript', isCustom: false },
    { tagId: 't-3', type: TagType.ROLE, content: '後端工程師', isCustom: false },
    { tagId: 't-4', type: TagType.CUSTOM, content: '露營', isCustom: true },
]

describe('useChatAutofiller', () => {
    it('輸入「我」列出全部非 CUSTOM tag 對應的「我X content」', () => {
        const input = ref('我')
        const af = useChatAutofiller(input, ref(tags))
        expect(af.options.value).toHaveLength(3)
        expect(af.options.value.map(o => o.fullText)).toEqual([
            '我是 後端工程師', '我寫 Java', '我寫 TypeScript',
        ])
        expect(af.isOpen.value).toBe(true)
    })

    it('輸入「我寫」縮窄到 LANGUAGE', () => {
        const input = ref('我寫')
        const af = useChatAutofiller(input, ref(tags))
        expect(af.options.value.map(o => o.fullText)).toEqual([
            '我寫 Java', '我寫 TypeScript',
        ])
    })

    it('第 2 字非 5 個之一時不顯示', () => {
        const input = ref('我覺')
        const af = useChatAutofiller(input, ref(tags))
        expect(af.options.value).toHaveLength(0)
        expect(af.isOpen.value).toBe(false)
    })

    it('第 3 字以上不顯示', () => {
        const input = ref('我寫 J')
        const af = useChatAutofiller(input, ref(tags))
        expect(af.options.value).toHaveLength(0)
    })

    it('user 該 type 沒任何 tag 時不顯示', () => {
        const input = ref('我會')
        const af = useChatAutofiller(input, ref(tags))   // 沒 DEVOPS tag
        expect(af.options.value).toHaveLength(0)
    })

    it('純 CUSTOM tag 不出現在第 1 字 popup', () => {
        const input = ref('我')
        const af = useChatAutofiller(input, ref(tags))
        expect(af.options.value.map(o => o.content)).not.toContain('露營')
    })

    it('select 回傳要插入的字串(含後置空格)', () => {
        const input = ref('我')
        const af = useChatAutofiller(input, ref(tags))
        const inserted = af.select(af.options.value[0])
        expect(inserted).toBe('我是 後端工程師 ')
    })

    it('keydown ↓ 改 focusedIndex', () => {
        const input = ref('我')
        const af = useChatAutofiller(input, ref(tags))
        expect(af.focusedIndex.value).toBe(0)
        af.onKeydown(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
        expect(af.focusedIndex.value).toBe(1)
    })

    it('focusedIndex 不會超過 options 範圍(wrap)', () => {
        const input = ref('我寫')
        const af = useChatAutofiller(input, ref(tags))   // 2 個 options
        af.onKeydown(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
        af.onKeydown(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
        expect(af.focusedIndex.value).toBe(0)   // wrap to 0
    })

    it('options 變動後 focusedIndex 重置到 0', async () => {
        const input = ref('我寫')
        const af = useChatAutofiller(input, ref(tags))
        af.onKeydown(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
        expect(af.focusedIndex.value).toBe(1)
        input.value = '我'  // 變成 3 個 options
        // wait next tick for watch flush sync
        await Promise.resolve()
        expect(af.focusedIndex.value).toBe(0)
    })

    it('Enter 回呼 onSelect 並回 true', () => {
        const input = ref('我')
        const af = useChatAutofiller(input, ref(tags))
        let picked: any = null
        const handled = af.onKeydown(
            new KeyboardEvent('keydown', { key: 'Enter' }),
            (opt) => { picked = opt },
        )
        expect(handled).toBe(true)
        expect(picked.fullText).toBe('我是 後端工程師')
    })

    it('Escape 回 true 但不選', () => {
        const input = ref('我')
        const af = useChatAutofiller(input, ref(tags))
        const handled = af.onKeydown(
            new KeyboardEvent('keydown', { key: 'Escape' }),
        )
        expect(handled).toBe(true)
    })
})
