export interface Topic {
    topicId: string
    content: string
}

export const TagType = {
    ROLE: 'ROLE',
    LANGUAGE: 'LANGUAGE',
    FRAMEWORK: 'FRAMEWORK',
    DATABASE: 'DATABASE',
    DEVOPS: 'DEVOPS',
    CUSTOM: 'CUSTOM',
} as const
export type TagType = typeof TagType[keyof typeof TagType]

export const TAG_TYPE_ORDER: TagType[] = [
    TagType.ROLE,
    TagType.LANGUAGE,
    TagType.FRAMEWORK,
    TagType.DATABASE,
    TagType.DEVOPS,
    TagType.CUSTOM,
]

// 5 個有「我X」前綴的 type;CUSTOM 不在內(它沒前綴語意)
export const TAG_TYPE_PREFIX: Partial<Record<TagType, string>> = {
    [TagType.ROLE]: '我是',
    [TagType.LANGUAGE]: '我寫',
    [TagType.FRAMEWORK]: '我用',
    [TagType.DATABASE]: '我存',
    [TagType.DEVOPS]: '我會',
}

export const TAG_TYPE_LABEL: Record<TagType, string> = {
    [TagType.ROLE]: '身分',
    [TagType.LANGUAGE]: '程式語言',
    [TagType.FRAMEWORK]: '框架',
    [TagType.DATABASE]: '資料庫',
    [TagType.DEVOPS]: '雲端維運',
    [TagType.CUSTOM]: '自訂',
}

// 第 2 字 → type(autofiller 用):打「我寫」→ LANGUAGE
export const TAG_TYPE_SECOND_CHAR: Partial<Record<TagType, string>> = {
    [TagType.ROLE]: '是',
    [TagType.LANGUAGE]: '寫',
    [TagType.FRAMEWORK]: '用',
    [TagType.DATABASE]: '存',
    [TagType.DEVOPS]: '會',
}

export interface Tag {
    tagId: string
    type: TagType
    content: string
    isCustom: boolean
}

export type GroupedTags = Record<TagType, Tag[]>

export interface Social {
    id: number
    platform: string
    links: string
}

export interface Sticker {
    id: number
    sticker: string | null
}

export interface UserProfile {
    userId: string
    username: string
    furName: string | null
    avatar: string | null
    avatarColor: string | null
    avatarBorder: boolean
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
    avatarBorder?: boolean
}

export interface CreateProfileRequest {
    username?: string
    furName?: string
    avatar?: string
    avatarColor?: string
    avatarBorder?: boolean
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
