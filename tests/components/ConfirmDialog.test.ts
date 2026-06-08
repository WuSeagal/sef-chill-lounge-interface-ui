import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

function mountDialog(props: Record<string, unknown> = {}) {
    return mount(ConfirmDialog, {
        props: {
            open: true,
            message: '有尚未儲存的改動，要離開嗎？',
            confirmText: '狠心離開',
            cancelText: '取消',
            ...props,
        },
        attachTo: document.body,
    })
}

describe('ConfirmDialog', () => {
    afterEach(() => {
        document.body.innerHTML = ''
    })

    it('renders nothing when open=false', () => {
        mountDialog({ open: false })
        expect(document.body.querySelector('.confirm-dialog')).toBeNull()
    })

    it('teleports scrim + card + message + both buttons to body when open', () => {
        mountDialog()
        expect(document.body.querySelector('.confirm-dialog')).not.toBeNull()
        expect(document.body.querySelector('.confirm-dialog__card')).not.toBeNull()
        expect(document.body.querySelector('.confirm-dialog__message')?.textContent)
            .toContain('有尚未儲存的改動，要離開嗎？')
        expect(document.body.querySelector('.confirm-dialog__cancel')?.textContent).toContain('取消')
        expect(document.body.querySelector('.confirm-dialog__confirm')?.textContent).toContain('狠心離開')
    })

    it('emits confirm when 狠心離開 is clicked', async () => {
        const wrapper = mountDialog()
        ;(document.body.querySelector('.confirm-dialog__confirm') as HTMLElement).click()
        await nextTick()
        expect(wrapper.emitted('confirm')).toBeTruthy()
        expect(wrapper.emitted('cancel')).toBeFalsy()
    })

    it('emits cancel when 取消 is clicked', async () => {
        const wrapper = mountDialog()
        ;(document.body.querySelector('.confirm-dialog__cancel') as HTMLElement).click()
        await nextTick()
        expect(wrapper.emitted('cancel')).toBeTruthy()
        expect(wrapper.emitted('confirm')).toBeFalsy()
    })

    it('emits cancel on Escape key', async () => {
        const wrapper = mountDialog()
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
        await nextTick()
        expect(wrapper.emitted('cancel')).toBeTruthy()
        expect(wrapper.emitted('confirm')).toBeFalsy()
    })

    it('emits cancel when the backdrop (scrim) is clicked, not the card', async () => {
        const wrapper = mountDialog()
        ;(document.body.querySelector('.confirm-dialog') as HTMLElement).click()
        await nextTick()
        expect(wrapper.emitted('cancel')).toBeTruthy()
    })

    it('does NOT emit cancel when the card itself is clicked', async () => {
        const wrapper = mountDialog()
        ;(document.body.querySelector('.confirm-dialog__card') as HTMLElement).click()
        await nextTick()
        expect(wrapper.emitted('cancel')).toBeFalsy()
    })

    it('uses role=alertdialog and focuses the cancel button', async () => {
        mountDialog()
        await nextTick()
        const card = document.body.querySelector('.confirm-dialog__card')
        expect(card?.getAttribute('role')).toBe('alertdialog')
        expect(document.activeElement).toBe(document.body.querySelector('.confirm-dialog__cancel'))
    })
})
