export type MockMessage = {
    id: string
    userId: string
    nickname: string
    avatarUrl: string
    avatarColor?: string | null
    avatarBorder?: boolean
    content: string
    imageUrl?: string
    timestamp: string
}

const AVATAR_PLACEHOLDER = '/mock-images/avatar-default.png'

export const mockMessages: MockMessage[] = [
    {
        id: 'msg-001',
        userId: 'u-101',
        nickname: '小毛',
        avatarUrl: AVATAR_PLACEHOLDER,
        avatarColor: '#c9826b',
        avatarBorder: true,
        content: '大家好啊！',
        timestamp: '2026-05-20T14:00:00.000Z',
    },
    {
        id: 'msg-002',
        userId: 'u-102',
        nickname: 'Foxy',
        avatarUrl: AVATAR_PLACEHOLDER,
        avatarColor: '#7b9b8f',
        avatarBorder: true,
        content: '剛到場，這次 panel 看起來很不錯',
        timestamp: '2026-05-20T14:01:30.000Z',
    },
    {
        id: 'msg-003',
        userId: 'u-103',
        nickname: '小白',
        avatarUrl: AVATAR_PLACEHOLDER,
        content: '看看這張',
        imageUrl: '/mock-images/chat-image-1.jpg',
        timestamp: '2026-05-20T14:02:15.000Z',
    },
    {
        id: 'msg-004',
        userId: 'u-101',
        nickname: '小毛',
        avatarUrl: AVATAR_PLACEHOLDER,
        content: '哇 好棒！',
        timestamp: '2026-05-20T14:03:00.000Z',
    },
    {
        id: 'msg-005',
        userId: 'u-104',
        nickname: 'Husky01',
        avatarUrl: AVATAR_PLACEHOLDER,
        content: '今天天氣很適合活動',
        timestamp: '2026-05-20T14:04:20.000Z',
    },
    {
        id: 'msg-006',
        userId: 'u-102',
        nickname: 'Foxy',
        avatarUrl: AVATAR_PLACEHOLDER,
        content: '對啊，希望下午不要下雨',
        timestamp: '2026-05-20T14:05:00.000Z',
    },
    {
        id: 'msg-007',
        userId: 'u-105',
        nickname: 'Tiger',
        avatarUrl: AVATAR_PLACEHOLDER,
        content: '',
        imageUrl: '/mock-images/chat-image-2.jpg',
        timestamp: '2026-05-20T14:06:10.000Z',
    },
    {
        id: 'msg-008',
        userId: 'u-103',
        nickname: '小白',
        avatarUrl: AVATAR_PLACEHOLDER,
        content: '哈哈這個圖太可愛了',
        timestamp: '2026-05-20T14:07:00.000Z',
    },
    {
        id: 'msg-009',
        userId: 'u-106',
        nickname: '橘子',
        avatarUrl: AVATAR_PLACEHOLDER,
        content: '我等等去買咖啡',
        timestamp: '2026-05-20T14:08:30.000Z',
    },
    {
        id: 'msg-010',
        userId: 'u-104',
        nickname: 'Husky01',
        avatarUrl: AVATAR_PLACEHOLDER,
        content: '幫我點一杯拿鐵',
        timestamp: '2026-05-20T14:09:00.000Z',
    },
    {
        id: 'msg-011',
        userId: 'u-101',
        nickname: '小毛',
        avatarUrl: AVATAR_PLACEHOLDER,
        content: '我也要',
        timestamp: '2026-05-20T14:09:15.000Z',
    },
    {
        id: 'msg-012',
        userId: 'u-107',
        nickname: '阿狼',
        avatarUrl: AVATAR_PLACEHOLDER,
        content: '剛拍到一隻',
        imageUrl: '/mock-images/chat-image-3.jpg',
        timestamp: '2026-05-20T14:11:00.000Z',
    },
    {
        id: 'msg-013',
        userId: 'u-102',
        nickname: 'Foxy',
        avatarUrl: AVATAR_PLACEHOLDER,
        content: '好讚的照片',
        timestamp: '2026-05-20T14:12:00.000Z',
    },
    {
        id: 'msg-014',
        userId: 'u-105',
        nickname: 'Tiger',
        avatarUrl: AVATAR_PLACEHOLDER,
        content: '今天人有點多',
        timestamp: '2026-05-20T14:13:30.000Z',
    },
    {
        id: 'msg-015',
        userId: 'u-103',
        nickname: '小白',
        avatarUrl: AVATAR_PLACEHOLDER,
        content: '對啊，比上次多',
        timestamp: '2026-05-20T14:14:00.000Z',
    },
    {
        id: 'msg-016',
        userId: 'u-106',
        nickname: '橘子',
        avatarUrl: AVATAR_PLACEHOLDER,
        content: '咖啡買回來了',
        timestamp: '2026-05-20T14:25:00.000Z',
    },
    {
        id: 'msg-017',
        userId: 'u-104',
        nickname: 'Husky01',
        avatarUrl: AVATAR_PLACEHOLDER,
        content: '感謝',
        timestamp: '2026-05-20T14:25:30.000Z',
    },
    {
        id: 'msg-018',
        userId: 'u-101',
        nickname: '小毛',
        avatarUrl: AVATAR_PLACEHOLDER,
        content: '謝啦',
        timestamp: '2026-05-20T14:25:45.000Z',
    },
    {
        id: 'msg-019',
        userId: 'u-107',
        nickname: '阿狼',
        avatarUrl: AVATAR_PLACEHOLDER,
        content: '等等要去簽名',
        timestamp: '2026-05-20T14:30:00.000Z',
    },
    {
        id: 'msg-020',
        userId: 'u-102',
        nickname: 'Foxy',
        avatarUrl: AVATAR_PLACEHOLDER,
        content: '一起一起',
        timestamp: '2026-05-20T14:30:30.000Z',
    },
]
