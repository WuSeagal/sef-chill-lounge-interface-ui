import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import SettingsTab from '@/components/SettingsTab.vue'
import type { UserProfile } from '@/types/user'

const initialProfile = (): UserProfile => ({
    userId: 'u-1',
    username: '小毛',
    furName: 'MaoMao',
    avatar: '/mock-images/avatar-default.png',
    avatarColor: '#8c8672',
    topicId: 't-1',
    topic: { topicId: 't-1', content: '你的設定中最喜歡哪個元素？' },
    tags: [
        { tagId: 'tg-a', type: 'species', content: '獸聚常客' },
        { tagId: 'tg-b', type: 'hobby', content: '台北' },
        { tagId: 'tg-c', type: 'species', content: 'wolf' },
    ],
    socials: [
        { id: 1, platform: 'twitter', links: 'https://twitter.com/x' },
        { id: 2, platform: 'plurk', links: 'https://plurk.com/x' },
    ],
    stickers: [
        { id: 1, stickerNo: 1, sticker: '/mock-images/sticker-1.png' },
        { id: 2, stickerNo: 2, sticker: '/mock-images/sticker-2.png' },
        { id: 3, stickerNo: 3, sticker: '/mock-images/sticker-3.png' },
        { id: 4, stickerNo: 4, sticker: '/mock-images/sticker-4.png' },
        { id: 5, stickerNo: 5, sticker: '/mock-images/sticker-5.png' },
    ],
})

const profileRef = ref<UserProfile | null>(initialProfile())
const updateProfileMock = vi.fn().mockResolvedValue(undefined)
const addTagMock = vi.fn().mockImplementation(async (req: any) => {
    const newTag = { tagId: `tg-new-${Date.now()}`, type: req.type ?? 'custom', content: req.content }
    if (profileRef.value) {
        profileRef.value.tags = [...(profileRef.value.tags ?? []), newTag]
    }
})
const removeTagMock = vi.fn().mockImplementation(async (tagId: string) => {
    if (profileRef.value?.tags) {
        profileRef.value.tags = profileRef.value.tags.filter(t => t.tagId !== tagId)
    }
})
const addSocialLinkMock = vi.fn().mockImplementation(async (req: any) => {
    const created = { id: Math.floor(Math.random() * 10000), platform: req.platform, links: req.links }
    if (profileRef.value) {
        profileRef.value.socials = [...(profileRef.value.socials ?? []), created]
    }
})
const removeSocialLinkMock = vi.fn().mockImplementation(async (id: number) => {
    if (profileRef.value?.socials) {
        profileRef.value.socials = profileRef.value.socials.filter(s => s.id !== id)
    }
})
const redrawTopicCardMock = vi.fn().mockImplementation(async () => {
    if (profileRef.value) {
        profileRef.value.topic = { topicId: 't-new', content: '新題目' }
        profileRef.value.topicId = 't-new'
    }
})

vi.mock('@/composables/useUser', () => ({
    useUser: () => ({
        profile: profileRef,
        updateProfile: updateProfileMock,
        addTag: addTagMock,
        removeTag: removeTagMock,
        addSocialLink: addSocialLinkMock,
        removeSocialLink: removeSocialLinkMock,
        redrawTopicCard: redrawTopicCardMock,
    }),
}))

describe('SettingsTab', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        profileRef.value = initialProfile()
    })

    describe('nickname field', () => {
        it('renders display-name input with current furName', () => {
            const wrapper = mount(SettingsTab)
            const input = wrapper.find('.settings-tab__nickname')
            expect(input.exists()).toBe(true)
            expect((input.element as HTMLInputElement).value).toBe('MaoMao')
        })

        it('updates user furName on blur (not on input)', async () => {
            const wrapper = mount(SettingsTab)
            const input = wrapper.find('.settings-tab__nickname')
            await input.setValue('新名字')
            expect(updateProfileMock).not.toHaveBeenCalled()
            await input.trigger('blur')
            expect(updateProfileMock).toHaveBeenCalledWith({ furName: '新名字' })
        })
    })

    describe('avatar field', () => {
        it('renders current avatar image', () => {
            const wrapper = mount(SettingsTab)
            const img = wrapper.find('.settings-tab__avatar-img')
            expect(img.exists()).toBe(true)
            expect(img.attributes('src')).toBe('/mock-images/avatar-default.png')
        })

        it('renders avatar file input', () => {
            const wrapper = mount(SettingsTab)
            expect(wrapper.find('.settings-tab__avatar-upload').exists()).toBe(true)
        })
    })

    describe('avatarBgColor field', () => {
        it('renders color input with current avatarColor', () => {
            const wrapper = mount(SettingsTab)
            const input = wrapper.find('.settings-tab__color-input')
            expect(input.exists()).toBe(true)
            expect((input.element as HTMLInputElement).value).toBe('#8c8672')
        })

        it('calls updateProfile when color changes', async () => {
            const wrapper = mount(SettingsTab)
            const input = wrapper.find('.settings-tab__color-input')
            await input.setValue('#ff0000')
            await flushPromises()
            expect(updateProfileMock).toHaveBeenCalledWith({ avatarColor: '#ff0000' })
        })
    })

    describe('tags field', () => {
        it('renders existing tags as chips', () => {
            const wrapper = mount(SettingsTab)
            const chips = wrapper.findAll('.settings-tab__tag-chip')
            expect(chips.length).toBe(3)
            expect(chips[0].text()).toContain('獸聚常客')
            expect(chips[1].text()).toContain('台北')
            expect(chips[2].text()).toContain('wolf')
        })

        it('adds a new custom tag when add button is clicked', async () => {
            const wrapper = mount(SettingsTab)
            const input = wrapper.find('[data-field="tags"] .settings-tab__input')
            await input.setValue('新TAG')
            await wrapper.find('[data-field="tags"] .settings-tab__btn').trigger('click')
            await flushPromises()
            expect(addTagMock).toHaveBeenCalledWith({ type: 'custom', content: '新TAG' })
        })

        it('removes a tag by tagId when remove button is clicked', async () => {
            const wrapper = mount(SettingsTab)
            const removes = wrapper.findAll('.settings-tab__tag-remove')
            await removes[0].trigger('click')
            await flushPromises()
            expect(removeTagMock).toHaveBeenCalledWith('tg-a')
        })

        it('clears input after adding a tag', async () => {
            const wrapper = mount(SettingsTab)
            const input = wrapper.find('[data-field="tags"] .settings-tab__input')
            await input.setValue('test')
            await wrapper.find('[data-field="tags"] .settings-tab__btn').trigger('click')
            await flushPromises()
            expect((input.element as HTMLInputElement).value).toBe('')
        })

        it('does not call addTag for empty tag', async () => {
            const wrapper = mount(SettingsTab)
            await wrapper.find('[data-field="tags"] .settings-tab__btn').trigger('click')
            expect(addTagMock).not.toHaveBeenCalled()
        })
    })

    describe('socialLinks field', () => {
        it('renders existing social links', () => {
            const wrapper = mount(SettingsTab)
            const items = wrapper.findAll('.settings-tab__social-item')
            expect(items.length).toBe(2)
            expect(items[0].text()).toContain('twitter')
            expect(items[1].text()).toContain('plurk')
        })

        it('adds a new social link', async () => {
            const wrapper = mount(SettingsTab)
            const inputs = wrapper.findAll('[data-field="social-links"] .settings-tab__input')
            await inputs[0].setValue('instagram')
            await inputs[1].setValue('https://instagram.com/test')
            await wrapper.find('[data-field="social-links"] .settings-tab__btn').trigger('click')
            await flushPromises()
            expect(addSocialLinkMock).toHaveBeenCalledWith({
                platform: 'instagram',
                links: 'https://instagram.com/test',
            })
        })

        it('removes a social link by id', async () => {
            const wrapper = mount(SettingsTab)
            const removes = wrapper.findAll('.settings-tab__social-remove')
            await removes[0].trigger('click')
            await flushPromises()
            expect(removeSocialLinkMock).toHaveBeenCalledWith(1)
        })

        it('does not add link with empty platform or url', async () => {
            const wrapper = mount(SettingsTab)
            await wrapper.find('[data-field="social-links"] .settings-tab__btn').trigger('click')
            expect(addSocialLinkMock).not.toHaveBeenCalled()
        })
    })

    describe('stickers field', () => {
        it('renders 5 sticker images from profile.stickers', () => {
            const wrapper = mount(SettingsTab)
            const imgs = wrapper.findAll('.settings-tab__sticker-img')
            expect(imgs.length).toBe(5)
            expect(imgs[0].attributes('src')).toBe('/mock-images/sticker-1.png')
        })

        it('renders a file input per sticker slot', () => {
            const wrapper = mount(SettingsTab)
            const uploads = wrapper.findAll('.settings-tab__sticker-upload')
            expect(uploads.length).toBe(5)
        })
    })

    describe('topicCard field', () => {
        it('renders current topic card content', () => {
            const wrapper = mount(SettingsTab)
            const content = wrapper.find('.settings-tab__topic-content')
            expect(content.exists()).toBe(true)
            expect(content.text()).toBe('你的設定中最喜歡哪個元素？')
        })

        it('renders a redraw button', () => {
            const wrapper = mount(SettingsTab)
            expect(wrapper.find('.settings-tab__topic-redraw').exists()).toBe(true)
        })

        it('calls redrawTopicCard on button click', async () => {
            const wrapper = mount(SettingsTab)
            await wrapper.find('.settings-tab__topic-redraw').trigger('click')
            await flushPromises()
            expect(redrawTopicCardMock).toHaveBeenCalledTimes(1)
        })
    })
})
