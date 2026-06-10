import { TagType, TAG_TYPE_ORDER, type GroupedTags, type Tag } from '@/types/user'

export interface ResolveDisplayTagsParams {
    /** 使用者目前已選/持有的 tagId 集合（由 useTagEditorState.selectedTagIds 種自 profile.tags）。 */
    selectedTagIds: Set<string>
    /** 尚未存檔的新自訂 TAG（型別 → content[]）。 */
    newCustomTags: Map<TagType, string[]>
    /** 可挑選池（GET /tags，已套 threshold 過濾）。 */
    selectable: GroupedTags
    /** 使用者實際持有清單（profile.tags，未過濾）——含未達標但已持有的 custom TAG。 */
    held: Tag[]
}

/**
 * 把「已選 tagId + staged 新 custom」解析成可顯示的 Tag[]（依 TAG_TYPE_ORDER 分型別排序）。
 *
 * 關鍵：tagId → Tag 的查找表同時來自 `held` 與 `selectable`，且 `held` 優先——
 * 這樣「持有但未達標」（不在 selectable）的 custom TAG 仍能被解析出來顯示，
 * 修正 B 修好 threshold 後前端只認 selectable 造成的顯示缺口（design D7）。
 */
export function resolveDisplayTags(params: ResolveDisplayTagsParams): Tag[] {
    const { selectedTagIds, newCustomTags, selectable, held } = params

    // 查找表：held 先寫（未達標持有的權威來源），selectable 補上其餘；同 tagId 不覆蓋（去重）
    const lookup = new Map<string, Tag>()
    for (const tag of held) {
        if (!lookup.has(tag.tagId)) lookup.set(tag.tagId, tag)
    }
    for (const type of TAG_TYPE_ORDER) {
        for (const tag of selectable[type] ?? []) {
            if (!lookup.has(tag.tagId)) lookup.set(tag.tagId, tag)
        }
    }

    // 已選的 Tag 依型別歸位
    const byType: Record<TagType, Tag[]> = {
        [TagType.ROLE]: [],
        [TagType.LANGUAGE]: [],
        [TagType.FRAMEWORK]: [],
        [TagType.DATABASE]: [],
        [TagType.DEVOPS]: [],
        [TagType.CUSTOM]: [],
    }
    for (const id of selectedTagIds) {
        const tag = lookup.get(id)
        if (tag && byType[tag.type]) byType[tag.type].push(tag)
    }

    const result: Tag[] = []
    for (const type of TAG_TYPE_ORDER) {
        result.push(...byType[type])
        for (const content of newCustomTags.get(type) ?? []) {
            // 新自訂 tag 尚未存檔、後端還沒配發真 tagId，先用合成 client-only key（存檔後由真 id 取代）
            result.push({ tagId: `__new__${type}__${content}`, type, content, isCustom: true })
        }
    }
    return result
}
