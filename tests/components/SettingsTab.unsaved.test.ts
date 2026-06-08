import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, computed } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import type { UserProfile } from '@/types/user'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))

const profileRef = ref<UserProfile | null>({
    userId: 'u-1', username: 'mao', furName: '小毛', avatar: null,
    avatarColor: null, avatarBorder: false, topicId: null, topic: null,
    tags: [], socials: [],
} as unknown as UserProfile)

const updateProfileMock = vi.fn().mockResolvedValue(undefined)
vi.mock('@/composables/useUser', () => ({
    useUser: () => ({
        profile: profileRef,
        updateProfile: updateProfileMock,
        addTag: vi.fn().mockResolvedValue(true),
        removeTag: vi.fn().mockResolvedValue(true),
        addSocialLink: vi.fn().mockResolvedValue(true),
        removeSocialLink: vi.fn().mockResolvedValue(true),
    }),
}))

const tagDirty = ref(false)
const tagResetMock = vi.fn(() => { tagDirty.value = false })
vi.mock('@/composables/useTagEditorState', () => ({
    useTagEditorState: () => ({
        isDirty: computed(() => tagDirty.value),
        reset: tagResetMock,
        diff: () => ({ toAdd: [], toRemove: [], toCreate: [] }),
        selectedTagIds: ref(new Set()),
        newCustomTags: ref(new Map()),
    }),
}))

const avatarFile = ref<File | null>(null)
const avatarClearMock = vi.fn(() => { avatarFile.value = null })
vi.mock('@/composables/useAvatarUploadDraft', () => ({
    useAvatarUploadDraft: () => ({
        file: avatarFile,
        previewUrl: ref(null),
        clearDraft: avatarClearMock,
        setCropSource: vi.fn(),
        setCroppedResult: vi.fn(),
        cropOpen: ref(false),
        sourceUrl: ref(null),
        modalCropState: ref(null),
    }),
}))

vi.mock('@/api/userApi', () => ({
    fetchSelectableTags: vi.fn().mockResolvedValue({
        ROLE: [], LANGUAGE: [], FRAMEWORK: [], DATABASE: [], DEVOPS: [], CUSTOM: [],
    }),
}))
vi.mock('@/api/avatarUploadApi', () => ({ uploadAvatar: vi.fn() }))

// 子元件 stub，避免拉進整棵依賴樹
vi.mock('@/components/TagEditorPreview.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/components/TagEditorModal.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/components/ToggleSwitch.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/components/AvatarCropModal.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/components/PlatformSelect.vue', () => ({ default: { template: '<div />' } }))

import SettingsTab from '@/components/SettingsTab.vue'

async function mountTab() {
    const wrapper = mount(SettingsTab)
    await flushPromises()
    return wrapper
}

describe('SettingsTab discardDrafts', () => {
    beforeEach(() => {
        tagDirty.value = false
        avatarFile.value = null
        vi.clearAllMocks()
        profileRef.value = {
            userId: 'u-1', username: 'mao', furName: '小毛', avatar: null,
            avatarColor: null, avatarBorder: false, topicId: null, topic: null,
            tags: [], socials: [],
        } as unknown as UserProfile
    })

    it('discardDrafts clears edits so isDirty returns to false', async () => {
        const wrapper = await mountTab()
        await wrapper.find('.settings-tab__nickname').setValue('改了名字')
        expect((wrapper.vm as unknown as { isDirty: boolean }).isDirty).toBe(true)

        ;(wrapper.vm as unknown as { discardDrafts: () => void }).discardDrafts()
        await flushPromises()
        expect((wrapper.vm as unknown as { isDirty: boolean }).isDirty).toBe(false)
        // 顯示名稱回到 profile 原值
        expect((wrapper.find('.settings-tab__nickname').element as HTMLInputElement).value).toBe('小毛')
    })

    it('exposes discardDrafts for the modal-level unsaved bar', async () => {
        const wrapper = await mountTab()
        expect(typeof (wrapper.vm as unknown as { discardDrafts: unknown }).discardDrafts).toBe('function')
    })
})
