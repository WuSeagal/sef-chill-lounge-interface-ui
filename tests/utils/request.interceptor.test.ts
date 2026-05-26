import { describe, it, expect, beforeEach, vi } from 'vitest'

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }))

vi.mock('@/router', () => ({
    default: { push: pushMock },
}))

import service from '@/utils/request'

const rejectedHandler = (service.interceptors.response as any).handlers[0].rejected
const fulfilledHandler = (service.interceptors.response as any).handlers[0].fulfilled

describe('axios response interceptor', () => {
    beforeEach(() => {
        pushMock.mockClear()
    })

    it('500 response 觸發 router.push to /error with code=500 and from', async () => {
        const error = {
            response: { status: 500, data: {} },
            config: { url: '/api/user/profile' },
        }
        await expect(rejectedHandler(error)).rejects.toBeDefined()
        expect(pushMock).toHaveBeenCalledWith({
            path: '/error',
            query: { code: 500, from: '/api/user/profile' },
        })
    })

    it('404 response 觸發 router.push to /error with code=404', async () => {
        const error = {
            response: { status: 404, data: {} },
            config: { url: '/api/messages/999' },
        }
        await expect(rejectedHandler(error)).rejects.toBeDefined()
        expect(pushMock).toHaveBeenCalledWith({
            path: '/error',
            query: { code: 404, from: '/api/messages/999' },
        })
    })

    it('401 response 不觸發 router.push（保留既有 OAuth 流程）', async () => {
        const error = {
            response: { status: 401, data: {} },
            config: { url: '/api/anything' },
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
