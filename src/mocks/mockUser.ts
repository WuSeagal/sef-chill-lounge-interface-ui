import type { SocialPlatform } from '@/constants/platforms'

export type SocialLink = {
    platform: SocialPlatform
    url: string
}

export type TopicCard = {
    id: string
    topicId: string
    content: string
}

export type MockUser = {
    id: string
    nickname: string
    avatarUrl: string
    avatarBgColor: string
    tags: string[]
    socialLinks: SocialLink[]
    stickers: string[]
    topicCard: TopicCard
    donateUrl: string
}

export const mockUser: MockUser = {
    id: 'u-101',
    nickname: '小毛',
    avatarUrl: '/mock-images/avatar-default.png',
    avatarBgColor: '#8c8672',
    tags: ['獸聚常客', '台北', 'wolf'],
    socialLinks: [
        { platform: 'X', url: 'https://twitter.com/example' },
        { platform: 'PLURK', url: 'https://www.plurk.com/example' },
    ],
    stickers: [
        '/mock-images/sticker-1.png',
        '/mock-images/sticker-2.png',
        '/mock-images/sticker-3.png',
        '/mock-images/sticker-4.png',
        '/mock-images/sticker-5.png',
    ],
    topicCard: {
        id: 'card-001',
        topicId: 'T-001',
        content: '你的設定中最喜歡哪個元素？',
    },
    donateUrl: 'https://example.com/donate',
}
