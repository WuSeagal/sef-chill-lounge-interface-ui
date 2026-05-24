import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import ChatView from '@/views/ChatView.vue'
import { resetMockMessagesForTest } from '@/composables/useMockMessages'

// Mock current user via useUser
const profileRef = ref<any>({
    userId: 'u-101',
    username: '小毛',
    furName: '毛毛',
    avatar: '/mock-images/avatar-default.png',
    avatarColor: '#8c8672',
})

vi.mock('@/composables/useUser', () => ({
    useUser: () => ({ profile: profileRef }),
}))

// UserPopup fetches profile detail via API — mock it
vi.mock('@/api/userApi', () => ({
    fetchProfileDetail: vi.fn().mockImplementation(async (userId: string) => ({
        userId,
        username: userId === 'u-101' ? '小毛' : `User-${userId}`,
        furName: userId === 'u-101' ? '毛毛' : `Fur-${userId}`,
        avatar: '/x.png',
        avatarColor: '#000',
        topicId: null,
        topic: null,
        tags: [],
        socials: [],
        stickers: [],
    })),
}))

describe('ChatView', () => {
    beforeEach(() => {
        resetMockMessagesForTest()
        profileRef.value = {
            userId: 'u-101',
            username: '小毛',
            furName: '毛毛',
            avatar: '/mock-images/avatar-default.png',
            avatarColor: '#8c8672',
        }
    })

    it('renders the mock messages list (>= 20 items)', () => {
        const wrapper = mount(ChatView)
        const items = wrapper.findAll('.message-item')
        expect(items.length).toBeGreaterThanOrEqual(20)
    })

    it('renders no UserPopup or ImageLightbox by default', () => {
        const wrapper = mount(ChatView)
        expect(wrapper.find('.user-popup').exists()).toBe(false)
        expect(wrapper.find('.image-lightbox').exists()).toBe(false)
    })

    it('opens UserPopup with the correct user when an avatar is clicked', async () => {
        const wrapper = mount(ChatView, { attachTo: document.body })
        const firstAvatar = wrapper.findAll('.message-item__avatar')[0]
        await firstAvatar.trigger('click')
        await flushPromises()
        expect(wrapper.find('.user-popup').exists()).toBe(true)
        expect(wrapper.find('.user-popup').text()).toContain('毛毛')
        wrapper.unmount()
    })

    it('toggles UserPopup off when the same avatar is re-clicked', async () => {
        const wrapper = mount(ChatView, { attachTo: document.body })
        const firstAvatar = wrapper.findAll('.message-item__avatar')[0]
        await firstAvatar.trigger('click')
        await flushPromises()
        expect(wrapper.find('.user-popup').exists()).toBe(true)

        await firstAvatar.trigger('click')
        await nextTick()
        expect(wrapper.find('.user-popup').exists()).toBe(false)
        wrapper.unmount()
    })

    it('same-avatar re-click toggles off via full mousedown+click sequence', async () => {
        const wrapper = mount(ChatView, { attachTo: document.body })
        const av = wrapper.findAll('.message-item__avatar')[0].element as HTMLElement

        av.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
        av.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        await flushPromises()
        expect(wrapper.find('.user-popup').exists()).toBe(true)

        av.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
        av.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        await nextTick()
        expect(wrapper.find('.user-popup').exists()).toBe(false)

        wrapper.unmount()
    })

    it('appending via BottomBar send adds a new message to the list', async () => {
        const wrapper = mount(ChatView)
        const before = wrapper.findAll('.message-item').length

        const input = wrapper.find('.bottom-bar__input')
        await input.setValue('hi from test')

        const sendBtn = wrapper.find('[data-btn="send"]')
        await sendBtn.trigger('click')
        await flushPromises()

        const after = wrapper.findAll('.message-item').length
        expect(after).toBe(before + 1)
        expect(wrapper.text()).toContain('hi from test')
        expect(wrapper.text()).toContain('毛毛')
    })

    it('pressing Enter in the input also sends and appends', async () => {
        const wrapper = mount(ChatView)
        const before = wrapper.findAll('.message-item').length

        const input = wrapper.find('.bottom-bar__input')
        await input.setValue('enter-typed in chat')
        await input.trigger('keydown', { key: 'Enter' })
        await flushPromises()

        const after = wrapper.findAll('.message-item').length
        expect(after).toBe(before + 1)
        expect(wrapper.text()).toContain('enter-typed in chat')
    })

    it('does NOT render the scroll-to-bottom FAB when the list starts at the bottom', () => {
        const wrapper = mount(ChatView)
        expect(wrapper.find('.chat-view__scroll-fab').exists()).toBe(false)
    })

    it('renders no SettingsModal by default', () => {
        const wrapper = mount(ChatView)
        expect(wrapper.find('.settings-modal').exists()).toBe(false)
    })

    it('opens SettingsModal when gear button is clicked', async () => {
        const wrapper = mount(ChatView, { attachTo: document.body })
        const gearBtn = wrapper.find('[data-btn="gear"]')
        await gearBtn.trigger('click')
        await nextTick()
        expect(wrapper.find('.settings-modal').exists()).toBe(true)
        wrapper.unmount()
    })

    it('closes SettingsModal when its close button is clicked', async () => {
        const wrapper = mount(ChatView, { attachTo: document.body })
        await wrapper.find('[data-btn="gear"]').trigger('click')
        await nextTick()
        expect(wrapper.find('.settings-modal').exists()).toBe(true)

        await wrapper.find('.settings-modal__close').trigger('click')
        await nextTick()
        expect(wrapper.find('.settings-modal').exists()).toBe(false)
        wrapper.unmount()
    })

    it('renders the scroll-to-bottom FAB when isAtBottom becomes false', async () => {
        const wrapper = mount(ChatView, { attachTo: document.body })
        const list = wrapper.find('.chat-view__list').element as HTMLElement

        Object.defineProperty(list, 'scrollHeight', { value: 2000, configurable: true })
        Object.defineProperty(list, 'clientHeight', { value: 600, configurable: true })
        Object.defineProperty(list, 'scrollTop', { value: 0, configurable: true, writable: true })
        list.dispatchEvent(new Event('scroll'))
        await nextTick()

        expect(wrapper.find('.chat-view__scroll-fab').exists()).toBe(true)
        wrapper.unmount()
    })
})
