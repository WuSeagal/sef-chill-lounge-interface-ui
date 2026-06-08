import { describe, it, expect, beforeEach, vi } from 'vitest'

const { pushMock, currentRoute } = vi.hoisted(() => ({
    pushMock: vi.fn(),
    currentRoute: { value: { path: '/' } },
}))

vi.mock('@/router', () => ({
    default: { push: pushMock, currentRoute },
}))

import service from '@/utils/request'

const rejectedHandler = (service.interceptors.response as any).handlers[0].rejected
const fulfilledHandler = (service.interceptors.response as any).handlers[0].fulfilled

describe('axios response interceptor', () => {
    beforeEach(() => {
        pushMock.mockClear()
        currentRoute.value.path = '/'
    })

    it('非白名單端點 500 response 觸發 router.push to /error with code=500 and from', async () => {
        const error = {
            response: { status: 500, data: {} },
            config: { url: '/some/unknown-endpoint' },
        }
        await expect(rejectedHandler(error)).rejects.toBeDefined()
        expect(pushMock).toHaveBeenCalledWith({
            path: '/error',
            query: { code: 500, from: '/some/unknown-endpoint' },
        })
    })

    // Q2:/chat、/dashboard 頁內互動會打的讀取端點皆有自己的 toast/inline 錯誤處理，
    // 不應整頁導去 /error（gate on URL，連 5xx 也不導，避免毀掉 chat/dashboard session）。
    it.each([
        ['/messages', '載入訊息（init / loadMore）'],
        ['/members', '成員列表'],
        ['/tags', '可選標籤'],
        ['/user/tags', '使用者標籤'],
        ['/user/profile', '當前使用者 profile'],
        ['/user/profile/abc123', '點 user 開 popup'],
        ['/user/social-links', '社群連結'],
        ['/user/topic-card/redraw', '「/」抽話題卡 / TopicCardTab'],
        ['/topics/random', '隨機話題'],
        ['/feedback', '意見回饋送出（FeedbackTab push.promise reject toast）'],
    ])('白名單端點 %s 500 不觸發 router.push（%s 由呼叫端 toast/inline 處理）', async (url) => {
        const error = {
            response: { status: 500, data: {} },
            config: { url },
        }
        await expect(rejectedHandler(error)).rejects.toBeDefined()
        expect(pushMock).not.toHaveBeenCalled()
    })

    it('404 response 不觸發 router.push（交由呼叫端處理，如 profile-not-found = 尚未 onboarding）', async () => {
        const error = {
            response: { status: 404, data: {} },
            config: { url: '/api/user/profile' },
        }
        await expect(rejectedHandler(error)).rejects.toBeDefined()
        expect(pushMock).not.toHaveBeenCalled()
    })

    it('401 response 不觸發 router.push（保留既有 OAuth 流程）', async () => {
        const error = {
            response: { status: 401, data: {} },
            config: { url: '/api/anything' },
        }
        await expect(rejectedHandler(error)).rejects.toBeDefined()
        expect(pushMock).not.toHaveBeenCalled()
    })

    it('413 on /upload/chat-image 不觸發 router.push（交由呼叫端 toast 處理）', async () => {
        const error = {
            response: { status: 413, data: { message: '圖片過大' } },
            config: { url: '/upload/chat-image' },
        }
        await expect(rejectedHandler(error)).rejects.toBeDefined()
        expect(pushMock).not.toHaveBeenCalled()
    })

    it('upload 端點即使 500 也不轉跳（gate on URL 非 status，避免毀掉 chat session）', async () => {
        const error = {
            response: { status: 500, data: {} },
            config: { url: '/upload/sticker' },
        }
        await expect(rejectedHandler(error)).rejects.toBeDefined()
        expect(pushMock).not.toHaveBeenCalled()
    })

    it('network error (no response) 觸發 router.push with code=0', async () => {
        const error = {
            response: undefined,
            config: { url: '/api/something' },
        }
        await expect(rejectedHandler(error)).rejects.toBeDefined()
        expect(pushMock).toHaveBeenCalledWith({
            path: '/error',
            query: { code: 0, from: '/api/something' },
        })
    })

    it('已在 /error 頁時不再 push（防 redirect loop）', async () => {
        currentRoute.value.path = '/error'
        const error = {
            response: { status: 500, data: {} },
            config: { url: '/api/user/profile' },
        }
        await expect(rejectedHandler(error)).rejects.toBeDefined()
        expect(pushMock).not.toHaveBeenCalled()
    })

    it('已在 /error 頁 + 401 仍 reject 且不 push（鎖定 401 分支早於 guard）', async () => {
        currentRoute.value.path = '/error'
        const error = {
            response: { status: 401, data: {} },
            config: { url: '/api/anything' },
        }
        await expect(rejectedHandler(error)).rejects.toBeDefined()
        expect(pushMock).not.toHaveBeenCalled()
    })

    it('既有 success (code===200) 路徑不動', async () => {
        const response = {
            data: { code: 200, message: 'ok', data: { foo: 'bar' } },
        }
        const result = fulfilledHandler(response)
        expect(result).toEqual(response.data)
        expect(pushMock).not.toHaveBeenCalled()
    })

    it('success path 但 code!==200 仍 reject 且不轉跳', async () => {
        const response = {
            data: { code: 500, message: '業務錯誤', data: null },
        }
        await expect(() => fulfilledHandler(response)).rejects.toBeDefined()
        expect(pushMock).not.toHaveBeenCalled()
    })
})
