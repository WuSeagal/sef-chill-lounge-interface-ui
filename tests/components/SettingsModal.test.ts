import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import SettingsModal from '@/components/SettingsModal.vue'

vi.mock('vue-i18n', () => ({
    useI18n: () => ({ t: (key: string) => key }),
}))

// BlacklistTab（host 黑名單分頁）會在 mount 時呼叫 API / useMembers；此處 mock 掉避免真實網路請求。
vi.mock('@/api/blacklistApi', () => ({
    fetchBlacklist: vi.fn().mockResolvedValue([]),
    banUser: vi.fn().mockResolvedValue(undefined),
    removeFromBlacklist: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/composables/useMembers', () => ({
    useMembers: () => ({
        members: ref([]),
        loading: ref(false),
        error: ref(null),
        refetch: vi.fn().mockResolvedValue(undefined),
    }),
}))
vi.mock('notivue', () => ({ push: { error: vi.fn(), success: vi.fn() } }))

// SettingsModal 用 useAuthStore 判定是否顯示 host 公告分頁；預設非 host（null）→ 6 分頁。
const authUserHolder: { value: null | { providerUserId: string } } = { value: null }
vi.mock('@/stores/auth', () => ({
    useAuthStore: () => ({ get user() { return authUserHolder.value } }),
}))

describe('SettingsModal', () => {
    afterEach(() => { authUserHolder.value = null })

    it('host 帳號多顯示「公告」與「黑名單」分頁（共 8）', () => {
        authUserHolder.value = { providerUserId: '111427449810799428954' }
        const wrapper = mount(SettingsModal, { props: { open: true } })
        const labels = wrapper.findAll('.settings-modal__tab').map(t => t.text())
        expect(labels).toContain('公告')
        expect(labels).toContain('黑名單')
        expect(wrapper.findAll('.settings-modal__tab').length).toBe(8)
    })

    it('非 host 不顯示「公告」與「黑名單」分頁', () => {
        authUserHolder.value = null
        const wrapper = mount(SettingsModal, { props: { open: true } })
        const labels = wrapper.findAll('.settings-modal__tab').map(t => t.text())
        expect(labels).not.toContain('公告')
        expect(labels).not.toContain('黑名單')
    })

    it('host 點「黑名單」分頁渲染 BlacklistTab', async () => {
        authUserHolder.value = { providerUserId: '111427449810799428954' }
        const wrapper = mount(SettingsModal, { props: { open: true } })
        const blacklistTab = wrapper.findAll('.settings-modal__tab').find(t => t.text() === '黑名單')!
        await blacklistTab.trigger('click')
        expect(wrapper.find('[data-test="blacklist-tab"]').exists()).toBe(true)
    })

    it('renders nothing when open=false', () => {
        const wrapper = mount(SettingsModal, { props: { open: false } })
        expect(wrapper.find('.settings-modal').exists()).toBe(false)
    })

    it('renders the modal overlay and panel when open=true', () => {
        const wrapper = mount(SettingsModal, { props: { open: true } })
        expect(wrapper.find('.settings-modal').exists()).toBe(true)
        expect(wrapper.find('.settings-modal__panel').exists()).toBe(true)
    })

    it('renders six tab buttons in order with the renamed labels', () => {
        const wrapper = mount(SettingsModal, { props: { open: true } })
        const tabs = wrapper.findAll('.settings-modal__tab')
        expect(tabs.length).toBe(6)
        expect(tabs[0].text()).toBe('個人資料')
        expect(tabs[1].text()).toBe('貼圖設定')
        expect(tabs[2].text()).toBe('輸出護照')
        expect(tabs[3].text()).toBe('重抽話題卡')
        expect(tabs[4].text()).toBe('意見回饋')
        expect(tabs[5].text()).toBe('斗內連結')
    })

    it('uses a two-column layout: a left tab rail and a right content body', () => {
        const wrapper = mount(SettingsModal, { props: { open: true } })
        expect(wrapper.find('.settings-modal__rail').exists()).toBe(true)
        expect(wrapper.find('.settings-modal__body').exists()).toBe(true)
        // tabs live inside the rail
        const rail = wrapper.find('.settings-modal__rail')
        expect(rail.findAll('.settings-modal__tab').length).toBe(6)
    })

    it('defaults to the settings tab being active', () => {
        const wrapper = mount(SettingsModal, { props: { open: true } })
        const tabs = wrapper.findAll('.settings-modal__tab')
        expect(tabs[0].classes()).toContain('settings-modal__tab--active')
        expect(tabs[1].classes()).not.toContain('settings-modal__tab--active')
    })

    it('switches active tab on click', async () => {
        const wrapper = mount(SettingsModal, { props: { open: true } })
        const tabs = wrapper.findAll('.settings-modal__tab')
        await tabs[1].trigger('click')
        expect(tabs[0].classes()).not.toContain('settings-modal__tab--active')
        expect(tabs[1].classes()).toContain('settings-modal__tab--active')
    })

    it('renders a close button', () => {
        const wrapper = mount(SettingsModal, { props: { open: true } })
        expect(wrapper.find('.settings-modal__close').exists()).toBe(true)
    })

    it('emits close when close button is clicked', async () => {
        const wrapper = mount(SettingsModal, { props: { open: true } })
        await wrapper.find('.settings-modal__close').trigger('click')
        expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('emits close on ESC keydown', async () => {
        const wrapper = mount(SettingsModal, {
            props: { open: true },
            attachTo: document.body,
        })
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
        await nextTick()
        expect(wrapper.emitted('close')).toBeTruthy()
        wrapper.unmount()
    })

    it('emits close on overlay click (outside the panel)', async () => {
        const wrapper = mount(SettingsModal, {
            props: { open: true },
            attachTo: document.body,
        })
        await wrapper.find('.settings-modal').trigger('click')
        expect(wrapper.emitted('close')).toBeTruthy()
        wrapper.unmount()
    })

    it('does NOT emit close when the panel itself is clicked', async () => {
        const wrapper = mount(SettingsModal, {
            props: { open: true },
            attachTo: document.body,
        })
        await wrapper.find('.settings-modal__panel').trigger('click')
        expect(wrapper.emitted('close')).toBeFalsy()
        wrapper.unmount()
    })

    it('resets active tab to settings when re-opened', async () => {
        const wrapper = mount(SettingsModal, {
            props: { open: true },
        })
        const tabs = wrapper.findAll('.settings-modal__tab')
        await tabs[4].trigger('click')
        expect(tabs[4].classes()).toContain('settings-modal__tab--active')

        await wrapper.setProps({ open: false })
        await nextTick()
        await wrapper.setProps({ open: true })
        await nextTick()
        const tabsAfter = wrapper.findAll('.settings-modal__tab')
        expect(tabsAfter[0].classes()).toContain('settings-modal__tab--active')
    })

    it('renders StickerTab when sticker tab active', async () => {
        const wrapper = mount(SettingsModal, { props: { open: true } })
        const tabs = wrapper.findAll('.settings-modal__tab')
        await tabs[1].trigger('click')
        expect(wrapper.find('[data-test=sticker-tab]').exists()).toBe(true)
    })

    it('renders TopicCardTab when topic tab active', async () => {
        const wrapper = mount(SettingsModal, { props: { open: true } })
        const tabs = wrapper.findAll('.settings-modal__tab')
        await tabs[3].trigger('click')
        expect(wrapper.find('[data-test=topic-card-tab]').exists()).toBe(true)
    })

    describe('attemptClose with unsaved changes (ConfirmDialog)', () => {
        afterEach(() => {
            document.body.innerHTML = ''
        })

        it('opens ConfirmDialog when SettingsTab is dirty and does not close yet', async () => {
            const wrapper = mount(SettingsModal, { props: { open: true }, attachTo: document.body })
            await flushPromises()
            await wrapper.find('.settings-tab__nickname').setValue('變更名稱')
            await flushPromises()
            await wrapper.find('.settings-modal__close').trigger('click')
            await nextTick()
            expect(document.body.querySelector('.confirm-dialog')).not.toBeNull()
            expect(wrapper.emitted('close')).toBeFalsy()
        })

        it('emits close immediately when not dirty (no dialog)', async () => {
            const wrapper = mount(SettingsModal, { props: { open: true }, attachTo: document.body })
            await flushPromises()
            await wrapper.find('.settings-modal__close').trigger('click')
            expect(document.body.querySelector('.confirm-dialog')).toBeNull()
            expect(wrapper.emitted('close')).toBeTruthy()
        })

        it('emits close when user confirms 狠心離開', async () => {
            const wrapper = mount(SettingsModal, { props: { open: true }, attachTo: document.body })
            await flushPromises()
            await wrapper.find('.settings-tab__nickname').setValue('變更名稱')
            await flushPromises()
            await wrapper.find('.settings-modal__close').trigger('click')
            await nextTick()
            ;(document.body.querySelector('.confirm-dialog__confirm') as HTMLElement).click()
            await nextTick()
            expect(wrapper.emitted('close')).toBeTruthy()
        })
    })
})
