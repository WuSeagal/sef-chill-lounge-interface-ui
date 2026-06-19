export interface AuthResponse {
    providerUserId: string
    email: string
    googleName: string
    enabled: boolean
    firstLogin: boolean
    // 即時封禁旗標（來自 /check-auth，反映 DB 當下狀態，非登入快照）：true 時前端於 /chat、/dashboard 顯示封禁畫面。
    banned: boolean
}
