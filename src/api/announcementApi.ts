import request from '@/utils/request'

/**
 * 設定 / 清除主持人公告（host 限定）。傳空字串＝清除（取消釘選）。
 * 後端 host 驗證；成功後廣播 ANNOUNCEMENT 事件。
 */
export async function setAnnouncement(text: string): Promise<void> {
    await request.post('/announcement', { text })
}
