import { ref, type Ref } from 'vue'
import { mockTopics, type MockTopic } from '@/mocks/mockTopics'

const topicsRef = ref<MockTopic[]>([...mockTopics])

export type UseMockTopicsReturn = {
    topics: Ref<MockTopic[]>
    drawRandom: () => MockTopic
}

export function useMockTopics(): UseMockTopicsReturn {
    function drawRandom(): MockTopic {
        const pool = topicsRef.value
        const idx = Math.floor(Math.random() * pool.length)
        return { ...pool[idx] }
    }

    return {
        topics: topicsRef,
        drawRandom,
    }
}
