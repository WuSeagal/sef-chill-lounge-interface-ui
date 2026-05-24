import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/api/userApi', () => ({
    fetchMyProfile: vi.fn(),
    fetchProfileDetail: vi.fn(),
    createMyProfile: vi.fn(),
    updateMyProfile: vi.fn(),
    redrawTopicCard: vi.fn(),
    addTag: vi.fn(),
    removeTag: vi.fn(),
    addSocialLink: vi.fn(),
    removeSocialLink: vi.fn(),
}))

import * as api from '@/api/userApi'
import { useUser, resetUserStateForTest } from '@/composables/useUser'

describe('useUser', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        resetUserStateForTest()
    })

    it('fetchProfile hydrates profile.value with detail payload on success', async () => {
        ;(api.fetchMyProfile as any).mockResolvedValue({ userId: 'u-1', username: 'A' })
        ;(api.fetchProfileDetail as any).mockResolvedValue({
            userId: 'u-1',
            username: 'A',
            furName: 'AFur',
            tags: [{ tagId: 'tg-1', type: 'species', content: 'fox' }],
            socials: [],
            stickers: [],
            topicId: 't-1',
            topic: { topicId: 't-1', content: 'topic' },
        })
        const u = useUser()
        await u.fetchProfile()
        expect(u.profile.value?.userId).toBe('u-1')
        expect(u.profile.value?.furName).toBe('AFur')
        expect(u.profile.value?.tags?.[0].tagId).toBe('tg-1')
        expect(u.needsOnboarding.value).toBe(false)
        expect(u.loading.value).toBe(false)
    })

    it('fetchProfile sets needsOnboarding on 404', async () => {
        ;(api.fetchMyProfile as any).mockRejectedValue({ response: { status: 404 } })
        const u = useUser()
        await u.fetchProfile()
        expect(u.profile.value).toBeNull()
        expect(u.needsOnboarding.value).toBe(true)
    })

    it('createProfile updates profile and clears needsOnboarding', async () => {
        ;(api.createMyProfile as any).mockResolvedValue({ userId: 'u-1', username: 'X' })
        const u = useUser()
        await u.createProfile({ username: 'X', furName: 'Y' })
        expect(u.profile.value?.userId).toBe('u-1')
        expect(u.needsOnboarding.value).toBe(false)
    })

    it('updateProfile patches profile fields', async () => {
        ;(api.fetchMyProfile as any).mockResolvedValue({
            userId: 'u-1', username: 'A', furName: 'old',
        })
        ;(api.updateMyProfile as any).mockResolvedValue({
            userId: 'u-1', username: 'A', furName: 'new',
        })
        const u = useUser()
        await u.fetchProfile()
        await u.updateProfile({ furName: 'new' })
        expect(u.profile.value?.furName).toBe('new')
    })

    it('redrawTopicCard updates topicId and topic', async () => {
        ;(api.fetchMyProfile as any).mockResolvedValue({
            userId: 'u-1', topicId: 't-1',
        })
        ;(api.redrawTopicCard as any).mockResolvedValue({
            topicId: 't-2', content: 'new',
        })
        const u = useUser()
        await u.fetchProfile()
        await u.redrawTopicCard()
        expect(u.profile.value?.topicId).toBe('t-2')
        expect(u.profile.value?.topic?.content).toBe('new')
    })

    it('redrawTopicCard sets error on 409 no_other_topic_available', async () => {
        ;(api.fetchMyProfile as any).mockResolvedValue({
            userId: 'u-1', topicId: 't-1',
        })
        ;(api.redrawTopicCard as any).mockRejectedValue({
            response: { status: 409, data: { message: 'no_other_topic_available' } },
        })
        const u = useUser()
        await u.fetchProfile()
        await u.redrawTopicCard()
        expect(u.error.value).toContain('沒有其他話題卡')
    })

    it('addTag with new tagId calls API and pushes to profile.tags', async () => {
        ;(api.fetchMyProfile as any).mockResolvedValue({ userId: 'u-1', tags: [] })
        ;(api.fetchProfileDetail as any).mockResolvedValue({
            userId: 'u-1',
            tags: [],
            socials: [],
            stickers: [],
            topic: null,
            topicId: null,
        })
        ;(api.addTag as any).mockResolvedValue({
            tagId: 't-new', type: 'species', content: 'foo',
        })
        const u = useUser()
        await u.fetchProfile()
        await u.addTag({ tagId: 't-new' })
        expect(api.addTag).toHaveBeenCalledWith({ tagId: 't-new' })
        expect(u.profile.value?.tags?.some(t => t.tagId === 't-new')).toBe(true)
    })

    it('addTag skips API call when tagId already in profile.tags', async () => {
        ;(api.fetchMyProfile as any).mockResolvedValue({
            userId: 'u-1',
        })
        ;(api.fetchProfileDetail as any).mockResolvedValue({
            userId: 'u-1',
            tags: [{ tagId: 't-existing', type: 'species', content: 'foo' }],
            socials: [],
            stickers: [],
            topic: null,
            topicId: null,
        })
        const u = useUser()
        await u.fetchProfile()
        await u.addTag({ tagId: 't-existing' })
        expect(api.addTag).not.toHaveBeenCalled()
        expect(u.error.value).toContain('已新增過此 tag')
    })

    it('removeTag removes tag from profile', async () => {
        ;(api.fetchMyProfile as any).mockResolvedValue({
            userId: 'u-1',
        })
        ;(api.fetchProfileDetail as any).mockResolvedValue({
            userId: 'u-1',
            tags: [{ tagId: 't-1', type: 'species', content: 'x' }],
            socials: [],
            stickers: [],
            topic: null,
            topicId: null,
        })
        ;(api.removeTag as any).mockResolvedValue(undefined)
        const u = useUser()
        await u.fetchProfile()
        await u.removeTag('t-1')
        expect(u.profile.value?.tags?.length).toBe(0)
    })

    it('addSocialLink + removeSocialLink mutate profile.socials', async () => {
        ;(api.fetchMyProfile as any).mockResolvedValue({ userId: 'u-1' })
        ;(api.fetchProfileDetail as any).mockResolvedValue({
            userId: 'u-1',
            tags: [],
            socials: [],
            stickers: [],
            topic: null,
            topicId: null,
        })
        ;(api.addSocialLink as any).mockResolvedValue({
            id: 5, platform: 'tw', links: 'https://x',
        })
        ;(api.removeSocialLink as any).mockResolvedValue(undefined)
        const u = useUser()
        await u.fetchProfile()
        await u.addSocialLink({ platform: 'tw', links: 'https://x' })
        expect(u.profile.value?.socials?.length).toBe(1)
        await u.removeSocialLink(5)
        expect(u.profile.value?.socials?.length).toBe(0)
    })
})
