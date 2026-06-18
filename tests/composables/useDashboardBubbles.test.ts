import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
    useDashboardBubbles,
    bounceVelocity,
    avatarVerticalBounds,
    JITTER_MAX_DEG,
    CLAMP_MIN_DEG,
    CLAMP_MAX_DEG,
    SPEED_JITTER_RATIO,
    SPEED_MAG_MIN,
    SPEED_MAG_MAX,
} from '@/composables/useDashboardBubbles'
import type { DashboardMessage } from '@/types/dashboard'

// ── geometry helpers for bounce tests ──
const RAD2DEG = 180 / Math.PI
function angleDeg(dx: number, dy: number): number {
    return Math.atan2(dy, dx) * RAD2DEG
}
function mag(dx: number, dy: number): number {
    return Math.hypot(dx, dy)
}
// build a velocity vector from an angle (degrees) and magnitude
function vel(angleDegrees: number, speed: number): { dx: number; dy: number } {
    const a = angleDegrees / RAD2DEG
    return { dx: speed * Math.cos(a), dy: speed * Math.sin(a) }
}
// stub returning a fixed value for every call
const fixed = (v: number) => () => v
// stub returning a fixed sequence of values
function seq(values: number[]): () => number {
    let i = 0
    return () => values[i++]
}

function makeMsg(id: string, userId = 'u-101', content = 'hello'): DashboardMessage {
    return {
        id,
        userId,
        nickname: 'Test',
        avatarUrl: '/a.png',
        content,
        timestamp: '2026-06-01T00:00:00.000Z',
    }
}

describe('useDashboardBubbles — addBubble basics', () => {
    it('starts with an empty array', () => {
        const { bubbles } = useDashboardBubbles()
        expect(bubbles.value).toHaveLength(0)
    })

    it('addBubble pushes a bubble with the correct message', () => {
        const { bubbles, addBubble } = useDashboardBubbles()
        const msg = makeMsg('msg-001')
        addBubble(msg)
        expect(bubbles.value).toHaveLength(1)
        expect(bubbles.value[0].message).toEqual(msg)
    })

    it('bubble id is prefixed with "bubble-"', () => {
        const { bubbles, addBubble } = useDashboardBubbles()
        addBubble(makeMsg('msg-042'))
        expect(bubbles.value[0].id).toBe('bubble-msg-042')
    })

    it('bubble direction is "left" or "right"', () => {
        const { bubbles, addBubble } = useDashboardBubbles()
        addBubble(makeMsg('msg-001'))
        expect(['left', 'right']).toContain(bubbles.value[0].direction)
    })

    it('addBubble 預設不播入場動畫（animateEntrance false）', () => {
        const { bubbles, addBubble } = useDashboardBubbles()
        addBubble(makeMsg('msg-001'))
        expect(bubbles.value[0].animateEntrance).toBe(false)
    })

    it('addBubble(msg, true) 標記播入場動畫（animateEntrance true）', () => {
        const { bubbles, addBubble } = useDashboardBubbles()
        addBubble(makeMsg('msg-001'), true)
        expect(bubbles.value[0].animateEntrance).toBe(true)
    })

    it('removeBubble 依 messageId 移除對應 bubble', () => {
        const { bubbles, addBubble, removeBubble } = useDashboardBubbles()
        addBubble(makeMsg('m-1'))
        addBubble(makeMsg('m-2'))
        removeBubble('m-1')
        expect(bubbles.value.map(b => b.message.id)).toEqual(['m-2'])
    })

    it('removeBubble 對不存在的 messageId 為 graceful no-op', () => {
        const { bubbles, addBubble, removeBubble } = useDashboardBubbles()
        addBubble(makeMsg('m-1'))
        expect(() => removeBubble('ghost')).not.toThrow()
        expect(bubbles.value).toHaveLength(1)
    })

    it('入場動畫播畢後自動清除 animateEntrance（避免重掛載重播後空翻）', () => {
        vi.useFakeTimers()
        try {
            const { bubbles, addBubble } = useDashboardBubbles()
            addBubble(makeMsg('msg-001'), true)
            expect(bubbles.value[0].animateEntrance).toBe(true)
            vi.advanceTimersByTime(1100) // > 動畫總時長（~950ms）
            expect(bubbles.value[0].animateEntrance).toBe(false)
        } finally {
            vi.useRealTimers()
        }
    })

    it('cleanup 在入場動畫窗內也要 flush animateEntrance（切頁回來不重播後空翻）', () => {
        vi.useFakeTimers()
        try {
            const { bubbles, addBubble, cleanup } = useDashboardBubbles()
            addBubble(makeMsg('msg-001'), true)
            expect(bubbles.value[0].animateEntrance).toBe(true)
            cleanup() // 動畫窗內切頁離開
            expect(bubbles.value[0].animateEntrance).toBe(false)
        } finally {
            vi.useRealTimers()
        }
    })

    it('x is within viewport bounds', () => {
        const { bubbles, addBubble } = useDashboardBubbles()
        for (let i = 0; i < 20; i++) {
            addBubble(makeMsg(`msg-${i}`))
        }
        for (const b of bubbles.value) {
            expect(b.x).toBeGreaterThanOrEqual(0)
            expect(b.x).toBeLessThanOrEqual(window.innerWidth)
        }
    })

    it('y is within viewport bounds', () => {
        const { bubbles, addBubble } = useDashboardBubbles()
        for (let i = 0; i < 20; i++) {
            addBubble(makeMsg(`msg-${i}`))
        }
        for (const b of bubbles.value) {
            expect(b.y).toBeGreaterThanOrEqual(0)
            expect(b.y).toBeLessThanOrEqual(window.innerHeight)
        }
    })

    it('velocity magnitude is within the global speed range (all-direction model)', () => {
        const { bubbles, addBubble } = useDashboardBubbles()
        for (let i = 0; i < 20; i++) {
            addBubble(makeMsg(`msg-${i}`))
        }
        // 0–360° all-direction launch: a single axis may be ~0, but the speed
        // magnitude (sqrt(dx²+dy²)) always falls in the global range (design D6)
        for (const b of bubbles.value) {
            const speed = Math.hypot(b.dx, b.dy)
            expect(speed).toBeGreaterThanOrEqual(SPEED_MAG_MIN - 1e-6)
            expect(speed).toBeLessThanOrEqual(SPEED_MAG_MAX + 1e-6)
        }
    })

    it('isExiting starts as false', () => {
        const { bubbles, addBubble } = useDashboardBubbles()
        addBubble(makeMsg('msg-001'))
        expect(bubbles.value[0].isExiting).toBe(false)
    })

    it('addBubble 初始化頭像量測欄位（avatarOffsetTop=0、avatarH=50；量測前的安全預設）', () => {
        const { bubbles, addBubble } = useDashboardBubbles()
        addBubble(makeMsg('msg-001'))
        expect(bubbles.value[0].avatarOffsetTop).toBe(0)
        expect(bubbles.value[0].avatarH).toBe(50)
    })
})

describe('useDashboardBubbles — z-index', () => {
    it('z-index increases monotonically across addBubble calls', () => {
        const { bubbles, addBubble } = useDashboardBubbles()
        addBubble(makeMsg('msg-001'))
        addBubble(makeMsg('msg-002'))
        addBubble(makeMsg('msg-003'))
        const zValues = bubbles.value.map(b => b.zIndex)
        expect(zValues[0]).toBeLessThan(zValues[1])
        expect(zValues[1]).toBeLessThan(zValues[2])
    })

    it('each composable instance has its own z-counter', () => {
        const a = useDashboardBubbles()
        const b = useDashboardBubbles()
        a.addBubble(makeMsg('msg-a1'))
        b.addBubble(makeMsg('msg-b1'))
        expect(a.bubbles.value[0].zIndex).toBe(1)
        expect(b.bubbles.value[0].zIndex).toBe(1)
    })
})

describe('useDashboardBubbles — FIFO eviction', () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('adding the 31st bubble marks the oldest as isExiting', () => {
        const { bubbles, addBubble } = useDashboardBubbles()
        for (let i = 1; i <= 30; i++) {
            addBubble(makeMsg(`msg-${i}`))
        }
        expect(bubbles.value).toHaveLength(30)
        expect(bubbles.value[0].isExiting).toBe(false)

        addBubble(makeMsg('msg-31'))
        expect(bubbles.value).toHaveLength(31)
        expect(bubbles.value[0].isExiting).toBe(true)
    })

    it('exiting bubble is removed from array after 500ms', () => {
        const { bubbles, addBubble } = useDashboardBubbles()
        for (let i = 1; i <= 31; i++) {
            addBubble(makeMsg(`msg-${i}`))
        }
        expect(bubbles.value).toHaveLength(31)

        vi.advanceTimersByTime(500)
        expect(bubbles.value).toHaveLength(30)
        expect(bubbles.value[0].id).toBe('bubble-msg-2')
    })

    it('new bubble and exiting bubble coexist during the 500ms window', () => {
        const { bubbles, addBubble } = useDashboardBubbles()
        for (let i = 1; i <= 30; i++) {
            addBubble(makeMsg(`msg-${i}`))
        }
        addBubble(makeMsg('msg-31'))

        expect(bubbles.value).toHaveLength(31)
        const exitingCount = bubbles.value.filter(b => b.isExiting).length
        expect(exitingCount).toBe(1)

        vi.advanceTimersByTime(250)
        expect(bubbles.value).toHaveLength(31)

        vi.advanceTimersByTime(250)
        expect(bubbles.value).toHaveLength(30)
    })

    it('rapid additions evict multiple oldest bubbles', () => {
        const { bubbles, addBubble } = useDashboardBubbles()
        for (let i = 1; i <= 30; i++) {
            addBubble(makeMsg(`msg-${i}`))
        }
        addBubble(makeMsg('msg-31'))
        addBubble(makeMsg('msg-32'))
        addBubble(makeMsg('msg-33'))

        expect(bubbles.value).toHaveLength(33)
        const exitingIds = bubbles.value.filter(b => b.isExiting).map(b => b.id)
        expect(exitingIds).toEqual([
            'bubble-msg-1',
            'bubble-msg-2',
            'bubble-msg-3',
        ])

        vi.advanceTimersByTime(500)
        expect(bubbles.value).toHaveLength(30)
    })

    it('cleanup cancels pending exit timers', () => {
        const { bubbles, addBubble, cleanup } = useDashboardBubbles()
        for (let i = 1; i <= 31; i++) {
            addBubble(makeMsg(`msg-${i}`))
        }
        expect(bubbles.value[0].isExiting).toBe(true)

        cleanup()
        vi.advanceTimersByTime(500)
        expect(bubbles.value).toHaveLength(31)
    })
})

describe('useDashboardBubbles — dedup', () => {
    it('addBubble ignores a duplicate message id', () => {
        const { bubbles, addBubble } = useDashboardBubbles()
        addBubble(makeMsg('msg-1'))
        addBubble(makeMsg('msg-1'))
        expect(bubbles.value).toHaveLength(1)
    })
})

describe('useDashboardBubbles — patchProfile', () => {
    it('updates nickname, avatarUrl, avatarColor and avatarBorder of all bubbles with matching userId', () => {
        const { bubbles, addBubble, patchProfile } = useDashboardBubbles()
        addBubble(makeMsg('msg-1', 'u-1'))
        addBubble(makeMsg('msg-2', 'u-1'))
        addBubble(makeMsg('msg-3', 'u-2'))

        patchProfile('u-1', { furName: 'NewName', avatar: '/new.png', avatarColor: '#abcdef', avatarBorder: true })

        expect(bubbles.value[0].message.nickname).toBe('NewName')
        expect(bubbles.value[0].message.avatarUrl).toBe('/new.png')
        expect(bubbles.value[0].message.avatarColor).toBe('#abcdef')
        expect(bubbles.value[0].message.avatarBorder).toBe(true)
        expect(bubbles.value[1].message.avatarColor).toBe('#abcdef')
        expect(bubbles.value[1].message.avatarBorder).toBe(true)
        expect(bubbles.value[2].message.nickname).toBe('Test')
        expect(bubbles.value[2].message.avatarBorder).toBeUndefined()
    })

    it('null furName/avatar does not wipe existing values, but color/border still apply', () => {
        const { bubbles, addBubble, patchProfile } = useDashboardBubbles()
        addBubble(makeMsg('msg-1', 'u-1'))
        const beforeName = bubbles.value[0].message.nickname
        const beforeAvatar = bubbles.value[0].message.avatarUrl

        patchProfile('u-1', { furName: null, avatar: null, avatarColor: '#123456', avatarBorder: true })

        expect(bubbles.value[0].message.nickname).toBe(beforeName)
        expect(bubbles.value[0].message.avatarUrl).toBe(beforeAvatar)
        expect(bubbles.value[0].message.avatarColor).toBe('#123456')
        expect(bubbles.value[0].message.avatarBorder).toBe(true)
    })
})

describe('useDashboardBubbles — random injection', () => {
    // addBubble random call order: [0] direction, [1] x, [2] y, [3] birth angle, [4] birth speed

    it('birth velocity derives from the injected random (angle then speed)', () => {
        const { bubbles, addBubble } = useDashboardBubbles({
            random: seq([0, 0, 0, 0, 0]), // dir→left, x→0, y→0, angle→0, speed→MIN
        })
        addBubble(makeMsg('msg-1'))
        const b = bubbles.value[0]
        expect(b.direction).toBe('left')
        expect(b.x).toBeCloseTo(0)
        expect(b.y).toBeCloseTo(0)
        expect(b.dx).toBeCloseTo(SPEED_MAG_MIN) // angle 0 → all speed on x
        expect(b.dy).toBeCloseTo(0)
    })

    it('birth angle of a quarter turn moves straight down (no sin/cos transpose)', () => {
        const { bubbles, addBubble } = useDashboardBubbles({
            random: seq([0.6, 0, 0, 0.25, 0.5]), // dir→right, angle→90°, speed→mid
        })
        addBubble(makeMsg('msg-1'))
        const b = bubbles.value[0]
        const midSpeed = SPEED_MAG_MIN + 0.5 * (SPEED_MAG_MAX - SPEED_MAG_MIN)
        expect(b.direction).toBe('right')
        expect(b.dx).toBeCloseTo(0)
        expect(b.dy).toBeCloseTo(midSpeed)
    })

    it('birth speed magnitude spans the global range', () => {
        const slow = useDashboardBubbles({ random: seq([0, 0, 0, 0, 0]) })
        slow.addBubble(makeMsg('msg-slow'))
        expect(mag(slow.bubbles.value[0].dx, slow.bubbles.value[0].dy)).toBeCloseTo(SPEED_MAG_MIN)

        const fast = useDashboardBubbles({ random: seq([0, 0, 0, 0, 1]) })
        fast.addBubble(makeMsg('msg-fast'))
        expect(mag(fast.bubbles.value[0].dx, fast.bubbles.value[0].dy)).toBeCloseTo(SPEED_MAG_MAX)
    })

    it('without injected random it falls back to Math.random (existing callers unchanged)', () => {
        const { bubbles, addBubble } = useDashboardBubbles()
        addBubble(makeMsg('msg-1'))
        const b = bubbles.value[0]
        expect(['left', 'right']).toContain(b.direction)
        expect(mag(b.dx, b.dy)).toBeGreaterThanOrEqual(SPEED_MAG_MIN - 1e-6)
        expect(mag(b.dx, b.dy)).toBeLessThanOrEqual(SPEED_MAG_MAX + 1e-6)
    })
})

describe('useDashboardBubbles — bounce jitter (pure function)', () => {
    // random call order inside bounceVelocity: [0] angle jitter, [1] speed jitter.
    // random = 0.5 → zero angle jitter AND unit speed factor; this degenerates to a
    // pure mirror reflection ONLY when the mirror direction already lies within the
    // clamp range [15°,75°] (otherwise the clamp still adjusts it, per D3).

    it('random=0.5 degenerates to pure mirror reflection with unchanged speed', () => {
        // incoming heads into the left wall; mirror reflection lands at 45° from the +x normal
        const speed = 60
        const v = vel(45, speed)
        const out = bounceVelocity(['left'], -v.dx, v.dy, fixed(0.5))
        expect(angleDeg(out.dx, out.dy)).toBeCloseTo(45)
        expect(mag(out.dx, out.dy)).toBeCloseTo(speed)
    })

    it('reflection direction is rotated by exactly the jittered angle when no clamp fires', () => {
        const v = vel(45, 60) // mirror angle 45° → ±JITTER stays inside [15°,75°]
        const plus = bounceVelocity(['left'], -v.dx, v.dy, seq([1.0, 0.5]))
        expect(angleDeg(plus.dx, plus.dy)).toBeCloseTo(45 + JITTER_MAX_DEG)
        const minus = bounceVelocity(['left'], -v.dx, v.dy, seq([0.0, 0.5]))
        expect(angleDeg(minus.dx, minus.dy)).toBeCloseTo(45 - JITTER_MAX_DEG)
    })

    it('speed jitter scales magnitude by ±SPEED_JITTER_RATIO within the global range', () => {
        const speed = 60
        const v = vel(45, speed)
        const out = bounceVelocity(['left'], -v.dx, v.dy, seq([0.5, 1.0])) // +max speed jitter
        const expected = speed * (1 + SPEED_JITTER_RATIO)
        expect(mag(out.dx, out.dy)).toBeCloseTo(expected)
        expect(mag(out.dx, out.dy)).toBeGreaterThanOrEqual(SPEED_MAG_MIN - 1e-6)
        expect(mag(out.dx, out.dy)).toBeLessThanOrEqual(SPEED_MAG_MAX + 1e-6)
    })

    it('speed jitter clamps magnitude to SPEED_MAG_MAX', () => {
        const v = vel(45, SPEED_MAG_MAX) // already at max → +jitter would exceed
        const out = bounceVelocity(['left'], -v.dx, v.dy, seq([0.5, 1.0]))
        expect(mag(out.dx, out.dy)).toBeCloseTo(SPEED_MAG_MAX)
    })

    it('clamps direction to CLAMP_MAX_DEG when reflection is too parallel to the wall', () => {
        const v = vel(80, 60) // 80° from normal → too parallel
        const out = bounceVelocity(['left'], -v.dx, v.dy, fixed(0.5)) // no jitter, isolate clamp
        expect(angleDeg(out.dx, out.dy)).toBeCloseTo(CLAMP_MAX_DEG)
    })

    it('clamps direction to CLAMP_MIN_DEG when reflection is too perpendicular to the wall', () => {
        const v = vel(5, 60) // 5° from normal → too perpendicular
        const out = bounceVelocity(['left'], -v.dx, v.dy, fixed(0.5))
        expect(angleDeg(out.dx, out.dy)).toBeCloseTo(CLAMP_MIN_DEG)
    })

    it('normal velocity component points inward for each wall', () => {
        const r = fixed(0.5)
        expect(bounceVelocity(['left'], -50, 20, r).dx).toBeGreaterThan(0)
        expect(bounceVelocity(['right'], 50, 20, r).dx).toBeLessThan(0)
        expect(bounceVelocity(['top'], 20, -50, r).dy).toBeGreaterThan(0)
        expect(bounceVelocity(['bottom'], 20, 50, r).dy).toBeLessThan(0)
    })

    it('corner double-bounce reflects both axes inward and keeps the bisector direction', () => {
        // heads into the bottom-left corner; both axes reflect → bisector at -45°
        const out = bounceVelocity(['left', 'bottom'], -42.426, 42.426, fixed(0.5))
        expect(out.dx).toBeGreaterThan(0)
        expect(out.dy).toBeLessThan(0)
        expect(angleDeg(out.dx, out.dy)).toBeCloseTo(-45)
    })

    it('corner double-bounce clamps direction to the inward-quadrant edge', () => {
        // mirror lands at -10° (only 10° from the left wall normal) → clamp to -15°
        const v = vel(-10, 60)
        const out = bounceVelocity(['left', 'bottom'], -v.dx, -v.dy, fixed(0.5))
        expect(angleDeg(out.dx, out.dy)).toBeCloseTo(-15)
    })

    it('corner double-bounce applies angle jitter and stays inward', () => {
        // into bottom-left corner → bisector -45°; +max jitter → -20° (within ±30° of bisector)
        const out = bounceVelocity(['left', 'bottom'], -42.426, 42.426, seq([1.0, 0.5]))
        expect(angleDeg(out.dx, out.dy)).toBeCloseTo(-45 + JITTER_MAX_DEG)
        expect(out.dx).toBeGreaterThan(0)
        expect(out.dy).toBeLessThan(0)
    })
})

describe('useDashboardBubbles — avatarVerticalBounds (pure)', () => {
    // 垂直碰撞改以「頭像頂/底」為基準（不論泡泡多大）：
    // minY 讓頭像頂貼齊視窗頂（y + offsetTop = 0）；maxY 讓頭像底貼齊視窗底（y + offsetTop + avatarH = vh）。

    it('短泡泡（頭像即整顆，offsetTop=0）可從 y=0 一路漂到頭像底貼視窗底', () => {
        const { minY, maxY } = avatarVerticalBounds(0, 50, 768)
        expect(minY).toBe(0)
        expect(maxY).toBe(768 - 50)
    })

    it('高泡泡（頭像置中，offsetTop=175）上下對稱：minY 為負（本體超出頂緣）、maxY 讓頭像底貼視窗底', () => {
        const { minY, maxY } = avatarVerticalBounds(175, 50, 768)
        expect(minY).toBe(-175) // wrapper 頂在視窗外 175px，頭像頂剛好 = 0
        expect(maxY).toBe(768 - 50 - 175) // 頭像底剛好 = 768
    })

    it('視窗比頭像還矮的退化情境：maxY 不小於 minY（泡泡被釘住，上下夾限不互相打架）', () => {
        const { minY, maxY } = avatarVerticalBounds(10, 50, 30)
        expect(maxY).toBeGreaterThanOrEqual(minY)
    })
})

describe('useDashboardBubbles — animate bounce integration', () => {
    let rafCb: ((t: number) => void) | null = null

    beforeEach(() => {
        rafCb = null
        vi.stubGlobal('requestAnimationFrame', (cb: (t: number) => void) => {
            rafCb = cb
            return 1
        })
        vi.stubGlobal('cancelAnimationFrame', () => {})
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('on a boundary crossing, position is clamped and velocity matches bounceVelocity (with jitter)', () => {
        // fixed(1) → +max angle jitter, so the result differs from a plain mirror flip:
        // this fails against the old Math.abs reflection and only passes once animate() delegates.
        const random = fixed(1)
        const { bubbles, addBubble, startAnimation } = useDashboardBubbles({ random })
        addBubble(makeMsg('m1'))
        const b = bubbles.value[0]
        // place near the left edge heading left so one 1s step crosses x=0
        b.x = 5
        b.y = 300
        b.dx = -50 // magnitude 53.9 ∈ [42,85] so the speed clamp won't fire
        b.dy = 20

        startAnimation()
        rafCb!(0) // first frame only initialises lastTime
        rafCb!(1000) // dt = 1s → x = 5 - 50 = -45 → clamp to 0, hit 'left'

        expect(b.x).toBe(0)
        const expected = bounceVelocity(['left'], -50, 20, fixed(1))
        expect(b.dx).toBeCloseTo(expected.dx)
        expect(b.dy).toBeCloseTo(expected.dy)
        expect(mag(b.dx, b.dy)).toBeGreaterThanOrEqual(SPEED_MAG_MIN - 1e-6)
        expect(mag(b.dx, b.dy)).toBeLessThanOrEqual(SPEED_MAG_MAX + 1e-6)
        expect(b.dx).toBeGreaterThan(0) // now heading back inward
    })

    it('短泡泡（offsetTop=0）能一路漂到頭像底貼視窗底才反彈（修正下緣留白）', () => {
        const random = fixed(0.5) // 無擾動，斷言乾淨
        const { bubbles, addBubble, startAnimation } = useDashboardBubbles({ random })
        addBubble(makeMsg('m1'))
        const b = bubbles.value[0]
        b.avatarOffsetTop = 0
        b.avatarH = 50
        b.x = 100
        b.dx = 0 // 避免水平碰撞
        // maxY = 768 - 50 - 0 = 718（頭像底 = 視窗底 768）
        b.y = 700
        b.dy = 30 // dt=1s → y = 730 > 718 → 夾回 718、hit 'bottom'

        startAnimation()
        rafCb!(0)
        rafCb!(1000)

        expect(b.y).toBe(768 - 50)
        expect(b.dy).toBeLessThan(0) // 反彈後朝上（往畫面內）
    })

    it('垂直反彈以頭像底為界、非泡泡 footprint：高泡泡頭像底碰視窗底才夾住反彈', () => {
        const random = fixed(0.5)
        const { bubbles, addBubble, startAnimation } = useDashboardBubbles({ random })
        addBubble(makeMsg('m1'))
        const b = bubbles.value[0]
        // 模擬高泡泡：頭像置中、offsetTop=175、avatarH=50 → maxY = 768-50-175 = 543
        b.avatarOffsetTop = 175
        b.avatarH = 50
        b.x = 100
        b.dx = 0
        b.y = 540
        b.dy = 30 // dt=1s → y = 570 > 543 → 夾回 543、hit 'bottom'

        startAnimation()
        rafCb!(0)
        rafCb!(1000)

        expect(b.y).toBe(543)
        const expected = bounceVelocity(['bottom'], 0, 30, fixed(0.5))
        expect(b.dx).toBeCloseTo(expected.dx)
        expect(b.dy).toBeCloseTo(expected.dy)
        expect(b.dy).toBeLessThan(0) // 反彈後朝上（往畫面內）
    })
})
