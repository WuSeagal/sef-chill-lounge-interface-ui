import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TagEditorPreview from '@/components/TagEditorPreview.vue'
import { TagType, type Tag } from '@/types/user'

const t = (id: string, type: TagType, content: string): Tag =>
    ({ tagId: id, type, content, isCustom: false })

describe('TagEditorPreview', () => {
    it('依 TAG_TYPE_ORDER 渲染 6 行,前 5 行有 label,自訂無 label', () => {
        const wrapper = mount(TagEditorPreview, {
            props: {
                tags: [
                    t('t-1', TagType.LANGUAGE, 'Java'),
                    t('t-2', TagType.ROLE, '後端工程師'),
                    t('t-3', TagType.CUSTOM, '露營'),
                ],
            },
        })
        const rows = wrapper.findAll('[data-test="tag-row"]')
        expect(rows).toHaveLength(6)
        const labels = wrapper.findAll('[data-test="tag-row-label"]')
        expect(labels).toHaveLength(5)
        expect(labels[0].text()).toBe('我是')
        expect(labels[1].text()).toBe('我寫')
        expect(labels[2].text()).toBe('我用')
        expect(labels[3].text()).toBe('我存')
        expect(labels[4].text()).toBe('我會')
    })

    it('emit 編輯事件', async () => {
        const wrapper = mount(TagEditorPreview, { props: { tags: [] } })
        await wrapper.find('[data-test="edit-button"]').trigger('click')
        expect(wrapper.emitted('edit')).toBeTruthy()
    })

    it('chip 顯示 content', () => {
        const wrapper = mount(TagEditorPreview, {
            props: { tags: [t('t-1', TagType.LANGUAGE, 'Java')] },
        })
        expect(wrapper.text()).toContain('Java')
    })

    it('依 type 把 tag 分到對應 row', () => {
        const wrapper = mount(TagEditorPreview, {
            props: {
                tags: [
                    t('t-1', TagType.LANGUAGE, 'Java'),
                    t('t-2', TagType.LANGUAGE, 'TypeScript'),
                    t('t-3', TagType.CUSTOM, '露營'),
                ],
            },
        })
        const rows = wrapper.findAll('[data-test="tag-row"]')
        // LANGUAGE 是 ORDER 第 2(idx 1) → 2 個 chip
        expect(rows[1].findAll('.tag-editor-preview__chip')).toHaveLength(2)
        // CUSTOM 是 ORDER 第 6(idx 5) → 1 個 chip
        expect(rows[5].findAll('.tag-editor-preview__chip')).toHaveLength(1)
        // 其他 row 為空
        expect(rows[0].findAll('.tag-editor-preview__chip')).toHaveLength(0)
    })
})
