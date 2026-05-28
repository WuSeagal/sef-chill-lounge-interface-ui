import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AutofillerPopup from '@/components/AutofillerPopup.vue'
import { TagType } from '@/types/user'

const opts = [
    { type: TagType.LANGUAGE, prefix: '我寫', content: 'Java', fullText: '我寫 Java', tagId: 't-1' },
    { type: TagType.ROLE, prefix: '我是', content: '後端工程師', fullText: '我是 後端工程師', tagId: 't-2' },
]

describe('AutofillerPopup', () => {
    it('open=true 時顯示 options', () => {
        const w = mount(AutofillerPopup, { props: { open: true, options: opts, focusedIndex: 0 } })
        expect(w.find('[data-test=autofiller-popup]').exists()).toBe(true)
        expect(w.text()).toContain('Java')
        expect(w.text()).toContain('後端工程師')
    })

    it('open=false 不渲染', () => {
        const w = mount(AutofillerPopup, { props: { open: false, options: opts, focusedIndex: 0 } })
        expect(w.find('.autofiller-popup').exists()).toBe(false)
    })

    it('focus 樣式套到對應 index', () => {
        const w = mount(AutofillerPopup, { props: { open: true, options: opts, focusedIndex: 1 } })
        const items = w.findAll('.autofiller-popup__option')
        expect(items[0].classes()).not.toContain('autofiller-popup__option--focus')
        expect(items[1].classes()).toContain('autofiller-popup__option--focus')
    })

    it('mousedown emit select(用 prevent 避免 textarea 失焦)', async () => {
        const w = mount(AutofillerPopup, { props: { open: true, options: opts, focusedIndex: 0 } })
        await w.find('[data-test=af-option-t-1]').trigger('mousedown')
        expect(w.emitted('select')?.[0]?.[0]).toEqual(opts[0])
    })

    it('options 為空時不渲染 row', () => {
        const w = mount(AutofillerPopup, { props: { open: true, options: [], focusedIndex: 0 } })
        expect(w.findAll('.autofiller-popup__option')).toHaveLength(0)
    })
})
