import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import FeedbackTab from '@/components/FeedbackTab.vue'
import { resetMockUserForTest } from '@/composables/useMockUser'

const { mockPushSuccess } = vi.hoisted(() => ({
    mockPushSuccess: vi.fn(),
}))
vi.mock('notivue', () => ({
    push: { success: mockPushSuccess },
}))

describe('FeedbackTab', () => {
    beforeEach(() => {
        resetMockUserForTest()
        mockPushSuccess.mockClear()
    })

    it('renders the nickname field as disabled with mockUser nickname', () => {
        const wrapper = mount(FeedbackTab)
        const nicknameInput = wrapper.find('.feedback-tab__nickname')
        expect(nicknameInput.exists()).toBe(true)
        expect((nicknameInput.element as HTMLInputElement).disabled).toBe(true)
        expect((nicknameInput.element as HTMLInputElement).value).toBe('小毛')
    })

    it('renders subject input and body textarea', () => {
        const wrapper = mount(FeedbackTab)
        expect(wrapper.find('.feedback-tab__subject').exists()).toBe(true)
        expect(wrapper.find('.feedback-tab__body').exists()).toBe(true)
    })

    it('renders a submit button', () => {
        const wrapper = mount(FeedbackTab)
        expect(wrapper.find('.feedback-tab__submit').exists()).toBe(true)
    })

    it('calls push.success on submit with filled fields', async () => {
        const wrapper = mount(FeedbackTab)
        await wrapper.find('.feedback-tab__subject').setValue('Bug Report')
        await wrapper.find('.feedback-tab__body').setValue('Something broke')
        await wrapper.find('.feedback-tab__submit').trigger('click')
        expect(mockPushSuccess).toHaveBeenCalledWith('已送出（mock）')
    })

    it('logs form data to console on submit', async () => {
        const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
        const wrapper = mount(FeedbackTab)
        await wrapper.find('.feedback-tab__subject').setValue('Test Subject')
        await wrapper.find('.feedback-tab__body').setValue('Test Body')
        await wrapper.find('.feedback-tab__submit').trigger('click')
        expect(spy).toHaveBeenCalledWith(
            '[FeedbackTab] submit:',
            expect.objectContaining({
                nickname: '小毛',
                subject: 'Test Subject',
                body: 'Test Body',
            })
        )
        spy.mockRestore()
    })

    it('does not submit when subject or body is empty', async () => {
        const wrapper = mount(FeedbackTab)
        await wrapper.find('.feedback-tab__submit').trigger('click')
        expect(mockPushSuccess).not.toHaveBeenCalled()
    })

    it('clears subject and body after submit', async () => {
        const wrapper = mount(FeedbackTab)
        await wrapper.find('.feedback-tab__subject').setValue('Subject')
        await wrapper.find('.feedback-tab__body').setValue('Body')
        await wrapper.find('.feedback-tab__submit').trigger('click')
        expect((wrapper.find('.feedback-tab__subject').element as HTMLInputElement).value).toBe('')
        expect((wrapper.find('.feedback-tab__body').element as HTMLTextAreaElement).value).toBe('')
    })
})
