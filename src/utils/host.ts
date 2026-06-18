// 主持人（host）判定：寫死單一 Google provider user id，鏡像後端 HostAuthz。
// 僅用於控制刪除等 host 專屬 UI 的顯隱；真正授權邊界在後端，前端常數非安全依據。
export const HOST_PROVIDER_USER_ID = '111427449810799428954'

export function isHost(providerUserId: string | null | undefined): boolean {
    return providerUserId === HOST_PROVIDER_USER_ID
}
