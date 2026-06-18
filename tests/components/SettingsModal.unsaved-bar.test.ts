import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

// SettingsModal 用 useAuthStore 判定 host 公告分頁；此檔測未存檔浮層，非 host 即可。
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ user: null }) }))

const { saveAllMock, discardMock, ctrl } = vi.hoisted(() => ({
    saveAllMock: vi.fn(), discardMock: vi.fn(), ctrl: { dirty: true },
}))

vi.mock('@/components/SettingsTab.vue', () => ({
    default: { name: 'SettingsTab', setup(_: unknown, { expose }: { expose: (e: unknown) => void }) {
        expose({ get isDirty() { return ctrl.dirty }, saveAll: saveAllMock, discardDrafts: discardMock }); return () => null } },
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

describe('SettingsModal unsaved bar (modal-level, original page untouched)', () => {
    afterEach(() => {
        wrapper?.unmount()
        wrapper = null
        vi.clearAllMocks()
        ctrl.dirty = true
        document.body.innerHTML = ''
    })

    it('hides the unsaved bar when the active tab is not dirty', async () => {
        ctrl.dirty = false
        const w = open()
        await nextTick()
        expect(w.find('[data-test=unsaved-bar]').exists()).toBe(false)
    })

    it('shows the unsaved bar when on a dirty staged-save tab (個人資料)', async () => {
        const w = open()
        await nextTick()
        const bar = w.find('[data-test=unsaved-bar]')
        expect(bar.exists()).toBe(true)
        expect(bar.text()).toContain('您有未儲存的改動')
        expect(bar.find('.settings-modal__unsaved-discard').exists()).toBe(true)
        expect(bar.find('.settings-modal__unsaved-save').exists()).toBe(true)
    })

    it('還原 button calls the active tab discardDrafts', async () => {
        const w = open()
        await nextTick()
        await w.find('.settings-modal__unsaved-discard').trigger('click')
        expect(discardMock).toHaveBeenCalledTimes(1)
        expect(saveAllMock).not.toHaveBeenCalled()
    })

    it('儲存 button calls the active tab saveAll', async () => {
        const w = open()
        await nextTick()
        await w.find('.settings-modal__unsaved-save').trigger('click')
        expect(saveAllMock).toHaveBeenCalledTimes(1)
        expect(discardMock).not.toHaveBeenCalled()
    })
})
