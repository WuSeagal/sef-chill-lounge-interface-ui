import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import SettingsTab from '@/components/SettingsTab.vue'
import { TagType, type UserProfile } from '@/types/user'

const initialProfile = (): UserProfile => ({
    userId: 'u-1',
    username: '小毛',
    furName: 'MaoMao',
    avatar: '/mock-images/avatar-default.png',
    avatarColor: '#8c8672',
    avatarBorder: false,
    topicId: 't-1',
    topic: { topicId: 't-1', content: '你的設定中最喜歡哪個元素？' },
    tags: [
        { tagId: 'tg-a', type: TagType.LANGUAGE, content: 'Java', isCustom: false },
        { tagId: 'tg-b', type: TagType.ROLE, content: '後端工程師', isCustom: false },
    ],
    socials: [
        { id: 1, platform: 'twitter', links: 'https://twitter.com/x' },
        { id: 2, platform: 'plurk', links: 'https://plurk.com/x' },
    ],
    stickers: [],
})

const profileRef = ref<UserProfile | null>(initialProfile())
const updateProfileMock = vi.fn().mockResolvedValue(undefined)
const addTagMock = vi.fn().mockResolvedValue(undefined)
const removeTagMock = vi.fn().mockResolvedValue(undefined)
const addSocialLinkMock = vi.fn().mockResolvedValue(undefined)
const removeSocialLinkMock = vi.fn().mockResolvedValue(undefined)
const { uploadAvatarMock } = vi.hoisted(() => ({
    uploadAvatarMock: vi.fn().mockResolvedValue({ avatarPath: '/user/u-1.png' }),
}))

vi.mock('@/composables/useUser', () => ({
    useUser: () => ({
        profile: profileRef,
        updateProfile: updateProfileMock,
        addTag: addTagMock,
        removeTag: removeTagMock,
        addSocialLink: addSocialLinkMock,
        removeSocialLink: removeSocialLinkMock,
    }),
}))

vi.mock('@/api/userApi', () => ({
    fetchSelectableTags: vi.fn().mockResolvedValue({
        ROLE: [{ tagId: 'r-1', type: 'ROLE', content: '前端工程師', isCustom: false }],
        LANGUAGE: [{ tagId: 'l-1', type: 'LANGUAGE', content: 'TypeScript', isCustom: false }],
        FRAMEWORK: [],
        DATABASE: [],
        DEVOPS: [],
        CUSTOM: [],
    }),
}))

vi.mock('@/api/avatarUploadApi', () => ({
    uploadAvatar: uploadAvatarMock,
}))

vi.mock('notivue', () => ({
    push: { warning: vi.fn(), success: vi.fn() },
}))

describe('SettingsTab — staged save', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        profileRef.value = initialProfile()
    })

    it('改顯示名稱不立即送 API', async () => {
        const wrapper = mount(SettingsTab)
        const input = wrapper.find('.settings-tab__nickname')
        await input.setValue('新名字')
        await flushPromises()
        expect(updateProfileMock).not.toHaveBeenCalled()
    })

    it('改顏色不立即送 API', async () => {
        const wrapper = mount(SettingsTab)
        // 先開外框，選色才會顯示
        await wrapper.find('[data-test=avatar-border-toggle] input').setValue(true)
        await flushPromises()
        const input = wrapper.find('.settings-tab__color-input')
        await input.setValue('#ff0000')
        await flushPromises()
        expect(updateProfileMock).not.toHaveBeenCalled()
    })

    it('儲存按鈕無 dirty 時 disabled', () => {
        const wrapper = mount(SettingsTab)
        const btn = wrapper.find('[data-test=save-all]')
        expect((btn.element as HTMLButtonElement).disabled).toBe(true)
    })

    it('改名後 isDirty 變 true,按儲存才呼叫 updateProfile', async () => {
        const wrapper = mount(SettingsTab)
        await wrapper.find('.settings-tab__nickname').setValue('新名字')
        await flushPromises()
        const btn = wrapper.find('[data-test=save-all]')
        expect((btn.element as HTMLButtonElement).disabled).toBe(false)
        await btn.trigger('click')
        await flushPromises()
        expect(updateProfileMock).toHaveBeenCalledWith(
            expect.objectContaining({ furName: '新名字' }),
        )
    })

    it('改名 + 開框 + 顏色一起儲存只發一次 updateProfile', async () => {
        const wrapper = mount(SettingsTab)
        await wrapper.find('.settings-tab__nickname').setValue('B')
        // 新規則：先開啟頭像外框才能選色
        await wrapper.find('[data-test=avatar-border-toggle] input').setValue(true)
        await wrapper.find('.settings-tab__color-input').setValue('#ff0000')
        await wrapper.find('[data-test=save-all]').trigger('click')
        await flushPromises()
        expect(updateProfileMock).toHaveBeenCalledTimes(1)
        expect(updateProfileMock).toHaveBeenCalledWith({
            furName: 'B', avatarColor: '#ff0000', avatarBorder: true,
        })
    })

    it('avatarBorder 開關預設反映 profile.avatarBorder', () => {
        profileRef.value = { ...initialProfile(), avatarBorder: true }
        const wrapper = mount(SettingsTab)
        const input = wrapper.find('[data-test=avatar-border-toggle] input')
        expect((input.element as HTMLInputElement).checked).toBe(true)
    })

    it('avatarBorder 關閉時隱藏選色,開啟後顯示', async () => {
        profileRef.value = { ...initialProfile(), avatarBorder: false }
        const wrapper = mount(SettingsTab)
        expect(wrapper.find('.settings-tab__color-input').exists()).toBe(false)

        await wrapper.find('[data-test=avatar-border-toggle] input').setValue(true)
        await flushPromises()
        expect(wrapper.find('.settings-tab__color-input').exists()).toBe(true)
    })

    it('預覽頭像依 avatarBorder 顯示色環', async () => {
        profileRef.value = { ...initialProfile(), avatarColor: '#7b9b8f', avatarBorder: true }
        const wrapper = mount(SettingsTab)
        const onStyle = wrapper.find('.settings-tab__avatar-img').attributes('style') ?? ''
        expect(onStyle).toContain('box-shadow')
        expect(onStyle).toContain('#7b9b8f')

        // 取消勾選 → 預覽無色環
        await wrapper.find('[data-test=avatar-border-toggle] input').setValue(false)
        await flushPromises()
        const offStyle = wrapper.find('.settings-tab__avatar-img').attributes('style') ?? ''
        expect(offStyle).not.toContain('box-shadow')
    })

    it('avatar 為空時顯示 default avatar', () => {
        profileRef.value = { ...initialProfile(), avatar: null }
        const wrapper = mount(SettingsTab)
        expect(wrapper.find('.settings-tab__avatar-img').attributes('src')).toContain('default-avatar.png')
    })

    it('回到基準點的 settings 頭像 row 版型', () => {
        const wrapper = mount(SettingsTab)
        expect(wrapper.find('.settings-tab__avatar-img').exists()).toBe(true)
        expect(wrapper.find('.settings-tab__avatar-editor').exists()).toBe(false)
    })

    it('avatar file input 只接受靜態圖片格式', () => {
        const wrapper = mount(SettingsTab)
        expect(wrapper.find('.settings-tab__file-input').attributes('accept')).toBe('image/png,image/jpeg,image/webp')
    })

    it('有 staged avatar 時顯示重新裁切與更換圖片', async () => {
        const wrapper = mount(SettingsTab)
        await flushPromises()

        await (wrapper.vm as any).avatarDraft.setCroppedResult(
            new File(['demo'], 'avatar.png', { type: 'image/png' }),
        )
        await flushPromises()

        expect(wrapper.text()).toContain('更換圖片')
        expect(wrapper.text()).toContain('重新裁切')
    })

    it('裁切確認後只更新預覽,不立即 upload avatar', async () => {
        const wrapper = mount(SettingsTab)
        await flushPromises()

        await (wrapper.vm as any).avatarDraft.setCroppedResult(
            new File(['demo'], 'avatar.png', { type: 'image/png' }),
        )
        await flushPromises()

        expect(uploadAvatarMock).not.toHaveBeenCalled()
        expect(wrapper.find('.settings-tab__avatar-img').attributes('src')).toContain('blob:')
    })

    it('saveAll 會先 upload avatar,再 updateProfile 帶入 avatarPath', async () => {
        uploadAvatarMock.mockResolvedValueOnce({ avatarPath: '/user/u-uploaded.png' })
        const wrapper = mount(SettingsTab)
        await flushPromises()

        await (wrapper.vm as any).avatarDraft.setCroppedResult(
            new File(['demo'], 'avatar.png', { type: 'image/png' }),
        )
        await flushPromises()

        await wrapper.find('[data-test=save-all]').trigger('click')
        await flushPromises()

        expect(uploadAvatarMock).toHaveBeenCalledTimes(1)
        expect(updateProfileMock).toHaveBeenCalledWith(
            expect.objectContaining({ avatar: '/user/u-uploaded.png' }),
        )
    })

    it('切換 avatarBorder 變 dirty,儲存送 updateProfile 帶 avatarBorder', async () => {
        const wrapper = mount(SettingsTab)
        const input = wrapper.find('[data-test=avatar-border-toggle] input')
        await input.setValue(true)
        await flushPromises()
        const btn = wrapper.find('[data-test=save-all]')
        expect((btn.element as HTMLButtonElement).disabled).toBe(false)
        await btn.trigger('click')
        await flushPromises()
        expect(updateProfileMock).toHaveBeenCalledWith(
            expect.objectContaining({ avatarBorder: true }),
        )
    })

    it('加社群連結 staged 進預覽,儲存才送 API', async () => {
        const wrapper = mount(SettingsTab)
        const inputs = wrapper.findAll('[data-field="social-links"] .settings-tab__input')
        await inputs[0].setValue('instagram')
        await inputs[1].setValue('https://instagram.com/test')
        await wrapper.find('[data-field="social-links"] .settings-tab__btn').trigger('click')
        await flushPromises()
        expect(addSocialLinkMock).not.toHaveBeenCalled()
        expect(wrapper.text()).toContain('instagram')

        await wrapper.find('[data-test=save-all]').trigger('click')
        await flushPromises()
        expect(addSocialLinkMock).toHaveBeenCalledWith({
            platform: 'instagram',
            links: 'https://instagram.com/test',
        })
    })

    it('移除社群連結 staged,儲存才送 removeSocialLink', async () => {
        const wrapper = mount(SettingsTab)
        await wrapper.findAll('.settings-tab__social-remove')[0].trigger('click')
        await flushPromises()
        expect(removeSocialLinkMock).not.toHaveBeenCalled()

        await wrapper.find('[data-test=save-all]').trigger('click')
        await flushPromises()
        expect(removeSocialLinkMock).toHaveBeenCalledWith(1)
    })

    it('渲染 TagEditorPreview', () => {
        const wrapper = mount(SettingsTab)
        expect(wrapper.find('.tag-editor-preview').exists()).toBe(true)
    })

    it('沒拆出的 sticker / topic section 不再渲染', () => {
        const wrapper = mount(SettingsTab)
        expect(wrapper.find('.settings-tab__sticker-grid').exists()).toBe(false)
        expect(wrapper.find('.settings-tab__topic-card').exists()).toBe(false)
    })

    // F1 fix: saveAll atomicity
    it('儲存中途失敗:draft 全部保留,toast 標明失敗 step', async () => {
        const { push } = await import('notivue')
        const warn = vi.mocked(push.warning)
        updateProfileMock.mockResolvedValueOnce(undefined)   // profile OK
        addTagMock.mockRejectedValueOnce({ response: { data: { message: 'simulated' } } })  // tag fail

        const wrapper = mount(SettingsTab)
        await flushPromises()
        await wrapper.find('.settings-tab__nickname').setValue('新名字')
        // 加一個新 social link 把 saveAll 流程延長
        const sInputs = wrapper.findAll('[data-field="social-links"] .settings-tab__input')
        await sInputs[0].setValue('ig')
        await sInputs[1].setValue('https://ig.com/test')
        await wrapper.find('[data-field="social-links"] .settings-tab__btn').trigger('click')
        await flushPromises()

        // 觸發 TAG diff:模擬 user 在 modal 內把 tg-a remove(透過直接調用 toggle)
        // 因為元件內部 state 較難從測試外觸發,直接模擬 saveAll 階段失敗即可
        // (這裡仍走 update + 0 個 tag op + 1 個 social add,但讓 social fail 來測 atomicity)
        addSocialLinkMock.mockReset()
        addSocialLinkMock.mockRejectedValueOnce({ response: { data: { message: 'sim-social' } } })

        await wrapper.find('[data-test=save-all]').trigger('click')
        await flushPromises()

        expect(warn).toHaveBeenCalledWith(expect.stringContaining('社群連結'))
        // F1 核心驗證:失敗後 draft 還在(儲存按鈕仍可按)
        expect((wrapper.find('[data-test=save-all]').element as HTMLButtonElement).disabled).toBe(false)
    })

    // F2 fix: loadSelectable error UI
    it('fetchSelectableTags 失敗時顯示 retry,點擊重試', async () => {
        const { fetchSelectableTags } = await import('@/api/userApi')
        vi.mocked(fetchSelectableTags).mockRejectedValueOnce({
            response: { data: { message: 'load-failed' } },
        })
        const wrapper = mount(SettingsTab)
        await flushPromises()
        expect(wrapper.find('[data-test=selectable-error]').exists()).toBe(true)

        // 重試:這次成功
        vi.mocked(fetchSelectableTags).mockResolvedValueOnce({
            ROLE: [], LANGUAGE: [], FRAMEWORK: [], DATABASE: [], DEVOPS: [], CUSTOM: [],
        } as any)
        await wrapper.find('[data-test=selectable-error] button').trigger('click')
        await flushPromises()
        expect(wrapper.find('[data-test=selectable-error]').exists()).toBe(false)
    })

    // F7 fix: shallow watch — profile 深層變動不重置 draft
    it('user.profile.tags 變動不重置 in-flight draft', async () => {
        const wrapper = mount(SettingsTab)
        await flushPromises()
        await wrapper.find('.settings-tab__nickname').setValue('新名字-不該被清')
        await flushPromises()
        expect((wrapper.find('[data-test=save-all]').element as HTMLButtonElement).disabled).toBe(false)

        // 模擬另一個 tab / WS 推送觸發 profile 深層欄位變動(不變 userId)
        profileRef.value = {
            ...profileRef.value!,
            tags: [...(profileRef.value?.tags ?? []), { tagId: 'tg-from-elsewhere', type: 'CUSTOM' as any, content: 'X', isCustom: true }],
        }
        await flushPromises()

        // F7 核心驗證:draft 仍 dirty
        expect((wrapper.find('[data-test=save-all]').element as HTMLButtonElement).disabled).toBe(false)
        expect((wrapper.find('.settings-tab__nickname').element as HTMLInputElement).value)
            .toBe('新名字-不該被清')
    })
})
