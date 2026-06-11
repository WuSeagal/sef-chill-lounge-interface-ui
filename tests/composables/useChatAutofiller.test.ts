import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'
import { useChatAutofiller, type MentionOption, type AutofillerOption } from '@/composables/useChatAutofiller'
import { TagType, type Tag, type Member } from '@/types/user'

const tags: Tag[] = [
    { tagId: 't-1', type: TagType.LANGUAGE, content: 'Java', isCustom: false },
    { tagId: 't-2', type: TagType.LANGUAGE, content: 'TypeScript', isCustom: false },
    { tagId: 't-3', type: TagType.ROLE, content: '後端工程師', isCustom: false },
    { tagId: 't-4', type: TagType.CUSTOM, content: '露營', isCustom: true },
]

const members: Member[] = [
    { userId: 'u-1', username: 'lizard', furName: '小蜥蜴', avatar: 'a1.png', avatarColor: '#abc' },
    { userId: 'u-2', username: 'cat', furName: '小貓', avatar: null, avatarColor: null },
    { userId: 'u-3', username: 'dog', furName: '大狗', avatar: null, avatarColor: null },
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

    it('TAG select 回傳整串取代結果與新 caret(含後置空格)', () => {
        const input = ref('我')
        const af = useChatAutofiller(input, ref(tags))
        const result = af.select(af.options.value[0])
        expect(result).toEqual({ value: '我是 後端工程師 ', caret: '我是 後端工程師 '.length })
    })

    it('TAG option 帶 kind: "tag"', () => {
        const input = ref('我')
        const af = useChatAutofiller(input, ref(tags))
        expect(af.options.value[0].kind).toBe('tag')
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

    it('dismiss() 關閉 popup（isOpen 變 false）', () => {
        const input = ref('我')
        const af = useChatAutofiller(input, ref(tags))
        expect(af.isOpen.value).toBe(true)
        af.dismiss()
        expect(af.isOpen.value).toBe(false)
    })

    it('dismiss 後 inputValue 變動即恢復', async () => {
        const input = ref('我')
        const af = useChatAutofiller(input, ref(tags))
        af.dismiss()
        expect(af.isOpen.value).toBe(false)
        input.value = '我寫'
        await Promise.resolve()
        expect(af.isOpen.value).toBe(true)
    })

    it('Tab 與 Enter 一樣插入 focused 選項並回 true', () => {
        const input = ref('我')
        const af = useChatAutofiller(input, ref(tags))
        let picked: AutofillerOption | null = null
        const evt = new KeyboardEvent('keydown', { key: 'Tab' })
        const prevented = vi.spyOn(evt, 'preventDefault')
        const handled = af.onKeydown(evt, (opt) => { picked = opt })
        expect(handled).toBe(true)
        expect(prevented).toHaveBeenCalled()
        expect(picked).not.toBeNull()
        expect((picked as unknown as { fullText: string }).fullText).toBe('我是 後端工程師')
    })

    it('popup 未開時 Tab 不攔截（回 false，保留原本 tab 行為）', () => {
        const input = ref('哈囉')
        const af = useChatAutofiller(input, ref(tags))
        const handled = af.onKeydown(new KeyboardEvent('keydown', { key: 'Tab' }))
        expect(handled).toBe(false)
    })

    it('Escape 回 true 並 dismiss 使 isOpen 變 false', () => {
        const input = ref('我')
        const af = useChatAutofiller(input, ref(tags))
        expect(af.isOpen.value).toBe(true)
        const handled = af.onKeydown(new KeyboardEvent('keydown', { key: 'Escape' }))
        expect(handled).toBe(true)
        expect(af.isOpen.value).toBe(false)
    })

    it('Esc dismiss 後 inputValue 變動即恢復', async () => {
        const input = ref('我')
        const af = useChatAutofiller(input, ref(tags))
        af.onKeydown(new KeyboardEvent('keydown', { key: 'Escape' }))
        expect(af.isOpen.value).toBe(false)
        input.value = '我寫'
        await Promise.resolve()
        expect(af.isOpen.value).toBe(true)
    })
})

describe('useChatAutofiller — @mention 模式（caret-aware）', () => {
    function setup(value: string, caret = value.length) {
        const input = ref(value)
        const caretIndex = ref(caret)
        const af = useChatAutofiller(input, ref(tags), ref(members), caretIndex)
        return { input, caretIndex, af }
    }

    it('caret 緊接行首 @ 後 → 列全部 members（kind: mention）', () => {
        const { af } = setup('@')
        expect(af.options.value).toHaveLength(3)
        expect(af.options.value.every(o => o.kind === 'mention')).toBe(true)
        expect((af.options.value[0] as MentionOption).furName).toBe('小蜥蜴')
        expect(af.isOpen.value).toBe(true)
    })

    it('空白後的 @ 也觸發', () => {
        const { af } = setup('哈囉 @')
        expect(af.options.value).toHaveLength(3)
    })

    it('query 以 furName case-insensitive substring 過濾', () => {
        const { af } = setup('@小')
        expect(af.options.value.map(o => (o as MentionOption).furName)).toEqual(['小蜥蜴', '小貓'])
    })

    it('無命中 → 不顯示', () => {
        const { af } = setup('@zzz')
        expect(af.options.value).toHaveLength(0)
        expect(af.isOpen.value).toBe(false)
    })

    it('@ 前非空白不觸發（email@ex）', () => {
        const { af } = setup('email@ex')
        expect(af.options.value).toHaveLength(0)
    })

    it('「我@」不觸發 mention（@ 前是「我」非空白）', () => {
        const { af } = setup('我@')
        expect(af.options.value).toHaveLength(0)
    })

    it('不提供 @all / @everyone 群體候選', () => {
        const { af } = setup('@all')
        expect(af.options.value.some(o => (o as MentionOption).furName?.toLowerCase() === 'all')).toBe(false)
        expect(af.options.value.some(o => (o as MentionOption).furName?.toLowerCase() === 'everyone')).toBe(false)
    })

    it('尾端 select：取代 @token 為 @furName + 空格，caret 落在插入後', () => {
        const { af } = setup('哈囉 @小')
        const lizard = af.options.value.find(o => (o as MentionOption).furName === '小蜥蜴')!
        const result = af.select(lizard)
        expect(result.value).toBe('哈囉 @小蜥蜴 ')
        expect(result.caret).toBe('哈囉 @小蜥蜴 '.length)
    })

    it('中段 select：caret 在「@小」後、取代後尾段保留', () => {
        // 「哈囉 @小 你好」caret 在「@小」之後(index 5)
        const { af } = setup('哈囉 @小 你好', 5)
        const lizard = af.options.value.find(o => (o as MentionOption).furName === '小蜥蜴')!
        const result = af.select(lizard)
        expect(result.value).toBe('哈囉 @小蜥蜴  你好')
        expect(result.caret).toBe('哈囉 @小蜥蜴 '.length)
    })

    it('mention popup 觸發以中段 caret 前的 query 過濾', () => {
        const { af } = setup('哈囉 @小 你好', 5)
        expect(af.options.value.map(o => (o as MentionOption).furName)).toEqual(['小蜥蜴', '小貓'])
    })
})
