import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const replaceMock = vi.fn()

vi.mock('vue-router', () => ({
    useRouter: () => ({
        replace: replaceMock,
    }),
}))

import GoogleCallback from '@/views/GoogleCallback.vue'

describe('GoogleCallback', () => {
    beforeEach(() => {
        replaceMock.mockReset()
        vi.unstubAllGlobals()
        vi.stubEnv('VITE_ENDPOINT', 'http://localhost:9041')
    })

    it('redirects to /chat after successful google auth', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
        }))

        const originalLocation = window.location
        delete (window as unknown as { location?: Location }).location
        ;(window as unknown as { location: Partial<Location> }).location = {
            ...originalLocation,
            search: '?code=test-auth-code',
        }

        mount(GoogleCallback)
        await flushPromises()

        expect(fetch).toHaveBeenCalledWith(
            'http://localhost:9041/user/googleAuth',
            expect.objectContaining({
                method: 'POST',
                credentials: 'include',
            }),
        )
        expect(replaceMock).toHaveBeenCalledWith('/chat')
    })

    it('renders lizard img element', () => {
        const wrapper = mount(GoogleCallback)
        expect(wrapper.find('img').exists()).toBe(true)
    })

    it('lizard img has alt attribute "lizardchi"', () => {
        const wrapper = mount(GoogleCallback)
        expect(wrapper.find('img').attributes('alt')).toBe('lizardchi')
    })

    it('renders the SEF·CLI title', () => {
        const wrapper = mount(GoogleCallback)
        expect(wrapper.text()).toContain('SEF·CLI')
    })

    it('renders the loading message 正在替你找位子', () => {
        const wrapper = mount(GoogleCallback)
        expect(wrapper.text()).toContain('正在替你找位子')
    })
})
