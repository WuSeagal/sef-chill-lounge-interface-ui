import { ref, type Ref } from 'vue'
import { mockTopics, type MockTopic } from '@/mocks/mockTopics'

// structuredClone for deep copy so mutations don't leak into the mock constant.
const topicsRef = ref<MockTopic[]>(structuredClone(mockTopics))

export type UseMockTopicsReturn = {
    topics: Ref<MockTopic[]>
    drawRandom: () => MockTopic
}

export function useMockTopics(): UseMockTopicsReturn {
    function drawRandom(): MockTopic {
        const pool = topicsRef.value
        if (pool.length === 0) {
            return { id: '', topicId: '', content: '' }
        }
        const idx = Math.floor(Math.random() * pool.length)
        return { ...pool[idx] }
    }

    return {
        topics: topicsRef,
        drawRandom,
    }
}

/** Test-only: resets singleton state to the original mockTopics. Do NOT call from production code. */
export function resetMockTopicsForTest() {
    topicsRef.value = structuredClone(mockTopics)
}
