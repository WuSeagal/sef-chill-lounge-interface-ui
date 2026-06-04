/**
 * 純函式：依 scroll 量測值判斷某捲動容器目前是否貼齊頂端 / 底端、以及是否有溢出。
 * 供 scroll affordance（漸層 + 箭頭提示）使用——抽成純函式以便不依賴真實 DOM 單元測試。
 */
export interface ScrollMetrics {
    scrollTop: number
    scrollHeight: number
    clientHeight: number
}

export interface ScrollEdges {
    /** 內容是否超出可視高度（需要捲動） */
    overflowing: boolean
    /** 是否已捲到（或停在）頂端——頂端無更多內容 */
    atTop: boolean
    /** 是否已捲到（或停在）底端——底端無更多內容 */
    atBottom: boolean
}

export function computeScrollEdges(
    { scrollTop, scrollHeight, clientHeight }: ScrollMetrics,
    threshold = 1,
): ScrollEdges {
    const overflowing = scrollHeight - clientHeight > threshold
    if (!overflowing) {
        return { overflowing: false, atTop: true, atBottom: true }
    }
    const atTop = scrollTop <= threshold
    const atBottom = scrollTop + clientHeight >= scrollHeight - threshold
    return { overflowing, atTop, atBottom }
}
