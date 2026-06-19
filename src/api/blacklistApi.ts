import service from '@/utils/request'
import type { BlacklistEntry } from '@/types/blacklist'

// utils/request interceptor 已 unwrap 為 { code, message, data }；helper 再剝 .data 給呼叫端。
// 沿用 GET/POST + ApiResponse 信封慣例：封禁/解封皆 POST { userId }（無 DELETE/PUT）。

export async function fetchBlacklist(): Promise<BlacklistEntry[]> {
    const res: any = await service.get('/blacklist')
    return res.data
}

export async function banUser(userId: string): Promise<void> {
    await service.post('/blacklist', { userId })
}

export async function removeFromBlacklist(userId: string): Promise<void> {
    await service.post('/blacklist/remove', { userId })
}
