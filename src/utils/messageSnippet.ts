const SNIPPET_MAX = 50

/** 回覆預覽用內容摘要，規則對齊後端 MessageService#snippetOf（純文字截斷 50 字；貼圖/純圖有專屬字樣）。 */
export function snippetOf(message: { messageType: string; content: string | null }): string {
    if (message.messageType === 'STICKER') {
        return '[貼圖]'
    }
    const content = message.content
    if (content === null || content === '') {
        return '[圖片]'
    }
    return content.length > SNIPPET_MAX ? content.slice(0, SNIPPET_MAX) + '…' : content
}
