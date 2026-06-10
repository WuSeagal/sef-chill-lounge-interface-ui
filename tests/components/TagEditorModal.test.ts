import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import TagEditorModal from '@/components/TagEditorModal.vue'
import { useTagEditorState } from '@/composables/useTagEditorState'
import { TagType, type GroupedTags } from '@/types/user'

const warnSpy = vi.fn()
vi.mock('notivue', () => ({
    push: { warning: (msg: string) => warnSpy(msg) },
}))

const mockGrouped: GroupedTags = {
    [TagType.ROLE]: [{ tagId: 'r-1', type: TagType.ROLE, content: '後端工程師', isCustom: false }],
    [TagType.LANGUAGE]: [
        { tagId: 'l-1', type: TagType.LANGUAGE, content: 'Java', isCustom: false },
        { tagId: 'l-2', type: TagType.LANGUAGE, content: 'TypeScript', isCustom: false },
    ],
    [TagType.FRAMEWORK]: [],
    [TagType.DATABASE]: [],
    [TagType.DEVOPS]: [],
    [TagType.CUSTOM]: [{ tagId: 'c-1', type: TagType.CUSTOM, content: '露營', isCustom: true }],
}

describe('TagEditorModal', () => {
    beforeEach(() => {
        warnSpy.mockClear()
    })

    it('header 顯示計數', () => {
        const state = useTagEditorState({ maxPerUser: 20 })
        state.reset([])
        const wrapper = mount(TagEditorModal, {
            props: { open: true, selectable: mockGrouped, state, maxPerUser: 20 },
        })
        expect(wrapper.find('[data-test="counter"]').text()).toContain('0 / 20')
    })

    it('點 chip 切換 selected', async () => {
        const state = useTagEditorState({ maxPerUser: 20 })
        state.reset([])
        const wrapper = mount(TagEditorModal, {
            props: { open: true, selectable: mockGrouped, state, maxPerUser: 20 },
        })
        await wrapper.find('[data-test="row-head-LANGUAGE"]').trigger('click')
        await wrapper.find('[data-test="chip-l-1"]').trigger('click')
        expect(state.selectedTagIds.value.has('l-1')).toBe(true)
    })

    it('達上限點 chip 不變且觸發 toast', async () => {
        const state = useTagEditorState({ maxPerUser: 1 })
        state.reset([])
        state.toggle('r-1')
        const wrapper = mount(TagEditorModal, {
            props: { open: true, selectable: mockGrouped, state, maxPerUser: 1 },
        })
        await wrapper.find('[data-test="row-head-LANGUAGE"]').trigger('click')
        await wrapper.find('[data-test="chip-l-1"]').trigger('click')
        expect(state.selectedTagIds.value.has('l-1')).toBe(false)
        expect(warnSpy).toHaveBeenCalledWith('最多只能選 1 個 TAG')
    })

    it('已選 chip 達上限仍可取消(下行)', async () => {
        const state = useTagEditorState({ maxPerUser: 1 })
        state.reset([])
        state.toggle('r-1')   // 已 1 個
        const wrapper = mount(TagEditorModal, {
            props: { open: true, selectable: mockGrouped, state, maxPerUser: 1 },
        })
        await wrapper.find('[data-test="row-head-ROLE"]').trigger('click')
        await wrapper.find('[data-test="chip-r-1"]').trigger('click')
        expect(state.selectedTagIds.value.has('r-1')).toBe(false)
    })

    it('自加 custom tag 進 newCustomTags', async () => {
        const state = useTagEditorState({ maxPerUser: 20 })
        state.reset([])
        const wrapper = mount(TagEditorModal, {
            props: { open: true, selectable: mockGrouped, state, maxPerUser: 20 },
        })
        await wrapper.find('[data-test="row-head-LANGUAGE"]').trigger('click')
        const input = wrapper.find('[data-test="add-input-LANGUAGE"]')
        await input.setValue('Rust')
        await wrapper.find('[data-test="add-btn-LANGUAGE"]').trigger('click')
        expect(state.newCustomTags.value.get(TagType.LANGUAGE)).toEqual(['Rust'])
    })

    it('counter 達上限加 --warn 樣式', () => {
        const state = useTagEditorState({ maxPerUser: 1 })
        state.reset([])
        state.toggle('r-1')
        const wrapper = mount(TagEditorModal, {
            props: { open: true, selectable: mockGrouped, state, maxPerUser: 1 },
        })
        expect(wrapper.find('[data-test="counter"]').classes())
            .toContain('tag-editor-modal__counter--warn')
    })

    it('點 ✕ 發 close', async () => {
        const state = useTagEditorState({ maxPerUser: 20 })
        state.reset([])
        const wrapper = mount(TagEditorModal, {
            props: { open: true, selectable: mockGrouped, state, maxPerUser: 20 },
        })
        await wrapper.find('[data-test="close-btn"]').trigger('click')
        expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('open=false 時不渲染', () => {
        const state = useTagEditorState({ maxPerUser: 20 })
        state.reset([])
        const wrapper = mount(TagEditorModal, {
            props: { open: false, selectable: mockGrouped, state, maxPerUser: 20 },
        })
        expect(wrapper.find('.tag-editor-modal').exists()).toBe(false)
    })

    // ---- 持有但未達標 TAG 顯示（B 延伸 / design D7）----

    it('持有但不在 selectable 的未達標 custom 仍渲染為已選 chip', async () => {
        const heldUnderThreshold = { tagId: 'c-held', type: TagType.CUSTOM, content: '私房菜', isCustom: true }
        const state = useTagEditorState({ maxPerUser: 20 })
        state.reset([heldUnderThreshold]) // 已持有 → selectedTagIds 含 c-held
        const wrapper = mount(TagEditorModal, {
            props: { open: true, selectable: mockGrouped, state, maxPerUser: 20, held: [heldUnderThreshold] },
        })
        await wrapper.find('[data-test="row-head-CUSTOM"]').trigger('click')
        const chip = wrapper.find('[data-test="chip-c-held"]')
        expect(chip.exists()).toBe(true)
        expect(chip.classes()).toContain('tag-editor-modal__chip--selected')
    })

    it('持有但未達標的 custom chip 可點擊取消', async () => {
        const heldUnderThreshold = { tagId: 'c-held', type: TagType.CUSTOM, content: '私房菜', isCustom: true }
        const state = useTagEditorState({ maxPerUser: 20 })
        state.reset([heldUnderThreshold])
        const wrapper = mount(TagEditorModal, {
            props: { open: true, selectable: mockGrouped, state, maxPerUser: 20, held: [heldUnderThreshold] },
        })
        await wrapper.find('[data-test="row-head-CUSTOM"]').trigger('click')
        await wrapper.find('[data-test="chip-c-held"]').trigger('click')
        expect(state.selectedTagIds.value.has('c-held')).toBe(false)
    })

    it('剛新增的 staged custom 出現在可點 chips 清單、標為已選', async () => {
        const state = useTagEditorState({ maxPerUser: 20 })
        state.reset([])
        const wrapper = mount(TagEditorModal, {
            props: { open: true, selectable: mockGrouped, state, maxPerUser: 20 },
        })
        await wrapper.find('[data-test="row-head-CUSTOM"]').trigger('click')
        await wrapper.find('[data-test="add-input-CUSTOM"]').setValue('私房菜')
        await wrapper.find('[data-test="add-btn-CUSTOM"]').trigger('click')

        const chip = wrapper.find('[data-test="chip-__new__CUSTOM__私房菜"]')
        expect(chip.exists()).toBe(true)
        expect(chip.classes()).toContain('tag-editor-modal__chip--selected')
    })

    it('剛新增的 staged custom chip 可點擊移除（不必存檔重開）', async () => {
        const state = useTagEditorState({ maxPerUser: 20 })
        state.reset([])
        const wrapper = mount(TagEditorModal, {
            props: { open: true, selectable: mockGrouped, state, maxPerUser: 20 },
        })
        await wrapper.find('[data-test="row-head-CUSTOM"]').trigger('click')
        await wrapper.find('[data-test="add-input-CUSTOM"]').setValue('私房菜')
        await wrapper.find('[data-test="add-btn-CUSTOM"]').trigger('click')

        await wrapper.find('[data-test="chip-__new__CUSTOM__私房菜"]').trigger('click')
        expect(state.newCustomTags.value.get(TagType.CUSTOM) ?? []).not.toContain('私房菜')
    })
})
