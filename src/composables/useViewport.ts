import { onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * Reactive window dimensions. Components that need to derive sizing from
 * viewport width/height (e.g. MessageItem clamping bubble width on
 * mobile) read these refs in their computed properties.
 *
 * Initial values fall back to a typical desktop size during SSR or
 * before mount; the resize listener corrects them as soon as the
 * component is mounted in the browser.
 */
export function useViewport() {
    const width = ref(typeof window !== 'undefined' ? window.innerWidth : 1024)
    const height = ref(typeof window !== 'undefined' ? window.innerHeight : 768)

    function update() {
        width.value = window.innerWidth
        height.value = window.innerHeight
    }

    onMounted(() => {
        window.addEventListener('resize', update)
        update()
    })

    onBeforeUnmount(() => {
        window.removeEventListener('resize', update)
    })

    return { width, height }
}
