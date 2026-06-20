import { nextTick, onBeforeUnmount, watch, type Ref } from 'vue'

const FOCUSABLE_SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
].join(',')

/**
 * 對話框 focus trap（mobile-a11y-polish）：active 為 true 時把 Tab/Shift+Tab 循環限制在
 * container 內的可聚焦元素，啟用時聚焦首個可聚焦元素（或 container 本身），停用時還原啟用前焦點。
 *
 * @param container 對話框根元素 ref（建議含 tabindex="-1" 以便無可聚焦子元素時可承接焦點）
 * @param active   是否啟用（Ref<boolean> 或 getter）
 */
export function useFocusTrap(
    container: Ref<HTMLElement | null>,
    active: Ref<boolean> | (() => boolean),
): void {
    const isActive = typeof active === 'function' ? active : () => active.value
    let previouslyFocused: HTMLElement | null = null

    function focusableItems(): HTMLElement[] {
        const el = container.value
        if (!el) return []
        return Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    }

    function onKeydown(event: KeyboardEvent): void {
        if (event.key !== 'Tab' || !isActive()) return
        const el = container.value
        if (!el) return
        const items = focusableItems()
        const activeEl = document.activeElement as HTMLElement | null
        const inside = !!activeEl && el.contains(activeEl)

        if (items.length === 0) {
            event.preventDefault()
            el.focus()
            return
        }
        const first = items[0]
        const last = items[items.length - 1]

        if (event.shiftKey) {
            if (!inside || activeEl === first) {
                event.preventDefault()
                last.focus()
            }
        } else if (!inside || activeEl === last) {
            event.preventDefault()
            first.focus()
        }
    }

    watch(
        () => isActive(),
        (on) => {
            if (on) {
                previouslyFocused = document.activeElement as HTMLElement | null
                document.addEventListener('keydown', onKeydown, true)
                // 等 v-if/teleport 渲染後再聚焦首個可聚焦元素（或 container）。
                void nextTick(() => {
                    if (!isActive()) return
                    const items = focusableItems()
                    ;(items[0] ?? container.value)?.focus?.()
                })
            } else {
                document.removeEventListener('keydown', onKeydown, true)
                previouslyFocused?.focus?.()
                previouslyFocused = null
            }
        },
        { immediate: true },
    )

    onBeforeUnmount(() => {
        document.removeEventListener('keydown', onKeydown, true)
    })
}
