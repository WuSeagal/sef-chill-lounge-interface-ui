import { toBlob } from 'html-to-image'

/** 由 furName 產生下載檔名；保留中英數，其餘轉底線，空白則 fallback。 */
export function buildPassportFileName(furName: string | null | undefined): string {
    const slug = (furName ?? '')
        .trim()
        .replace(/[^\p{L}\p{N}_-]+/gu, '_')
        .replace(/^_+|_+$/g, '')
    return slug ? `passport-${slug}.png` : 'passport.png'
}

interface ExportOpts {
    fileName: string
}

function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onerror = () => reject(reader.error ?? new Error('read_failed'))
        reader.onloadend = () => resolve(reader.result as string)
        reader.readAsDataURL(blob)
    })
}

/**
 * 匯出前把護照內每張 <img> 以「回應實際的 Content-Type」預先轉成 data URL，再交給 html-to-image。
 * 繞過 html-to-image「依 URL 副檔名猜 MIME」的雷：後端缺檔會回退 SVG 佔位圖（image/svg+xml），
 * 但 URL 仍是 .png → html-to-image 會組出 data:image/png 卻塞 SVG bytes → 解碼失敗 → 整體匯出掛掉。
 * 改由我們依 blob 實際型別組 data URL，真實圖與佔位 SVG 都能正確嵌入。
 * 單張抓取失敗則略過該張（best-effort），不阻斷整體匯出。回傳還原函式。
 */
async function inlinePassportImages(cardEl: HTMLElement): Promise<() => void> {
    const imgs = Array.from(cardEl.querySelectorAll<HTMLImageElement>('img'))
    const restores: Array<() => void> = []
    await Promise.all(imgs.map(async (img) => {
        const orig = img.getAttribute('src')
        if (!orig || orig.startsWith('data:')) return
        try {
            const res = await fetch(orig, { mode: 'cors' })
            const blob = await res.blob()
            const dataUrl = await blobToDataUrl(blob)
            img.setAttribute('src', dataUrl)
            restores.push(() => img.setAttribute('src', orig))
            if (typeof img.decode === 'function') {
                await img.decode().catch(() => {})
            }
        } catch {
            // best-effort：單張失敗就留原樣，不讓整體匯出失敗
        }
    }))
    return () => { for (const restore of restores) restore() }
}

/**
 * 把護照 .passport 元素純前端匯出成 png 並下載。
 * - style:{transform:'none'} 只套到 clone，把螢幕上的 scale 還原成原寸 800px（不動 live DOM 尺寸）。
 * - 內層捲動容器以負 margin-top 把當前 scrollTop「烤進」靜態畫面（html-to-image clone 會重置 scrollTop）。
 * - export-mode class 藏箭頭/漸層 affordance。
 * - 匯出前先把所有 <img> 依實際 Content-Type 內嵌成 data URL（見 inlinePassportImages），
 *   避免後端缺檔回退 SVG 但 URL 為 .png 時，html-to-image 依副檔名誤判 MIME 導致解碼失敗。
 * 失敗時 throw，並於 finally 還原所有暫時樣式與圖片 src。
 */
export async function exportPassportToPng(cardEl: HTMLElement, opts: ExportOpts): Promise<void> {
    const restores: Array<() => void> = []
    const scrollers = Array.from(
        cardEl.querySelectorAll<HTMLElement>('.ps-tag-scroll, .ps-social-scroll'),
    )
    for (const sc of scrollers) {
        const child = sc.firstElementChild as HTMLElement | null
        if (!child || sc.scrollTop <= 0) continue
        // 負 margin 會縮短 scrollHeight，瀏覽器可能把 live scrollTop 夾(clamp)到較小值；
        // 還原時除了復原 margin，也把 scrollTop 設回原值，避免匯出後畫面殘留在被夾的位置（頂端）。
        const savedScrollTop = sc.scrollTop
        const prev = child.style.marginTop
        child.style.marginTop = `-${savedScrollTop}px`
        restores.push(() => {
            child.style.marginTop = prev
            sc.scrollTop = savedScrollTop
        })
    }
    cardEl.classList.add('export-mode')
    let restoreImages: () => void = () => {}
    try {
        restoreImages = await inlinePassportImages(cardEl)
        const blob = await toBlob(cardEl, {
            pixelRatio: 2,
            style: { transform: 'none' },
        })
        if (!blob) throw new Error('passport_export_blob_null')
        triggerDownload(blob, opts.fileName)
    } finally {
        restoreImages()
        cardEl.classList.remove('export-mode')
        for (const restore of restores) restore()
    }
}

function triggerDownload(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
}
