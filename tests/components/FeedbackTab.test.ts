import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import FeedbackTab from '@/components/FeedbackTab.vue'

const { mockPromise, mockWarning, notifResolve, notifReject } = vi.hoisted(() => {
    const notifResolve = vi.fn()
    const notifReject = vi.fn()
    return {
        notifResolve,
        notifReject,
        mockPromise: vi.fn(() => ({ resolve: notifResolve, reject: notifReject })),
        mockWarning: vi.fn(),
    }
})
vi.mock('notivue', () => ({
    push: { promise: mockPromise, warning: mockWarning },
}))

const { mockSubmitFeedback } = vi.hoisted(() => ({ mockSubmitFeedback: vi.fn() }))
vi.mock('@/api/feedbackApi', () => ({
    submitFeedback: mockSubmitFeedback,
}))

const profileRef = ref<any>({ userId: 'u-1', username: 'small-mao', furName: '小毛' })
vi.mock('@/composables/useUser', () => ({
    useUser: () => ({
        profile: profileRef,
    }),
}))

describe('FeedbackTab', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        profileRef.value = { userId: 'u-1', username: 'small-mao', furName: '小毛' }
        mockSubmitFeedback.mockResolvedValue(undefined)
    })

    it('renders the reporter field as disabled with useUser profile furName', () => {
        const wrapper = mount(FeedbackTab)
        const reporter = wrapper.find('.feedback-tab__nickname')
        expect(reporter.exists()).toBe(true)
        expect((reporter.element as HTMLInputElement).disabled).toBe(true)
        expect((reporter.element as HTMLInputElement).value).toBe('小毛')
    })

    it('renders adjusted labels and placeholders', () => {
        const wrapper = mount(FeedbackTab)
        const labels = wrapper.findAll('.feedback-tab__label').map((l) => l.text())
        expect(labels).toContain('回報者')
        expect(labels).toContain('問題主題')
        expect(labels).toContain('問題描述')
        expect(wrapper.find('.feedback-tab__subject').attributes('placeholder')).toBe('問題主要關於什麼？')
        expect(wrapper.find('.feedback-tab__body').attributes('placeholder')).toBe('請輸入回報內容')
    })

    it('keeps the explanatory hint unchanged', () => {
        const wrapper = mount(FeedbackTab)
        expect(wrapper.find('.feedback-tab__hint').text()).toBe(
            '不論系統使用上有問題要反應，或是想要回饋心得，都可以使用此處。',
        )
    })

    it('submits trimmed title/content/username via submitFeedback and resolves notification', async () => {
        const wrapper = mount(FeedbackTab)
        await wrapper.find('.feedback-tab__subject').setValue('  Bug  ')
        await wrapper.find('.feedback-tab__body').setValue('  broke  ')
        await wrapper.find('.feedback-tab__submit').trigger('click')
        await flushPromises()

        expect(mockSubmitFeedback).toHaveBeenCalledWith({ title: 'Bug', content: 'broke', username: '小毛' })
        expect(mockPromise).toHaveBeenCalled()
        expect(notifResolve).toHaveBeenCalled()
    })

    it('warns and does not submit when subject or body is empty', async () => {
        const wrapper = mount(FeedbackTab)
        await wrapper.find('.feedback-tab__submit').trigger('click')
        await flushPromises()

        expect(mockWarning).toHaveBeenCalled()
        expect(mockSubmitFeedback).not.toHaveBeenCalled()
    })

    it('clears subject and body after a successful submit', async () => {
        const wrapper = mount(FeedbackTab)
        await wrapper.find('.feedback-tab__subject').setValue('Subject')
        await wrapper.find('.feedback-tab__body').setValue('Body')
        await wrapper.find('.feedback-tab__submit').trigger('click')
        await flushPromises()

        expect((wrapper.find('.feedback-tab__subject').element as HTMLInputElement).value).toBe('')
        expect((wrapper.find('.feedback-tab__body').element as HTMLTextAreaElement).value).toBe('')
    })

    it('rejects notification and keeps fields when submit fails', async () => {
        mockSubmitFeedback.mockRejectedValue(new Error('network'))
        const wrapper = mount(FeedbackTab)
        await wrapper.find('.feedback-tab__subject').setValue('Subject')
        await wrapper.find('.feedback-tab__body').setValue('Body')
        await wrapper.find('.feedback-tab__submit').trigger('click')
        await flushPromises()

        expect(notifReject).toHaveBeenCalled()
        expect((wrapper.find('.feedback-tab__subject').element as HTMLInputElement).value).toBe('Subject')
    })
})
