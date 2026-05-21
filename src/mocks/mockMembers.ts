import type { MockUser } from './mockUser'

export const mockMembers: MockUser[] = [
    {
        id: 'u-101',
        nickname: '小毛',
        avatarUrl: '/mock-images/avatar-default.png',
        avatarBgColor: '#8c8672',
        tags: ['獸聚常客', '台北', 'wolf'],
        socialLinks: [
            { platform: 'twitter', url: 'https://twitter.com/example' },
            { platform: 'plurk', url: 'https://www.plurk.com/example' },
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
    },
    {
        id: 'u-102',
        nickname: 'Foxy',
        avatarUrl: '/mock-images/avatar-default.png',
        avatarBgColor: '#b56b3c',
        tags: ['fox', '高雄'],
        socialLinks: [
            { platform: 'twitter', url: 'https://twitter.com/foxy' },
        ],
        stickers: [],
        topicCard: {
            id: 'card-102',
            topicId: 'T-002',
            content: '上次獸聚最印象深刻的事情？',
        },
        donateUrl: '',
    },
    {
        id: 'u-103',
        nickname: '小白',
        avatarUrl: '/mock-images/avatar-default.png',
        avatarBgColor: '#dcd2bd',
        tags: ['arctic-fox', '畫師'],
        socialLinks: [
            { platform: 'plurk', url: 'https://plurk.com/baixiao' },
            { platform: 'fa', url: 'https://furaffinity.net/user/baixiao' },
        ],
        stickers: [],
        topicCard: {
            id: 'card-103',
            topicId: 'T-003',
            content: '推薦一首最近常聽的歌',
        },
        donateUrl: '',
    },
    {
        id: 'u-104',
        nickname: 'Husky01',
        avatarUrl: '/mock-images/avatar-default.png',
        avatarBgColor: '#5b6e8f',
        tags: ['husky', '台中'],
        socialLinks: [
            { platform: 'twitter', url: 'https://twitter.com/husky01' },
        ],
        stickers: [],
        topicCard: {
            id: 'card-104',
            topicId: 'T-004',
            content: '今天穿著的造型靈感來自哪裡？',
        },
        donateUrl: '',
    },
    {
        id: 'u-105',
        nickname: 'Tiger',
        avatarUrl: '/mock-images/avatar-default.png',
        avatarBgColor: '#c87d2a',
        tags: ['tiger', '台南'],
        socialLinks: [
            { platform: 'twitter', url: 'https://twitter.com/tigerxx' },
        ],
        stickers: [],
        topicCard: {
            id: 'card-105',
            topicId: 'T-005',
            content: '最想嘗試的新興趣是什麼？',
        },
        donateUrl: '',
    },
    {
        id: 'u-106',
        nickname: '橘子',
        avatarUrl: '/mock-images/avatar-default.png',
        avatarBgColor: '#e09a3c',
        tags: ['cat', '台北', '攝影'],
        socialLinks: [
            { platform: 'instagram', url: 'https://instagram.com/orange' },
        ],
        stickers: [],
        topicCard: {
            id: 'card-106',
            topicId: 'T-006',
            content: '對方的設定有什麼讓你好奇？',
        },
        donateUrl: '',
    },
    {
        id: 'u-107',
        nickname: '阿狼',
        avatarUrl: '/mock-images/avatar-default.png',
        avatarBgColor: '#7c6a4e',
        tags: ['wolf', '新竹'],
        socialLinks: [
            { platform: 'twitter', url: 'https://twitter.com/awolf' },
        ],
        stickers: [],
        topicCard: {
            id: 'card-107',
            topicId: 'T-007',
            content: '聊聊最近看的一部作品',
        },
        donateUrl: '',
    },
]
