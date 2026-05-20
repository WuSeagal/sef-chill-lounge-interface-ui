import { ref, type Ref } from 'vue'
import { mockMessages, type MockMessage } from '@/mocks/mockMessages'

type AppendInput = Omit<MockMessage, 'id' | 'timestamp'>

// structuredClone for deep copy so test mutations don't leak into the mock constant.
const messagesRef = ref<MockMessage[]>(structuredClone(mockMessages))
let counter = mockMessages.length

export type UseMockMessagesReturn = {
    messages: Ref<MockMessage[]>
    appendMessage: (input: AppendInput) => void
}

export function useMockMessages(): UseMockMessagesReturn {
    function appendMessage(input: AppendInput) {
        counter += 1
        const id = `msg-${String(counter).padStart(3, '0')}`
        messagesRef.value.push({
            ...input,
            id,
            timestamp: new Date().toISOString(),
        })
    }

    return {
        messages: messagesRef,
        appendMessage,
    }
}

/** Test-only: resets singleton state. Do NOT call from production code. */
export function resetMockMessagesForTest() {
    messagesRef.value = structuredClone(mockMessages)
    counter = mockMessages.length
}
