// 黑名單一筆（host 檢視）：以 ADMIN_USER.banned=true 為來源，join ATTENDEE_DATA 取顯示名。
export interface BlacklistEntry {
    userId: string
    furName: string | null
    username: string
}
