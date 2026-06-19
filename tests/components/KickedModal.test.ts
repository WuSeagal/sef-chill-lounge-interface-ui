import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import KickedModal from '@/components/KickedModal.vue'

describe('KickedModal', () => {
    it('renders kick message when open', () => {
        const wrapper = mount(KickedModal, { props: { open: true } })

        expect(wrapper.text()).toContain('你已在其他裝置登入')
        expect(wrapper.text()).toContain('這個連線已被新登入的裝置取代')
        expect(wrapper.find('[data-test="kicked-modal-reconnect"]').exists()).toBe(true)
        expect(wrapper.find('[data-test="kicked-modal-logout"]').exists()).toBe(false)
    })

    it('uses the shared LizardCard (grayscale lizard) styling', () => {
        const wrapper = mount(KickedModal, { props: { open: true } })

        expect(wrapper.find('.lizard-card').exists()).toBe(true)
        expect(wrapper.find('.lizard-card__lizard').exists()).toBe(true)
    })

    it('emits reconnect event when reconnect button clicked', async () => {
        const wrapper = mount(KickedModal, { props: { open: true } })

        await wrapper.find('[data-test="kicked-modal-reconnect"]').trigger('click')

        expect(wrapper.emitted('reconnect')).toBeTruthy()
    })

    it('does not close when ESC is pressed', async () => {
        const wrapper = mount(KickedModal, { props: { open: true }, attachTo: document.body })

        await wrapper.trigger('keydown', { key: 'Escape' })

        expect(wrapper.emitted('close')).toBeFalsy()
        wrapper.unmount()
    })

    it('does not close when backdrop is clicked', async () => {
        const wrapper = mount(KickedModal, { props: { open: true } })

        await wrapper.find('[data-test="kicked-modal-backdrop"]').trigger('click')

        expect(wrapper.emitted('close')).toBeFalsy()
    })

    it('renders nothing when not open', () => {
        const wrapper = mount(KickedModal, { props: { open: false } })

        expect(wrapper.find('[data-test="kicked-modal-backdrop"]').exists()).toBe(false)
    })
})
