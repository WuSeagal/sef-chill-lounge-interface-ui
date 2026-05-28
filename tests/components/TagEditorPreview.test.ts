import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TagEditorPreview from '@/components/TagEditorPreview.vue'
import { TagType, type Tag } from '@/types/user'

const t = (id: string, type: TagType, content: string): Tag =>
    ({ tagId: id, type, content, isCustom: false })

describe('TagEditorPreview', () => {
    it('只渲染有 tag 的 row,依 TAG_TYPE_ORDER;label 顯示「我X」前綴,自訂無 label', () => {
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
        expect(rows).toHaveLength(3)   // ROLE / LANGUAGE / CUSTOM
        const labels = wrapper.findAll('[data-test="tag-row-label"]')
        expect(labels).toHaveLength(2)   // CUSTOM 沒 label
        expect(labels[0].text()).toBe('我是')   // ROLE 在 TAG_TYPE_ORDER 第 1
        expect(labels[1].text()).toBe('我寫')   // LANGUAGE 第 2
    })

    it('完全沒 tag 時不渲染任何 row', () => {
        const wrapper = mount(TagEditorPreview, { props: { tags: [] } })
        expect(wrapper.findAll('[data-test="tag-row"]')).toHaveLength(0)
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

    it('依 type 把 tag 分到對應 row,空 type 不渲染', () => {
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
        expect(rows).toHaveLength(2)
        expect(rows[0].findAll('.tag-editor-preview__chip')).toHaveLength(2) // LANGUAGE
        expect(rows[1].findAll('.tag-editor-preview__chip')).toHaveLength(1) // CUSTOM
    })
})
