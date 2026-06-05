/**
 * 純函式：依可用空間與護照原始尺寸算出單一等比縮放倍率（transform: scale 用）。
 * full 模式同時受寬、高限制；非 full 只受寬限制。抽成純函式以便不依賴真實 DOM 單元測試。
 */
export interface FitInput {
    /** 可用寬度（px） */
    availW: number
    /** 可用高度（px）；非 full 模式忽略 */
    availH: number
    /** 護照原始設計寬（px） */
    natW: number
    /** 護照原始高度（px，含內容） */
    natH: number
    /** 是否為放大（full）模式：true 同時吃寬高，false 只吃寬 */
    full: boolean
}

function validRatio(avail: number, nat: number): number | null {
    if (!Number.isFinite(avail) || avail <= 0) return null
    if (!Number.isFinite(nat) || nat <= 0) return null
    return avail / nat
}

export function computeFitScale({ availW, availH, natW, natH, full }: FitInput): number {
    if (!Number.isFinite(natW) || natW <= 0) return 1
    const ratios: number[] = [1]
    const w = validRatio(availW, natW)
    if (w !== null) ratios.push(w)
    if (full) {
        const h = validRatio(availH, natH)
        if (h !== null) ratios.push(h)
    }
    const scale = Math.min(...ratios)
    return Number.isFinite(scale) && scale > 0 ? scale : 1
}
