import { onBeforeUnmount, ref, watch, type Ref } from 'vue'
import { computeScrollEdges, type ScrollEdges } from '@/utils/scrollEdges'

/**
 * 監聽某捲動容器（elRef）的 scroll / resize，回傳反應式的 atTop / atBottom / overflowing，
 * 供 scroll affordance（頂/底漸層 + 箭頭）綁定 class。容器替換或內容變動時自動重新量測。
 */
export function useScrollEdges(elRef: Ref<HTMLElement | null>) {
    const edges = ref<ScrollEdges>({ overflowing: false, atTop: true, atBottom: true })
    let ro: ResizeObserver | null = null
    let observed: HTMLElement | null = null

    function update(): void {
        const el = elRef.value
        if (!el) return
        edges.value = computeScrollEdges({
            scrollTop: el.scrollTop,
            scrollHeight: el.scrollHeight,
            clientHeight: el.clientHeight,
        })
    }

    function detach(): void {
        if (observed) observed.removeEventListener('scroll', update)
        ro?.disconnect()
        ro = null
        observed = null
    }

    watch(
        elRef,
        (el) => {
            detach()
            if (!el) return
            observed = el
            el.addEventListener('scroll', update, { passive: true })
            if (typeof ResizeObserver !== 'undefined') {
                ro = new ResizeObserver(() => update())
                ro.observe(el)
            }
            update()
        },
        { immediate: true, flush: 'post' },
    )

    onBeforeUnmount(detach)

    return { edges, update }
}
