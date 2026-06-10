import { describe, it, expect } from 'vitest'
import { resolveDisplayTags } from '@/utils/tagDisplay'
import { TagType, type GroupedTags, type Tag } from '@/types/user'

function emptySelectable(): GroupedTags {
    return {
        [TagType.ROLE]: [],
        [TagType.LANGUAGE]: [],
        [TagType.FRAMEWORK]: [],
        [TagType.DATABASE]: [],
        [TagType.DEVOPS]: [],
        [TagType.CUSTOM]: [],
    }
}

describe('resolveDisplayTags', () => {
    it('持有但未達標（不在 selectable）的 TAG 仍出現在結果', () => {
        // 模擬 B 修好 threshold 後：未達標 custom 不在 selectable，但使用者已持有
        const held: Tag[] = [{ tagId: 'c-held', type: TagType.CUSTOM, content: '私房菜', isCustom: true }]
        const result = resolveDisplayTags({
            selectedTagIds: new Set(['c-held']),
            newCustomTags: new Map(),
            selectable: emptySelectable(),
            held,
        })
        expect(result.map(t => t.tagId)).toContain('c-held')
        expect(result.find(t => t.tagId === 'c-held')?.content).toBe('私房菜')
    })

    it('只回傳 selectedTagIds 內的（selectable 中未選者不回）', () => {
        const selectable = emptySelectable()
        selectable[TagType.LANGUAGE] = [
            { tagId: 'l-1', type: TagType.LANGUAGE, content: 'Java', isCustom: false },
            { tagId: 'l-2', type: TagType.LANGUAGE, content: 'TypeScript', isCustom: false },
        ]
        const result = resolveDisplayTags({
            selectedTagIds: new Set(['l-1']),
            newCustomTags: new Map(),
            selectable,
            held: [],
        })
        expect(result.map(t => t.tagId)).toEqual(['l-1'])
    })

    it('保留 TAG_TYPE_ORDER 型別順序（ROLE 在 CUSTOM 前）', () => {
        const selectable = emptySelectable()
        selectable[TagType.ROLE] = [{ tagId: 'r-1', type: TagType.ROLE, content: '後端', isCustom: false }]
        const held: Tag[] = [{ tagId: 'c-1', type: TagType.CUSTOM, content: '露營', isCustom: true }]
        const result = resolveDisplayTags({
            selectedTagIds: new Set(['c-1', 'r-1']),
            newCustomTags: new Map(),
            selectable,
            held,
        })
        expect(result.map(t => t.tagId)).toEqual(['r-1', 'c-1'])
    })

    it('附上 staged 新 custom（合成 __new__ id）', () => {
        const result = resolveDisplayTags({
            selectedTagIds: new Set(),
            newCustomTags: new Map([[TagType.CUSTOM, ['滑雪']]]),
            selectable: emptySelectable(),
            held: [],
        })
        expect(result).toEqual([
            { tagId: '__new__CUSTOM__滑雪', type: TagType.CUSTOM, content: '滑雪', isCustom: true },
        ])
    })

    it('selectable 與 held 同 tagId 不重複（去重）', () => {
        const selectable = emptySelectable()
        selectable[TagType.LANGUAGE] = [{ tagId: 'l-1', type: TagType.LANGUAGE, content: 'Java', isCustom: false }]
        const held: Tag[] = [{ tagId: 'l-1', type: TagType.LANGUAGE, content: 'Java', isCustom: false }]
        const result = resolveDisplayTags({
            selectedTagIds: new Set(['l-1']),
            newCustomTags: new Map(),
            selectable,
            held,
        })
        expect(result.filter(t => t.tagId === 'l-1')).toHaveLength(1)
    })
})
