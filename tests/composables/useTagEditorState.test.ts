import { describe, it, expect } from 'vitest'
import { useTagEditorState } from '@/composables/useTagEditorState'
import { TagType, type Tag } from '@/types/user'

const tag = (id: string, type: TagType, content: string, isCustom = false): Tag =>
    ({ tagId: id, type, content, isCustom })

describe('useTagEditorState', () => {
    it('reset 初始化 selected = current tags', () => {
        const s = useTagEditorState({ maxPerUser: 20 })
        s.reset([
            tag('t-1', TagType.LANGUAGE, 'Java'),
            tag('t-2', TagType.ROLE, '後端工程師'),
        ])
        expect(s.selectedTagIds.value).toEqual(new Set(['t-1', 't-2']))
        expect(s.totalCount.value).toBe(2)
        expect(s.isDirty.value).toBe(false)
    })

    it('toggle 新增/移除 default tag', () => {
        const s = useTagEditorState({ maxPerUser: 20 })
        s.reset([])
        s.toggle('t-1')
        expect(s.selectedTagIds.value.has('t-1')).toBe(true)
        expect(s.isDirty.value).toBe(true)
        s.toggle('t-1')
        expect(s.selectedTagIds.value.has('t-1')).toBe(false)
        expect(s.isDirty.value).toBe(false)
    })

    it('addCustom 累積新 custom string,trim 後存,重複略過', () => {
        const s = useTagEditorState({ maxPerUser: 20 })
        s.reset([])
        s.addCustom(TagType.CUSTOM, '露營')
        s.addCustom(TagType.CUSTOM, '  機械鍵盤  ')
        s.addCustom(TagType.CUSTOM, '露營') // 重複
        s.addCustom(TagType.LANGUAGE, 'Zig')
        expect(s.newCustomTags.value.get(TagType.CUSTOM)).toEqual(['露營', '機械鍵盤'])
        expect(s.newCustomTags.value.get(TagType.LANGUAGE)).toEqual(['Zig'])
        expect(s.totalCount.value).toBe(3)
    })

    it('removeCustom 從 newCustom 移除', () => {
        const s = useTagEditorState({ maxPerUser: 20 })
        s.reset([])
        s.addCustom(TagType.CUSTOM, '露營')
        s.removeCustom(TagType.CUSTOM, '露營')
        expect(s.newCustomTags.value.get(TagType.CUSTOM) ?? []).toEqual([])
    })

    it('totalCount 與 isOverLimit 反應正確', () => {
        const s = useTagEditorState({ maxPerUser: 3 })
        s.reset([tag('t-1', TagType.LANGUAGE, 'Java')])
        s.toggle('t-2')
        s.toggle('t-3')
        expect(s.totalCount.value).toBe(3)
        expect(s.isOverLimit.value).toBe(false)
        s.toggle('t-4')
        expect(s.totalCount.value).toBe(4)
        expect(s.isOverLimit.value).toBe(true)
    })

    it('diff 正確分類 toAdd / toRemove / toCreate', () => {
        const s = useTagEditorState({ maxPerUser: 20 })
        const initial = [
            tag('t-1', TagType.LANGUAGE, 'Java'),
            tag('t-2', TagType.ROLE, '後端工程師'),
        ]
        s.reset(initial)
        s.toggle('t-2')                                // remove t-2
        s.toggle('t-3')                                // add t-3
        s.addCustom(TagType.CUSTOM, '露營')             // create

        const d = s.diff(initial)
        expect(d.toAdd).toEqual(['t-3'])
        expect(d.toRemove).toEqual(['t-2'])
        expect(d.toCreate).toEqual([{ type: TagType.CUSTOM, content: '露營' }])
    })
})
