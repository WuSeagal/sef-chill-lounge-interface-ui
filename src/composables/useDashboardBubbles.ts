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
const BUBBLE_W = 250
const BUBBLE_H = 140
const SPEED_MIN = 30
const SPEED_MAX = 60

export type UseDashboardBubblesReturn = {
    bubbles: Ref<DashboardBubble[]>
    addBubble: (message: DashboardMessage) => void
    patchProfile: (userId: string, profile: { furName: string | null; avatar: string | null; avatarColor: string | null; avatarBorder: boolean }) => void
    startAnimation: () => void
    stopAnimation: () => void
    cleanup: () => void
}

function randomSpeed(): number {
    const speed = SPEED_MIN + Math.random() * (SPEED_MAX - SPEED_MIN)
    return Math.random() < 0.5 ? speed : -speed
}

function viewportWidth(): number {
    return typeof window !== 'undefined' ? window.innerWidth : 1024
}

function viewportHeight(): number {
    return typeof window !== 'undefined' ? window.innerHeight : 768
}

export function useDashboardBubbles(): UseDashboardBubblesReturn {
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
        const bubble: DashboardBubble = {
            id: `bubble-${message.id}`,
            message,
            direction: Math.random() < 0.5 ? 'left' : 'right',
            x: Math.random() * Math.max(1, viewportWidth() - BUBBLE_W),
            y: Math.random() * Math.max(1, viewportHeight() - BUBBLE_H),
            dx: randomSpeed(),
            dy: randomSpeed(),
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

            if (b.x <= 0) { b.x = 0; b.dx = Math.abs(b.dx) }
            else if (b.x >= maxX) { b.x = maxX; b.dx = -Math.abs(b.dx) }

            if (b.y <= 0) { b.y = 0; b.dy = Math.abs(b.dy) }
            else if (b.y >= maxY) { b.y = maxY; b.dy = -Math.abs(b.dy) }
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
