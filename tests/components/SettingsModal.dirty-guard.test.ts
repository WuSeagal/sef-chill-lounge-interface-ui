import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

// SettingsModal 用 useAuthStore 判定 host 公告分頁；此檔測未存檔守則，非 host 即可。
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ user: null }) }))

vi.mock('@/components/SettingsTab.vue', () => ({
    default: { name: 'SettingsTab', setup(_: unknown, { expose }: { expose: (e: unknown) => void }) {
        expose({ isDirty: true, saveAll: vi.fn(), discardDrafts: vi.fn() }); return () => null } },
}))
vi.mock('@/components/StickerTab.vue', () => ({ default: { name: 'StickerTab', template: '<div data-test="sticker-tab" />' } }))
vi.mock('@/components/TopicCardTab.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/components/FeedbackTab.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/components/DonateTab.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/components/ExportPassportTab.vue', () => ({ default: { template: '<div />' } }))

import SettingsModal from '@/components/SettingsModal.vue'

let wrapper: ReturnType<typeof mount> | null = null
function open() {
    wrapper = mount(SettingsModal, { props: { open: true }, attachTo: document.body })
    return wrapper
}

describe('SettingsModal dirty guard via ConfirmDialog (not window.confirm)', () => {
    afterEach(() => {
        // unmount 才會觸發 onBeforeUnmount 移除 window keydown listener，避免測試間殘留干擾
        wrapper?.unmount()
        wrapper = null
        document.body.innerHTML = ''
    })

    it('opens ConfirmDialog (not window.confirm) when switching tabs while dirty', async () => {
        const confirmSpy = vi.fn()
        vi.stubGlobal('confirm', confirmSpy)
        const wrapper = open()
        await wrapper.findAll('.settings-modal__tab')[1].trigger('click')
        await nextTick()
        // custom dialog shown, native confirm NOT used, tab NOT switched yet
        expect(document.body.querySelector('.confirm-dialog')).not.toBeNull()
        expect(confirmSpy).not.toHaveBeenCalled()
        expect(wrapper.findComponent({ name: 'SettingsTab' }).exists()).toBe(true)
        vi.unstubAllGlobals()
    })

    it('staying (取消) keeps the current tab', async () => {
        const wrapper = open()
        await wrapper.findAll('.settings-modal__tab')[1].trigger('click')
        await nextTick()
        ;(document.body.querySelector('.confirm-dialog__cancel') as HTMLElement).click()
        await nextTick()
        expect(document.body.querySelector('.confirm-dialog')).toBeNull()
        expect(wrapper.findComponent({ name: 'SettingsTab' }).exists()).toBe(true)
        expect(wrapper.find('[data-test=sticker-tab]').exists()).toBe(false)
    })

    it('狠心離開 (confirm) proceeds with the tab switch', async () => {
        const wrapper = open()
        await wrapper.findAll('.settings-modal__tab')[1].trigger('click')
        await nextTick()
        ;(document.body.querySelector('.confirm-dialog__confirm') as HTMLElement).click()
        await nextTick()
        expect(document.body.querySelector('.confirm-dialog')).toBeNull()
        expect(wrapper.find('[data-test=sticker-tab]').exists()).toBe(true)
    })

    it('Escape while ConfirmDialog is open only cancels the dialog, does not close the modal', async () => {
        const wrapper = open()
        await wrapper.find('.settings-modal__close').trigger('click')
        await nextTick()
        expect(document.body.querySelector('.confirm-dialog')).not.toBeNull()
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
        await nextTick()
        // dialog dismissed, modal stays open, close NOT emitted
        expect(document.body.querySelector('.confirm-dialog')).toBeNull()
        expect(wrapper.findComponent({ name: 'SettingsTab' }).exists()).toBe(true)
        expect(wrapper.emitted('close')).toBeFalsy()
    })

    it('opens ConfirmDialog on close (✕) while dirty; confirm emits close', async () => {
        const wrapper = open()
        await wrapper.find('.settings-modal__close').trigger('click')
        await nextTick()
        expect(document.body.querySelector('.confirm-dialog')).not.toBeNull()
        expect(wrapper.emitted('close')).toBeFalsy()
        ;(document.body.querySelector('.confirm-dialog__confirm') as HTMLElement).click()
        await nextTick()
        expect(wrapper.emitted('close')).toBeTruthy()
    })
})
