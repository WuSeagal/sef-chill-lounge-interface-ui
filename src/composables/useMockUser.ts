import { ref, watch, type Ref } from 'vue'
import { mockUser, type MockUser, type TopicCard } from '@/mocks/mockUser'
import { mockMembers } from '@/mocks/mockMembers'

// Singleton state — replaced with API store in future plans.
// structuredClone gives a deep copy so mutations don't leak into the imported `mockUser` constant.
const userRef = ref<MockUser>(structuredClone(mockUser))

watch(userRef, (u) => {
    const m = mockMembers.find(m => m.id === u.id)
    if (!m) return
    m.nickname = u.nickname
    m.avatarUrl = u.avatarUrl
    m.avatarBgColor = u.avatarBgColor
    m.tags = [...u.tags]
    m.socialLinks = u.socialLinks.map(l => ({ ...l }))
    m.stickers = [...u.stickers]
    m.topicCard = { ...u.topicCard }
    m.donateUrl = u.donateUrl
}, { deep: true })

export type UseMockUserReturn = {
    user: Ref<MockUser>
    setNickname: (nickname: string) => void
    redrawTopicCard: (pool: TopicCard[]) => void
}

export function useMockUser(): UseMockUserReturn {
    function setNickname(nickname: string) {
        userRef.value.nickname = nickname
    }

    function redrawTopicCard(pool: TopicCard[]) {
        if (pool.length === 0) {
            return
        }
        const idx = Math.floor(Math.random() * pool.length)
        userRef.value.topicCard = { ...pool[idx] }
    }

    return {
        user: userRef,
        setNickname,
        redrawTopicCard,
    }
}

/** Test-only: resets singleton state to the original mockUser. Do NOT call from production code. */
export function resetMockUserForTest() {
    userRef.value = structuredClone(mockUser)
}
