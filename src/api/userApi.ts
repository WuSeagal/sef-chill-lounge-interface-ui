import service from '@/utils/request'
import type {
    AddSocialLinkRequest,
    AddTagRequest,
    CreateProfileRequest,
    Member,
    Social,
    Tag,
    Topic,
    UpdateProfileRequest,
    UserProfile,
} from '@/types/user'

// utils/request interceptor 已 unwrap 為 { code, message, data }（res = res），
// 各 API helper 再剝 .data 給呼叫端。

export async function fetchMyProfile(): Promise<UserProfile> {
    const res: any = await service.get('/user/profile')
    return res.data
}

export async function createMyProfile(body: CreateProfileRequest): Promise<UserProfile> {
    const res: any = await service.post('/user/profile', body)
    return res.data
}

export async function updateMyProfile(body: UpdateProfileRequest): Promise<UserProfile> {
    const res: any = await service.post('/user/profile/update', body)
    return res.data
}

export async function fetchProfileDetail(userId: string): Promise<UserProfile> {
    const res: any = await service.get(`/user/profile/${userId}`)
    return res.data
}

export async function fetchMembers(): Promise<Member[]> {
    const res: any = await service.get('/members')
    return res.data
}

export async function fetchDefaultTags(): Promise<Tag[]> {
    const res: any = await service.get('/tags')
    return res.data
}

export async function fetchRandomTopic(): Promise<Topic> {
    const res: any = await service.get('/topics/random')
    return res.data
}

export async function redrawTopicCard(): Promise<Topic> {
    const res: any = await service.post('/user/topic-card/redraw')
    return res.data
}

export async function addTag(body: AddTagRequest): Promise<Tag> {
    const res: any = await service.post('/user/tags', body)
    return res.data
}

export async function removeTag(tagId: string): Promise<void> {
    await service.post('/user/tags/remove', { tagId })
}

export async function addSocialLink(body: AddSocialLinkRequest): Promise<Social> {
    const res: any = await service.post('/user/social-links', body)
    return res.data
}

export async function removeSocialLink(id: number): Promise<void> {
    await service.post('/user/social-links/remove', { id })
}
