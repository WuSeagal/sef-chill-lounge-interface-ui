import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createAppI18n } from '@/i18n'
import ErrorPage from '@/views/ErrorPage.vue'

function makeRouter() {
    return createRouter({
        history: createMemoryHistory(),
        routes: [
            { path: '/', component: { template: '<div>home</div>' } },
            { path: '/error', component: ErrorPage },
        ],
    })
}

async function mountWith(query: Record<string, string | number>) {
    const router = makeRouter()
    await router.push({ path: '/error', query: query as any })
    await router.isReady()
    const wrapper = mount(ErrorPage, {
        global: {
            plugins: [router, createAppI18n()],
        },
    })
    return { wrapper, router }
}

describe('ErrorPage', () => {
    it('顯示 404 小標題「找不到頁面」', async () => {
        const { wrapper } = await mountWith({ code: 404 })
        expect(wrapper.text()).toContain('哎呀')
        expect(wrapper.text()).toContain('找不到頁面')
        expect(wrapper.text()).toContain('CODE')
        expect(wrapper.text()).toContain('404')
    })

    it('顯示 500 小標題「伺服器錯誤」', async () => {
        const { wrapper } = await mountWith({ code: 500 })
        expect(wrapper.text()).toContain('伺服器錯誤')
    })

    it('code=0 顯示「連線中斷」', async () => {
        const { wrapper } = await mountWith({ code: 0 })
        expect(wrapper.text()).toContain('連線中斷')
    })

    it('無 code query 預設「連線中斷」', async () => {
        const { wrapper } = await mountWith({})
        expect(wrapper.text()).toContain('連線中斷')
    })

    it('顯示 from query 內容', async () => {
        const { wrapper } = await mountWith({ code: 500, from: '/api/test' })
        expect(wrapper.text()).toContain('/api/test')
    })

    it('點 CTA 按鈕觸發 router.push to /', async () => {
        const { wrapper, router } = await mountWith({ code: 404 })
        const spy = vi.spyOn(router, 'push')
        await wrapper.find('[data-test="back-home"]').trigger('click')
        expect(spy).toHaveBeenCalledWith('/')
    })

    it('CTA 顯示「回到聊天」', async () => {
        const { wrapper } = await mountWith({ code: 404 })
        expect(wrapper.find('[data-test="back-home"]').text()).toContain('回到聊天')
    })

    it('渲染 error-hero.svg 主視覺', async () => {
        const { wrapper } = await mountWith({ code: 404 })
        const img = wrapper.find('img[data-test="error-hero"]')
        expect(img.exists()).toBe(true)
        expect(img.attributes('src')).toContain('error-hero.svg')
    })
})
