import { ref, type Ref } from 'vue'
import { mockUser, type MockUser, type TopicCard } from '@/mocks/mockUser'

// Singleton state — replaced with API store in future plans.
// structuredClone gives a deep copy so mutations don't leak into the imported `mockUser` constant.
const userRef = ref<MockUser>(structuredClone(mockUser))

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
