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
}

const MAX_BUBBLES = 30
const EXIT_DURATION = 500
// 反彈碰撞框 = 典型最大泡泡 footprint（含旁側頭像）：
// 寬 = 泡泡 max 276 + 間距 8 + 頭像 36 ≈ 320；高取圖片泡泡常見最大 ≈ 290。
// 採固定框（不做逐泡泡碰撞框）；超長文字/圖片+長 caption 的高泡泡反彈前底部可能略超出畫面，為已接受的取捨。
const BUBBLE_W = 320
const BUBBLE_H = 290

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

export type UseDashboardBubblesReturn = {
    bubbles: Ref<DashboardBubble[]>
    addBubble: (message: DashboardMessage) => void
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
    let animFrameId: number | null = null
    let lastTime: number | null = null

    function addBubble(message: DashboardMessage) {
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
        }
        bubbles.value.push(bubble)
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
        const maxY = Math.max(0, viewportHeight() - BUBBLE_H)

        for (const b of bubbles.value) {
            b.x += b.dx * dt
            b.y += b.dy * dt

            const hits: Wall[] = []
            if (b.x <= 0) { b.x = 0; hits.push('left') }
            else if (b.x >= maxX) { b.x = maxX; hits.push('right') }

            if (b.y <= 0) { b.y = 0; hits.push('top') }
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
    }

    return { bubbles, addBubble, patchProfile, startAnimation, stopAnimation, cleanup }
}
