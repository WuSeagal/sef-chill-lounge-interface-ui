import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import TopicCardTab from '@/components/TopicCardTab.vue'
import type { UserProfile } from '@/types/user'

const profileRef = ref<UserProfile | null>({
    userId: 'u-1', username: '小毛', furName: 'MaoMao', avatar: null,
    avatarColor: null, topicId: 't-1',
    topic: { topicId: 't-1', content: '你的設定中最喜歡哪個元素？' },
})

const redrawTopicCardMock = vi.fn().mockResolvedValue(undefined)

vi.mock('@/composables/useUser', () => ({
    useUser: () => ({
        profile: profileRef,
        redrawTopicCard: redrawTopicCardMock,
    }),
}))

describe('TopicCardTab', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('顯示當前話題卡內容,前後以粗體雙引號包覆（比照 onboarding）', () => {
        const wrapper = mount(TopicCardTab)
        const content = wrapper.find('.topic-card-tab__content')
        expect(content.text()).toContain('你的設定中最喜歡哪個元素？')
        const quotes = content.findAll('b')
        expect(quotes.length).toBe(2)
        expect(quotes[0].text()).toBe('"')
        expect(quotes[1].text()).toBe('"')
    })

    it('hint 顯示邀請式新文案', () => {
        const wrapper = mount(TopicCardTab)
        expect(wrapper.find('.topic-card-tab__hint').text())
            .toBe('想要開話題的好點子？ 抽抽看不同的話題卡來找個新話題來聊天吧！')
    })

    it('點重抽呼叫 redrawTopicCard', async () => {
        const wrapper = mount(TopicCardTab)
        await wrapper.find('[data-test=redraw-btn]').trigger('click')
        await flushPromises()
        expect(redrawTopicCardMock).toHaveBeenCalledTimes(1)
    })

    it('無 topic 時顯示 fallback', () => {
        const noTopicProfile = { ...profileRef.value!, topic: null }
        profileRef.value = noTopicProfile
        const wrapper = mount(TopicCardTab)
        expect(wrapper.find('.topic-card-tab__content').text()).toBe('(未抽取)')
    })

    it('內容置於水平垂直置中強調的 stage 容器', () => {
        const wrapper = mount(TopicCardTab)
        expect(wrapper.find('.topic-card-tab__stage').exists()).toBe(true)
    })
})
