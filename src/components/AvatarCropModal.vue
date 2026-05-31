<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import './AvatarCropModal.css'
import type { AvatarCropState } from '@/types/avatar'

const DEFAULT_VIEWPORT_SIZE = 320
const OUTPUT_SIZE = 512
const MIN_ZOOM = 1
const MAX_ZOOM = 5

const props = withDefaults(defineProps<{
    open: boolean
    sourceUrl: string | null
    outputFileName?: string
    initialZoom?: number
    initialOffsetX?: number
    initialOffsetY?: number
}>(), {
    outputFileName: 'avatar.png',
    initialZoom: 1,
    initialOffsetX: 0,
    initialOffsetY: 0,
})

const emit = defineEmits<{
    (e: 'close'): void
    (e: 'confirm', file: File, cropState: AvatarCropState): void
}>()

const stageEl = ref<HTMLDivElement | null>(null)
const imageEl = ref<HTMLImageElement | null>(null)
const imageLoaded = ref(false)
const viewportSize = ref(DEFAULT_VIEWPORT_SIZE)
const sourceNaturalWidth = ref(0)
const sourceNaturalHeight = ref(0)
const zoom = ref(1)
const offsetX = ref(0)
const offsetY = ref(0)

const dragState = {
    active: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
}

const naturalWidth = computed(() => sourceNaturalWidth.value || viewportSize.value)
const naturalHeight = computed(() => sourceNaturalHeight.value || viewportSize.value)
const fitScale = computed(() => Math.min(viewportSize.value / naturalWidth.value, viewportSize.value / naturalHeight.value))
const baseWidth = computed(() => naturalWidth.value * fitScale.value)
const baseHeight = computed(() => naturalHeight.value * fitScale.value)
const displayWidth = computed(() => baseWidth.value * zoom.value)
const displayHeight = computed(() => baseHeight.value * zoom.value)
const imageStyle = computed(() => ({
    width: `${displayWidth.value}px`,
    height: `${displayHeight.value}px`,
    left: `${(viewportSize.value - displayWidth.value) / 2 + offsetX.value}px`,
    top: `${(viewportSize.value - displayHeight.value) / 2 + offsetY.value}px`,
}))
function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value))
}

function clampOffsets(nextX: number, nextY: number) {
    const maxX = Math.abs(displayWidth.value - viewportSize.value) / 2
    const maxY = Math.abs(displayHeight.value - viewportSize.value) / 2
    return {
        x: clamp(nextX, -maxX, maxX),
        y: clamp(nextY, -maxY, maxY),
    }
}

function applyZoom(nextZoom: number) {
    zoom.value = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM)
    const clamped = clampOffsets(offsetX.value, offsetY.value)
    offsetX.value = clamped.x
    offsetY.value = clamped.y
}

function onZoomInput(event: Event) {
    applyZoom(Number((event.target as HTMLInputElement).value))
}

function resetState() {
    imageLoaded.value = false
    sourceNaturalWidth.value = 0
    sourceNaturalHeight.value = 0
    zoom.value = props.initialZoom
    offsetX.value = props.initialOffsetX
    offsetY.value = props.initialOffsetY
    dragState.active = false
}

function onImageLoad() {
    sourceNaturalWidth.value = imageEl.value?.naturalWidth ?? 0
    sourceNaturalHeight.value = imageEl.value?.naturalHeight ?? 0
    imageLoaded.value = true
    syncViewportSize()
    console.info(
        `[AvatarCropModal] rawNatural ${imageEl.value?.naturalWidth ?? 0}x${imageEl.value?.naturalHeight ?? 0} | ` +
        `computedNatural ${naturalWidth.value}x${naturalHeight.value} | ` +
        `display ${Math.round(displayWidth.value)}x${Math.round(displayHeight.value)} | ` +
        `viewport ${viewportSize.value}x${viewportSize.value}`,
    )
}

function syncViewportSize() {
    const nextSize = stageEl.value?.clientWidth ?? stageEl.value?.clientHeight ?? 0
    if (nextSize > 0) {
        viewportSize.value = nextSize
    }
}

function renderFrame(ctx: CanvasRenderingContext2D, size: number) {
    const outputScale = size / viewportSize.value
    const renderScale = fitScale.value * zoom.value * outputScale
    const drawWidth = naturalWidth.value * renderScale
    const drawHeight = naturalHeight.value * renderScale
    const drawX = (size - drawWidth) / 2 + offsetX.value * outputScale
    const drawY = (size - drawHeight) / 2 + offsetY.value * outputScale

    ctx.clearRect(0, 0, size, size)
    ctx.drawImage(
        imageEl.value as HTMLImageElement,
        drawX,
        drawY,
        drawWidth,
        drawHeight,
    )
}

function onPointerDown(event: PointerEvent) {
    dragState.active = true
    dragState.startX = event.clientX
    dragState.startY = event.clientY
    dragState.originX = offsetX.value
    dragState.originY = offsetY.value
}

function onPointerMove(event: PointerEvent) {
    if (!dragState.active) return
    const next = clampOffsets(
        dragState.originX + (event.clientX - dragState.startX),
        dragState.originY + (event.clientY - dragState.startY),
    )
    offsetX.value = next.x
    offsetY.value = next.y
}

function stopDragging() {
    dragState.active = false
}

watch(
    () => [props.open, props.sourceUrl] as const,
    async ([open, sourceUrl]) => {
        if (!open || !sourceUrl) {
            stopDragging()
            return
        }
        resetState()
        await nextTick()
        syncViewportSize()
    },
    { immediate: true },
)

watch([naturalWidth, naturalHeight], () => {
    const next = clampOffsets(offsetX.value, offsetY.value)
    offsetX.value = next.x
    offsetY.value = next.y
})

window.addEventListener('pointermove', onPointerMove)
window.addEventListener('pointerup', stopDragging)
window.addEventListener('resize', syncViewportSize)

onBeforeUnmount(() => {
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', stopDragging)
    window.removeEventListener('resize', syncViewportSize)
})

function mimeFromFileName(name: string): string {
    if (name.toLowerCase().endsWith('.jpg') || name.toLowerCase().endsWith('.jpeg')) return 'image/jpeg'
    if (name.toLowerCase().endsWith('.webp')) return 'image/webp'
    return 'image/png'
}

async function confirmCrop() {
    if (!imageEl.value || !props.sourceUrl || !imageLoaded.value) return

    const canvas = document.createElement('canvas')
    canvas.width = OUTPUT_SIZE
    canvas.height = OUTPUT_SIZE
    const ctx = canvas.getContext('2d')
    if (!ctx) {
        throw new Error('2d_context_unavailable')
    }

    renderFrame(ctx, OUTPUT_SIZE)

    const mime = mimeFromFileName(props.outputFileName)
    const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((next) => {
            if (next) resolve(next)
            else reject(new Error('crop_blob_failed'))
        }, mime)
    })
    emit('confirm', new File([blob], props.outputFileName, { type: blob.type || mime }), {
        zoom: zoom.value,
        offsetX: offsetX.value,
        offsetY: offsetY.value,
    })
}
</script>

<template>
    <Transition name="settings-modal">
        <div v-if="open && sourceUrl" class="avatar-crop-modal" @click="emit('close')">
            <div class="avatar-crop-modal__panel" @click.stop>
                <div class="avatar-crop-modal__header">
                    <div>
                        <div class="avatar-crop-modal__title">調整頭像</div>
                        <div class="avatar-crop-modal__hint">頭像會以圓形顯示，拖曳與縮放調整範圍</div>
                    </div>
                </div>

                <div class="avatar-crop-modal__body">
                    <div class="avatar-crop-modal__stage-shell">
                        <div
                            ref="stageEl"
                            class="avatar-crop-modal__stage"
                            data-test="crop-stage"
                            @pointerdown="onPointerDown"
                        >
                            <img
                                ref="imageEl"
                                class="avatar-crop-modal__source-image"
                                data-test="crop-image"
                                :src="sourceUrl"
                                :style="imageStyle"
                                alt=""
                                draggable="false"
                                @load="onImageLoad"
                            />
                        </div>

                        <div class="avatar-crop-modal__controls">
                            <p class="avatar-crop-modal__guide">頭像會以圓形顯示</p>
                            <div class="avatar-crop-modal__slider-row">
                                <div class="avatar-crop-modal__label">
                                    <span>縮放</span>
                                    <span>{{ zoom.toFixed(1) }}x</span>
                                </div>
                                <input
                                    data-test="zoom-slider"
                                    class="avatar-crop-modal__slider"
                                    type="range"
                                    min="1"
                                    :max="MAX_ZOOM"
                                    step="0.1"
                                    :value="zoom"
                                    @input="onZoomInput"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div class="avatar-crop-modal__footer">
                    <button
                        type="button"
                        class="avatar-crop-modal__btn"
                        data-test="crop-cancel"
                        @click="emit('close')"
                    >取消</button>
                    <button
                        type="button"
                        class="avatar-crop-modal__btn avatar-crop-modal__btn--primary"
                        data-test="crop-confirm"
                        :disabled="!imageLoaded"
                        @click="confirmCrop"
                    >使用這張</button>
                </div>
            </div>
        </div>
    </Transition>
</template>
