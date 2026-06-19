import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useBlacklistAutofill } from '@/composables/useBlacklistAutofill'
import type { Member } from '@/types/user'

function makeMembers(): Member[] {
    return [
        { userId: 'u-1', username: 'foxdev', furName: '小狐狸', avatar: null, avatarColor: null },
        { userId: 'u-2', username: 'capy', furName: '水豚君', avatar: null, avatarColor: null },
        { userId: 'u-3', username: 'tobyR', furName: null, avatar: null, avatarColor: null },
    ]
}

describe('useBlacklistAutofill', () => {
    it('比對 furName 子字串', () => {
        const input = ref('狐')
        const members = ref(makeMembers())
        const { candidates } = useBlacklistAutofill(input, members)
        expect(candidates.value.map(c => c.userId)).toEqual(['u-1'])
    })

    it('比對 username 子字串（大小寫不敏感）', () => {
        const input = ref('CAPY')
        const members = ref(makeMembers())
        const { candidates } = useBlacklistAutofill(input, members)
        expect(candidates.value.map(c => c.userId)).toEqual(['u-2'])
    })

    it('furName 為 null 的 member 仍可用 username 比對', () => {
        const input = ref('toby')
        const members = ref(makeMembers())
        const { candidates } = useBlacklistAutofill(input, members)
        expect(candidates.value.map(c => c.userId)).toEqual(['u-3'])
    })

    it('空輸入不顯示候選', () => {
        const input = ref('')
        const members = ref(makeMembers())
        const { candidates } = useBlacklistAutofill(input, members)
        expect(candidates.value).toEqual([])
    })

    it('選定後 selectedUserId 設定為該 member，且輸入填入 furName', () => {
        const input = ref('狐')
        const members = ref(makeMembers())
        const { candidates, select, selectedUserId } = useBlacklistAutofill(input, members)
        select(candidates.value[0])
        expect(selectedUserId.value).toBe('u-1')
        expect(input.value).toBe('小狐狸')
    })

    it('選定後再編輯輸入 → 清除 selectedUserId（避免拿舊選取送出）', async () => {
        const input = ref('狐')
        const members = ref(makeMembers())
        const { candidates, select, selectedUserId } = useBlacklistAutofill(input, members)
        select(candidates.value[0])
        expect(selectedUserId.value).toBe('u-1')

        input.value = '狐狸X'
        await Promise.resolve()
        expect(selectedUserId.value).toBeNull()
    })

    it('canSubmit 僅在有有效 selectedUserId 時為真', () => {
        const input = ref('狐')
        const members = ref(makeMembers())
        const { candidates, select, canSubmit } = useBlacklistAutofill(input, members)
        expect(canSubmit.value).toBe(false)
        select(candidates.value[0])
        expect(canSubmit.value).toBe(true)
    })

    it('reset 清空輸入與選取', () => {
        const input = ref('狐')
        const members = ref(makeMembers())
        const { candidates, select, reset, selectedUserId } = useBlacklistAutofill(input, members)
        select(candidates.value[0])
        reset()
        expect(input.value).toBe('')
        expect(selectedUserId.value).toBeNull()
    })
})
