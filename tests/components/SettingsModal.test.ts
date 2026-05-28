import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import SettingsModal from '@/components/SettingsModal.vue'

describe('SettingsModal', () => {
    it('renders nothing when open=false', () => {
        const wrapper = mount(SettingsModal, { props: { open: false } })
        expect(wrapper.find('.settings-modal').exists()).toBe(false)
    })

    it('renders the modal overlay and panel when open=true', () => {
        const wrapper = mount(SettingsModal, { props: { open: true } })
        expect(wrapper.find('.settings-modal').exists()).toBe(true)
        expect(wrapper.find('.settings-modal__panel').exists()).toBe(true)
    })

    it('renders five tab buttons in order', () => {
        const wrapper = mount(SettingsModal, { props: { open: true } })
        const tabs = wrapper.findAll('.settings-modal__tab')
        expect(tabs.length).toBe(5)
        expect(tabs[0].text()).toBe('設定')
        expect(tabs[1].text()).toBe('貼圖')
        expect(tabs[2].text()).toBe('話題卡')
        expect(tabs[3].text()).toBe('回饋')
        expect(tabs[4].text()).toBe('斗內')
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
        await tabs[2].trigger('click')
        expect(wrapper.find('[data-test=topic-card-tab]').exists()).toBe(true)
    })

    describe('attemptClose with unsaved changes', () => {
        afterEach(() => {
            vi.unstubAllGlobals()
        })

        it('shows confirm dialog when SettingsTab is dirty', async () => {
            const confirmMock = vi.fn().mockReturnValue(false)
            vi.stubGlobal('confirm', confirmMock)
            const wrapper = mount(SettingsModal, { props: { open: true } })
            await flushPromises()
            const input = wrapper.find('.settings-tab__nickname')
            await input.setValue('變更名稱')
            await flushPromises()

            await wrapper.find('.settings-modal__close').trigger('click')
            expect(confirmMock).toHaveBeenCalledWith('有未儲存的變更,確定要關閉?')
            expect(wrapper.emitted('close')).toBeFalsy()
        })

        it('emits close immediately when not dirty', async () => {
            const confirmMock = vi.fn()
            vi.stubGlobal('confirm', confirmMock)
            const wrapper = mount(SettingsModal, { props: { open: true } })
            await flushPromises()
            await wrapper.find('.settings-modal__close').trigger('click')
            expect(confirmMock).not.toHaveBeenCalled()
            expect(wrapper.emitted('close')).toBeTruthy()
        })

        it('emits close when user confirms', async () => {
            const confirmMock = vi.fn().mockReturnValue(true)
            vi.stubGlobal('confirm', confirmMock)
            const wrapper = mount(SettingsModal, { props: { open: true } })
            await flushPromises()
            const input = wrapper.find('.settings-tab__nickname')
            await input.setValue('變更名稱')
            await flushPromises()
            await wrapper.find('.settings-modal__close').trigger('click')
            expect(wrapper.emitted('close')).toBeTruthy()
        })
    })
})
