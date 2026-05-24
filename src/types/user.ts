export interface Topic {
    topicId: string
    content: string
}

export interface Tag {
    tagId: string
    type: string
    content: string
}

export interface Social {
    id: number
    platform: string
    links: string
}

export interface Sticker {
    id: number
    stickerNo: number
    sticker: string | null
}

export interface UserProfile {
    userId: string
    username: string
    furName: string | null
    avatar: string | null
    avatarColor: string | null
    topicId: string | null
    topic?: Topic | null
    tags?: Tag[]
    socials?: Social[]
    stickers?: Sticker[]
}

export interface Member {
    userId: string
    username: string
    furName: string | null
    avatar: string | null
    avatarColor: string | null
}

export interface CreateProfileRequest {
    username?: string
    furName?: string
    avatar?: string
    avatarColor?: string
    topicId?: string
}

export type UpdateProfileRequest = Partial<CreateProfileRequest>

export interface AddTagRequest {
    tagId?: string
    type?: string
    content?: string
}

export interface AddSocialLinkRequest {
    platform: string
    links: string
}

export interface RemoveTagRequest {
    tagId: string
}

export interface RemoveSocialLinkRequest {
    id: number
}

export interface ApiEnvelope<T> {
    code: number
    message: string
    data: T
}
