import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/utils/request', () => {
    const get = vi.fn()
    const post = vi.fn()
    return { default: { get, post } }
})

import service from '@/utils/request'
import * as userApi from '@/api/userApi'

describe('userApi', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('fetchMyProfile GETs /user/profile and unwraps data', async () => {
        ;(service.get as any).mockResolvedValue({ data: { userId: 'u-1', username: 'X' } })
        const r = await userApi.fetchMyProfile()
        expect(service.get).toHaveBeenCalledWith('/user/profile')
        expect(r.userId).toBe('u-1')
    })

    it('createMyProfile POSTs body', async () => {
        ;(service.post as any).mockResolvedValue({ data: { userId: 'u-1' } })
        await userApi.createMyProfile({ username: 'A', furName: 'B' })
        expect(service.post).toHaveBeenCalledWith('/user/profile', { username: 'A', furName: 'B' })
    })

    it('updateMyProfile POSTs body to update endpoint', async () => {
        ;(service.post as any).mockResolvedValue({ data: {} })
        await userApi.updateMyProfile({ furName: 'New' })
        expect(service.post).toHaveBeenCalledWith('/user/profile/update', { furName: 'New' })
    })

    it('fetchProfileDetail uses path with userId', async () => {
        ;(service.get as any).mockResolvedValue({ data: { userId: 'u-9' } })
        await userApi.fetchProfileDetail('u-9')
        expect(service.get).toHaveBeenCalledWith('/user/profile/u-9')
    })

    it('addTag POSTs to /user/tags', async () => {
        ;(service.post as any).mockResolvedValue({ data: { tagId: 't-1' } })
        await userApi.addTag({ tagId: 't-1' })
        expect(service.post).toHaveBeenCalledWith('/user/tags', { tagId: 't-1' })
    })

    it('removeTag POSTs remove payload', async () => {
        ;(service.post as any).mockResolvedValue({})
        await userApi.removeTag('t-1')
        expect(service.post).toHaveBeenCalledWith('/user/tags/remove', { tagId: 't-1' })
    })

    it('fetchRandomTopic GETs /topics/random', async () => {
        ;(service.get as any).mockResolvedValue({ data: { topicId: 't-r', content: 'x' } })
        const r = await userApi.fetchRandomTopic()
        expect(service.get).toHaveBeenCalledWith('/topics/random')
        expect(r.topicId).toBe('t-r')
    })

    it('redrawTopicCard POSTs and returns new topic', async () => {
        ;(service.post as any).mockResolvedValue({ data: { topicId: 't-new', content: 'x' } })
        const r = await userApi.redrawTopicCard()
        expect(service.post).toHaveBeenCalledWith('/user/topic-card/redraw')
        expect(r.topicId).toBe('t-new')
    })

    it('fetchMembers GETs /members and returns array', async () => {
        ;(service.get as any).mockResolvedValue({ data: [{ userId: 'a' }] })
        const r = await userApi.fetchMembers()
        expect(service.get).toHaveBeenCalledWith('/members')
        expect(r.length).toBe(1)
    })

    it('fetchDefaultTags GETs /tags and returns array', async () => {
        ;(service.get as any).mockResolvedValue({
            data: [{ tagId: 'tg-001', type: 'species', content: '宅' }],
        })
        const r = await userApi.fetchDefaultTags()
        expect(service.get).toHaveBeenCalledWith('/tags')
        expect(r[0].tagId).toBe('tg-001')
    })

    it('addSocialLink POSTs body', async () => {
        ;(service.post as any).mockResolvedValue({ data: { id: 1 } })
        await userApi.addSocialLink({ platform: 'tw', links: 'https://x' })
        expect(service.post).toHaveBeenCalledWith('/user/social-links', {
            platform: 'tw',
            links: 'https://x',
        })
    })

    it('removeSocialLink POSTs remove payload by id', async () => {
        ;(service.post as any).mockResolvedValue({})
        await userApi.removeSocialLink(1)
        expect(service.post).toHaveBeenCalledWith('/user/social-links/remove', { id: 1 })
    })
})
