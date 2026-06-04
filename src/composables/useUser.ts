import { ref, type Ref } from 'vue'
import * as userApi from '@/api/userApi'
import type {
    AddSocialLinkRequest,
    AddTagRequest,
    CreateProfileRequest,
    Social,
    Tag,
    UpdateProfileRequest,
    UserProfile,
} from '@/types/user'

// Singleton state（同 useMockUser 的 ref 模式）
const profile = ref<UserProfile | null>(null)
const loading = ref<boolean>(false)
const error = ref<string | null>(null)
const needsOnboarding = ref<boolean>(false)

export type UseUserReturn = {
    profile: Ref<UserProfile | null>
    loading: Ref<boolean>
    error: Ref<string | null>
    needsOnboarding: Ref<boolean>
    fetchProfile: () => Promise<void>
    createProfile: (body: CreateProfileRequest) => Promise<void>
    updateProfile: (body: UpdateProfileRequest) => Promise<void>
    redrawTopicCard: () => Promise<void>
    addTag: (body: AddTagRequest) => Promise<boolean>
    removeTag: (tagId: string) => Promise<void>
    addSocialLink: (body: AddSocialLinkRequest) => Promise<boolean>
    removeSocialLink: (id: number) => Promise<void>
}

export function useUser(): UseUserReturn {
    function mergeProfile(next: UserProfile): UserProfile {
        return {
            ...profile.value,
            ...next,
            tags: next.tags ?? profile.value?.tags,
            socials: next.socials ?? profile.value?.socials,
            stickers: next.stickers ?? profile.value?.stickers,
            topic: next.topic ?? profile.value?.topic,
        }
    }

    async function fetchProfile(): Promise<void> {
        loading.value = true
        error.value = null
        try {
            const basicProfile = await userApi.fetchMyProfile()
            profile.value = basicProfile
            profile.value = await userApi.fetchProfileDetail(basicProfile.userId)
            needsOnboarding.value = false
        } catch (e: any) {
            if (e?.response?.status === 404) {
                profile.value = null
                needsOnboarding.value = true
            } else {
                error.value = e?.response?.data?.message ?? '載入 profile 失敗'
            }
        } finally {
            loading.value = false
        }
    }

    async function createProfile(body: CreateProfileRequest): Promise<void> {
        try {
            const createdProfile = await userApi.createMyProfile(body)
            profile.value = mergeProfile(createdProfile)
            needsOnboarding.value = false
            error.value = null
        } catch (e: any) {
            error.value = e?.response?.data?.message ?? '建立 profile 失敗'
            throw e
        }
    }

    async function updateProfile(body: UpdateProfileRequest): Promise<void> {
        try {
            const updatedProfile = await userApi.updateMyProfile(body)
            profile.value = mergeProfile(updatedProfile)
        } catch (e: any) {
            error.value = e?.response?.data?.message ?? '更新 profile 失敗'
            throw e
        }
    }

    async function redrawTopicCard(): Promise<void> {
        try {
            const newTopic = await userApi.redrawTopicCard()
            if (profile.value) {
                profile.value.topicId = newTopic.topicId
                profile.value.topic = newTopic
            }
        } catch (e: any) {
            const code = e?.response?.data?.message
            if (code === 'no_other_topic_available') {
                error.value = '沒有其他話題卡可抽'
            } else {
                error.value = '重抽話題卡失敗'
            }
        }
    }

    // 回傳是否成功（呼叫端可據此提示；失敗時設 error 但不 rethrow，維持 best-effort 流程）
    async function addTag(body: AddTagRequest): Promise<boolean> {
        // 前端 dup 檢查（依 spec），後端的 409 為 race-condition 兜底
        if (body.tagId && profile.value?.tags?.some(t => t.tagId === body.tagId)) {
            error.value = '已新增過此 tag'
            return true
        }
        try {
            const created: Tag = await userApi.addTag(body)
            if (profile.value) {
                profile.value.tags = [...(profile.value.tags ?? []), created]
            }
            return true
        } catch (e: any) {
            error.value = e?.response?.data?.message ?? '新增 tag 失敗'
            return false
        }
    }

    async function removeTag(tagId: string): Promise<void> {
        try {
            await userApi.removeTag(tagId)
            if (profile.value?.tags) {
                profile.value.tags = profile.value.tags.filter(t => t.tagId !== tagId)
            }
        } catch (e: any) {
            error.value = e?.response?.data?.message ?? '刪除 tag 失敗'
        }
    }

    async function addSocialLink(body: AddSocialLinkRequest): Promise<boolean> {
        try {
            const created: Social = await userApi.addSocialLink(body)
            if (profile.value) {
                profile.value.socials = [...(profile.value.socials ?? []), created]
            }
            return true
        } catch (e: any) {
            error.value = e?.response?.data?.message ?? '新增社群連結失敗'
            return false
        }
    }

    async function removeSocialLink(id: number): Promise<void> {
        try {
            await userApi.removeSocialLink(id)
            if (profile.value?.socials) {
                profile.value.socials = profile.value.socials.filter(s => s.id !== id)
            }
        } catch (e: any) {
            error.value = e?.response?.data?.message ?? '刪除社群連結失敗'
        }
    }

    return {
        profile, loading, error, needsOnboarding,
        fetchProfile, createProfile, updateProfile, redrawTopicCard,
        addTag, removeTag, addSocialLink, removeSocialLink,
    }
}

/** Test-only：重置 singleton state。 */
export function resetUserStateForTest(): void {
    profile.value = null
    loading.value = false
    error.value = null
    needsOnboarding.value = false
}
