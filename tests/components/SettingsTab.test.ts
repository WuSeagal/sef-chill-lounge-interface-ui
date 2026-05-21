import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import SettingsTab from '@/components/SettingsTab.vue'
import { useMockUser, resetMockUserForTest } from '@/composables/useMockUser'
import { resetMockTopicsForTest } from '@/composables/useMockTopics'

describe('SettingsTab', () => {
    beforeEach(() => {
        resetMockUserForTest()
        resetMockTopicsForTest()
    })

    describe('nickname field', () => {
        it('renders nickname input with current user nickname', () => {
            const wrapper = mount(SettingsTab)
            const input = wrapper.find('.settings-tab__nickname')
            expect(input.exists()).toBe(true)
            expect((input.element as HTMLInputElement).value).toBe('小毛')
        })

        it('updates user nickname on input', async () => {
            const wrapper = mount(SettingsTab)
            const input = wrapper.find('.settings-tab__nickname')
            await input.setValue('新名字')
            const { user } = useMockUser()
            expect(user.value.nickname).toBe('新名字')
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
        it('renders color input with current avatarBgColor', () => {
            const wrapper = mount(SettingsTab)
            const input = wrapper.find('.settings-tab__color-input')
            expect(input.exists()).toBe(true)
            expect((input.element as HTMLInputElement).value).toBe('#8c8672')
        })

        it('updates user avatarBgColor on change', async () => {
            const wrapper = mount(SettingsTab)
            const input = wrapper.find('.settings-tab__color-input')
            await input.setValue('#ff0000')
            const { user } = useMockUser()
            expect(user.value.avatarBgColor).toBe('#ff0000')
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

        it('adds a new tag when add button is clicked', async () => {
            const wrapper = mount(SettingsTab)
            const input = wrapper.find('[data-field="tags"] .settings-tab__input')
            await input.setValue('新TAG')
            await wrapper.find('[data-field="tags"] .settings-tab__btn').trigger('click')
            const chips = wrapper.findAll('.settings-tab__tag-chip')
            expect(chips.length).toBe(4)
            expect(chips[3].text()).toContain('新TAG')
        })

        it('removes a tag when remove button is clicked', async () => {
            const wrapper = mount(SettingsTab)
            const removes = wrapper.findAll('.settings-tab__tag-remove')
            await removes[0].trigger('click')
            const chips = wrapper.findAll('.settings-tab__tag-chip')
            expect(chips.length).toBe(2)
            expect(chips[0].text()).toContain('台北')
        })

        it('clears input after adding a tag', async () => {
            const wrapper = mount(SettingsTab)
            const input = wrapper.find('[data-field="tags"] .settings-tab__input')
            await input.setValue('test')
            await wrapper.find('[data-field="tags"] .settings-tab__btn').trigger('click')
            expect((input.element as HTMLInputElement).value).toBe('')
        })

        it('does not add empty tag', async () => {
            const wrapper = mount(SettingsTab)
            await wrapper.find('[data-field="tags"] .settings-tab__btn').trigger('click')
            const chips = wrapper.findAll('.settings-tab__tag-chip')
            expect(chips.length).toBe(3)
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
            const items = wrapper.findAll('.settings-tab__social-item')
            expect(items.length).toBe(3)
            expect(items[2].text()).toContain('instagram')
        })

        it('removes a social link', async () => {
            const wrapper = mount(SettingsTab)
            const removes = wrapper.findAll('.settings-tab__social-remove')
            await removes[0].trigger('click')
            const items = wrapper.findAll('.settings-tab__social-item')
            expect(items.length).toBe(1)
            expect(items[0].text()).toContain('plurk')
        })

        it('does not add link with empty platform or url', async () => {
            const wrapper = mount(SettingsTab)
            await wrapper.find('[data-field="social-links"] .settings-tab__btn').trigger('click')
            const items = wrapper.findAll('.settings-tab__social-item')
            expect(items.length).toBe(2)
        })
    })

    describe('stickers field', () => {
        it('renders 5 sticker images', () => {
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

        it('changes topic card content on redraw click', async () => {
            const wrapper = mount(SettingsTab)
            const initial = wrapper.find('.settings-tab__topic-content').text()
            for (let i = 0; i < 10; i++) {
                await wrapper.find('.settings-tab__topic-redraw').trigger('click')
            }
            const after = wrapper.find('.settings-tab__topic-content').text()
            expect(after).not.toBe(initial)
        })
    })
})
