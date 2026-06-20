import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { useFocusTrap } from '@/composables/useFocusTrap'

const Harness = defineComponent({
    setup() {
        const active = ref(false)
        const container = ref<HTMLElement | null>(null)
        useFocusTrap(container, active)
        return { active, container }
    },
    render() {
        return h('div', [
            h('button', { id: 'outside' }, 'outside'),
            this.active
                ? h('div', { ref: 'container', id: 'dialog', tabindex: '-1' }, [
                    h('button', { id: 'b1' }, 'b1'),
                    h('button', { id: 'b2' }, 'b2'),
                    h('button', { id: 'b3' }, 'b3'),
                ])
                : null,
        ])
    },
})

function tab(shift = false): void {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: shift, bubbles: true }))
}
function activeId(): string | undefined {
    return (document.activeElement as HTMLElement | null)?.id
}

describe('useFocusTrap', () => {
    afterEach(() => {
        document.body.innerHTML = ''
    })

    it('啟用時聚焦容器內第一個可聚焦元素', async () => {
        const wrapper = mount(Harness, { attachTo: document.body })
        wrapper.vm.active = true
        await flushPromises()
        expect(activeId()).toBe('b1')
        wrapper.unmount()
    })

    it('Tab 在最後一個元素時循環回第一個', async () => {
        const wrapper = mount(Harness, { attachTo: document.body })
        wrapper.vm.active = true
        await flushPromises()
        document.getElementById('b3')?.focus()
        tab(false)
        expect(activeId()).toBe('b1')
        wrapper.unmount()
    })

    it('Shift+Tab 在第一個元素時循環到最後一個', async () => {
        const wrapper = mount(Harness, { attachTo: document.body })
        wrapper.vm.active = true
        await flushPromises()
        document.getElementById('b1')?.focus()
        tab(true)
        expect(activeId()).toBe('b3')
        wrapper.unmount()
    })

    it('焦點在容器外時，Tab 拉回容器內第一個元素', async () => {
        const wrapper = mount(Harness, { attachTo: document.body })
        wrapper.vm.active = true
        await flushPromises()
        document.getElementById('outside')?.focus()
        tab(false)
        expect(activeId()).toBe('b1')
        wrapper.unmount()
    })

    it('停用時還原啟用前的焦點', async () => {
        const wrapper = mount(Harness, { attachTo: document.body })
        document.getElementById('outside')?.focus()
        expect(activeId()).toBe('outside')

        wrapper.vm.active = true
        await flushPromises()
        expect(activeId()).toBe('b1')

        wrapper.vm.active = false
        await flushPromises()
        expect(activeId()).toBe('outside')
        wrapper.unmount()
    })

    it('停用後不再攔截 Tab（移除監聽）', async () => {
        const wrapper = mount(Harness, { attachTo: document.body })
        wrapper.vm.active = true
        await flushPromises()
        wrapper.vm.active = false
        await flushPromises()
        document.getElementById('outside')?.focus()
        tab(false) // 不應拋錯、不應改變焦點（監聽已移除）
        expect(activeId()).toBe('outside')
        wrapper.unmount()
    })
})
