import { ref, type Ref } from 'vue'
import type { DashboardMessage } from '@/types/dashboard'

export type DashboardBubble = {
    id: string
    message: DashboardMessage
    direction: 'left' | 'right'
    x: number
    y: number
    dx: number
    dy: number
    zIndex: number
    isExiting: boolean
    /** 是否播放後空翻入場動畫：僅「進頁面後新收到」的泡泡為 true；
     *  連線 replay 的既有訊息與重掛載的舊泡泡為 false（見 useDashboardFeed liveSince）。 */
    animateEntrance: boolean
    /** 量測值：頭像頂相對 wrapper 頂的垂直 offset（px）。垂直碰撞以「頭像頂/底」為基準，
     *  由 FloatingBubble 量測回寫；量測前預設 0。 */
    avatarOffsetTop: number
    /** 量測值：頭像高度（px，CSS 固定 50）。由 FloatingBubble 量測回寫；量測前預設 AVATAR_H。 */
    avatarH: number
}

const MAX_BUBBLES = 30
const EXIT_DURATION = 500
// 入場動畫總時長上限（後空翻 820ms + 光暈收斂 ~950ms），播畢即清除 animateEntrance，
// 避免日後重掛載（如切頁回來）時 CSS 入場動畫重播。
export const ENTRANCE_ANIM_MS = 1000
// 水平碰撞框寬度（沿用固定框）：寬 = 泡泡 max 276 + 間距 8 + 頭像 36 ≈ 320。
// 左右行為維持現狀（小文字泡泡右緣略短、圖片泡泡左右略超出，皆為已接受取捨）。
const BUBBLE_W = 320
// 出生位置的垂直內縮範圍（只用於 addBubble 的 y 取樣，避免一出生就半截在畫面外）；
// 垂直「碰撞」已改以頭像頂/底為基準（見 avatarVerticalBounds），不再用固定高度夾邊界。
const BUBBLE_H = 290
// 頭像高度（CSS 固定 50px）；垂直碰撞量測前的安全預設。
const AVATAR_H = 50

// ── bounce / motion tuning constants (集中宣告，目視驗收時可調整) ──
/** 出生與反彈共用的全域速度大小區間（px/s） */
export const SPEED_MAG_MIN = 42
export const SPEED_MAG_MAX = 85
/** 反彈時方向擾動的最大幅度（度，uniform ±） */
export const JITTER_MAX_DEG = 25
/** 反彈時速度大小的隨機係數幅度（uniform ±比例） */
export const SPEED_JITTER_RATIO = 0.12
/** 單面牆反彈後，方向相對牆面法線的離牆夾角下限 / 上限（度） */
export const CLAMP_MIN_DEG = 15
export const CLAMP_MAX_DEG = 75
/** 角落雙牆反彈後，方向相對象限平分線的最大偏移（度）；= 半個有效象限弧 */
export const CORNER_MAX_DEV_DEG = (CLAMP_MAX_DEG - CLAMP_MIN_DEG) / 2

const DEG2RAD = Math.PI / 180

export type Wall = 'left' | 'right' | 'top' | 'bottom'

/** 將角度正規化到 (-π, π] */
function normalizeAngle(a: number): number {
    let r = a
    while (r <= -Math.PI) r += 2 * Math.PI
    while (r > Math.PI) r -= 2 * Math.PI
    return r
}

/** 各面牆「朝視窗內側」法線方向的角度（螢幕座標，y 向下） */
function wallNormalAngle(wall: Wall): number {
    switch (wall) {
        case 'left': return 0
        case 'right': return Math.PI
        case 'top': return Math.PI / 2
        case 'bottom': return -Math.PI / 2
    }
}

/** 角落雙牆碰撞時，朝內象限平分線的角度（內側法線向量和的方向） */
function quadrantBisectorAngle(hits: Wall[]): number {
    let nx = 0
    let ny = 0
    for (const wall of hits) {
        if (wall === 'left') nx += 1
        else if (wall === 'right') nx -= 1
        else if (wall === 'top') ny += 1
        else if (wall === 'bottom') ny -= 1
    }
    return Math.atan2(ny, nx)
}

/** 將擾動後的方向夾限在合法區間：單牆 → 離法線 [MIN,MAX]、角落 → 離平分線 ±CORNER_MAX_DEV */
function clampBounceAngle(angle: number, hits: Wall[]): number {
    if (hits.length >= 2) {
        const bisector = quadrantBisectorAngle(hits)
        const dev = normalizeAngle(angle - bisector)
        const maxDev = CORNER_MAX_DEV_DEG * DEG2RAD
        const clamped = Math.max(-maxDev, Math.min(maxDev, dev))
        return normalizeAngle(bisector + clamped)
    }
    const normal = wallNormalAngle(hits[0])
    const phi = normalizeAngle(angle - normal)
    const sign = phi >= 0 ? 1 : -1
    const magnitude = Math.min(
        CLAMP_MAX_DEG * DEG2RAD,
        Math.max(CLAMP_MIN_DEG * DEG2RAD, Math.abs(phi)),
    )
    return normalizeAngle(normal + sign * magnitude)
}

/**
 * 邊界反彈：先鏡面反射使速度朝內，再加入隨機角度擾動 + 夾限，最後對速度大小加入小幅隨機並 clamp 在全域區間。
 * random() 呼叫順序（鎖定）：[1] 角度擾動、[2] 速度大小擾動。
 */
export function bounceVelocity(
    hits: Wall[],
    dx: number,
    dy: number,
    random: () => number,
): { dx: number; dy: number } {
    let rdx = dx
    let rdy = dy
    for (const wall of hits) {
        if (wall === 'left') rdx = Math.abs(rdx)
        else if (wall === 'right') rdx = -Math.abs(rdx)
        else if (wall === 'top') rdy = Math.abs(rdy)
        else if (wall === 'bottom') rdy = -Math.abs(rdy)
    }

    let speed = Math.hypot(rdx, rdy)
    let angle = Math.atan2(rdy, rdx)

    angle += (random() * 2 - 1) * JITTER_MAX_DEG * DEG2RAD
    angle = clampBounceAngle(angle, hits)

    speed *= 1 + (random() * 2 - 1) * SPEED_JITTER_RATIO
    speed = Math.min(SPEED_MAG_MAX, Math.max(SPEED_MAG_MIN, speed))

    return { dx: speed * Math.cos(angle), dy: speed * Math.sin(angle) }
}

/**
 * 垂直碰撞邊界（以「頭像頂/底」為基準，不論泡泡多大）：
 * - `minY`：使頭像頂貼齊視窗頂（`y + avatarOffsetTop = 0`）。
 * - `maxY`：使頭像底貼齊視窗底（`y + avatarOffsetTop + avatarH = viewportH`）。
 * 泡泡本體高於頭像的部分（offsetTop 兩側）任其對稱超出上下緣——沿用原「過高泡泡」行為，套用到全部泡泡。
 * 視窗比頭像還矮的退化情境夾 `maxY ≥ minY`，避免上下夾限互相打架。
 */
export function avatarVerticalBounds(
    avatarOffsetTop: number,
    avatarH: number,
    viewportH: number,
): { minY: number; maxY: number } {
    const minY = 0 - avatarOffsetTop // 0 - x（非一元負號）避免 offsetTop=0 時產生 -0
    const maxY = Math.max(minY, viewportH - avatarH - avatarOffsetTop)
    return { minY, maxY }
}

export type UseDashboardBubblesReturn = {
    bubbles: Ref<DashboardBubble[]>
    addBubble: (message: DashboardMessage, animateEntrance?: boolean) => void
    removeBubble: (messageId: string) => void
    patchProfile: (userId: string, profile: { furName: string | null; avatar: string | null; avatarColor: string | null; avatarBorder: boolean }) => void
    startAnimation: () => void
    stopAnimation: () => void
    cleanup: () => void
}

function viewportWidth(): number {
    return typeof window !== 'undefined' ? window.innerWidth : 1024
}

function viewportHeight(): number {
    return typeof window !== 'undefined' ? window.innerHeight : 768
}

export function useDashboardBubbles(options?: { random?: () => number }): UseDashboardBubblesReturn {
    const random = options?.random ?? Math.random
    const bubbles = ref<DashboardBubble[]>([])
    let zCounter = 0
    const exitTimers = new Map<string, ReturnType<typeof setTimeout>>()
    const entranceTimers = new Map<string, ReturnType<typeof setTimeout>>()
    let animFrameId: number | null = null
    let lastTime: number | null = null

    function addBubble(message: DashboardMessage, animateEntrance = false) {
        if (bubbles.value.some(b => b.message.id === message.id)) {
            return
        }

        const nonExitingCount = bubbles.value.filter(b => !b.isExiting).length
        if (nonExitingCount >= MAX_BUBBLES) {
            evictOldest()
        }

        zCounter++
        // random call order (locked): [1] direction, [2] x, [3] y, [4] birth angle, [5] birth speed
        const direction = random() < 0.5 ? 'left' : 'right'
        const x = random() * Math.max(1, viewportWidth() - BUBBLE_W)
        const y = random() * Math.max(1, viewportHeight() - BUBBLE_H)
        // 全方向均勻發射：0–360° 角度 + 全域速度大小區間（design D6）
        const angle = random() * 2 * Math.PI
        const speed = SPEED_MAG_MIN + random() * (SPEED_MAG_MAX - SPEED_MAG_MIN)
        const bubble: DashboardBubble = {
            id: `bubble-${message.id}`,
            message,
            direction,
            x,
            y,
            dx: speed * Math.cos(angle),
            dy: speed * Math.sin(angle),
            zIndex: zCounter,
            isExiting: false,
            animateEntrance,
            // 量測前的安全預設：頭像在 wrapper 頂、固定高度；掛載後由 FloatingBubble 回寫實際值。
            avatarOffsetTop: 0,
            avatarH: AVATAR_H,
        }
        bubbles.value.push(bubble)

        // 入場動畫播畢後清除旗標：之後若元件重掛載（切頁回來）不會重播後空翻
        if (animateEntrance) {
            const timer = setTimeout(() => {
                const b = bubbles.value.find(x => x.id === bubble.id)
                if (b) b.animateEntrance = false
                entranceTimers.delete(bubble.id)
            }, ENTRANCE_ANIM_MS)
            entranceTimers.set(bubble.id, timer)
        }
    }

    // 被 host 刪除的訊息：依 messageId 立即移除對應 bubble；已飄離（不存在）則 graceful no-op。
    function removeBubble(messageId: string) {
        const idx = bubbles.value.findIndex(b => b.message.id === messageId)
        if (idx === -1) return
        const { id } = bubbles.value[idx]
        bubbles.value.splice(idx, 1)
        const exitTimer = exitTimers.get(id)
        if (exitTimer) { clearTimeout(exitTimer); exitTimers.delete(id) }
        const entranceTimer = entranceTimers.get(id)
        if (entranceTimer) { clearTimeout(entranceTimer); entranceTimers.delete(id) }
    }

    function patchProfile(
        userId: string,
        profile: { furName: string | null; avatar: string | null; avatarColor: string | null; avatarBorder: boolean },
    ) {
        for (const b of bubbles.value) {
            if (b.message.userId === userId) {
                if (profile.furName !== null) b.message.nickname = profile.furName
                if (profile.avatar !== null) b.message.avatarUrl = profile.avatar
                b.message.avatarColor = profile.avatarColor
                b.message.avatarBorder = profile.avatarBorder
            }
        }
    }

    function evictOldest() {
        const oldest = bubbles.value.find(b => !b.isExiting)
        if (!oldest) return
        oldest.isExiting = true
        const timer = setTimeout(() => {
            const idx = bubbles.value.findIndex(b => b.id === oldest.id)
            if (idx !== -1) {
                bubbles.value.splice(idx, 1)
            }
            exitTimers.delete(oldest.id)
        }, EXIT_DURATION)
        exitTimers.set(oldest.id, timer)
    }

    function animate(time: number) {
        if (lastTime === null) {
            lastTime = time
            animFrameId = requestAnimationFrame(animate)
            return
        }

        const dt = (time - lastTime) / 1000
        lastTime = time

        const maxX = Math.max(0, viewportWidth() - BUBBLE_W)
        const vh = viewportHeight()

        for (const b of bubbles.value) {
            b.x += b.dx * dt
            b.y += b.dy * dt

            const hits: Wall[] = []
            if (b.x <= 0) { b.x = 0; hits.push('left') }
            else if (b.x >= maxX) { b.x = maxX; hits.push('right') }

            // 垂直碰撞以頭像頂/底為基準（不論泡泡多大）：頭像頂碰視窗頂、頭像底碰視窗底即反彈。
            const { minY, maxY } = avatarVerticalBounds(b.avatarOffsetTop, b.avatarH, vh)
            if (b.y <= minY) { b.y = minY; hits.push('top') }
            else if (b.y >= maxY) { b.y = maxY; hits.push('bottom') }

            if (hits.length > 0) {
                const next = bounceVelocity(hits, b.dx, b.dy, random)
                b.dx = next.dx
                b.dy = next.dy
            }
        }

        animFrameId = requestAnimationFrame(animate)
    }

    function startAnimation() {
        if (typeof requestAnimationFrame === 'undefined') return
        lastTime = null
        animFrameId = requestAnimationFrame(animate)
    }

    function stopAnimation() {
        if (animFrameId !== null) {
            cancelAnimationFrame(animFrameId)
            animFrameId = null
        }
        lastTime = null
    }

    function cleanup() {
        stopAnimation()
        exitTimers.forEach(timer => clearTimeout(timer))
        exitTimers.clear()
        // flush 而非單純取消：清除計時器的同時把 animateEntrance 收斂為 false，
        // 否則動畫窗內切頁離開會留下 true，切回時（singleton 保留泡泡）重播後空翻。
        entranceTimers.forEach((timer, id) => {
            clearTimeout(timer)
            const b = bubbles.value.find(x => x.id === id)
            if (b) b.animateEntrance = false
        })
        entranceTimers.clear()
    }

    return { bubbles, addBubble, removeBubble, patchProfile, startAnimation, stopAnimation, cleanup }
}
