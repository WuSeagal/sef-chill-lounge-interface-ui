import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import AvatarCropModal from '@/components/AvatarCropModal.vue'

describe('AvatarCropModal', () => {
    const drawImageMock = vi.fn()
    let consoleInfoMock: ReturnType<typeof vi.spyOn>
    let mockNaturalWidth = 400
    let mockNaturalHeight = 300

    beforeEach(() => {
        vi.restoreAllMocks()
        drawImageMock.mockReset()
        consoleInfoMock = vi.spyOn(console, 'info').mockImplementation(() => undefined)
        Object.defineProperty(HTMLImageElement.prototype, 'naturalWidth', {
            configurable: true,
            get: () => mockNaturalWidth,
        })
        Object.defineProperty(HTMLImageElement.prototype, 'naturalHeight', {
            configurable: true,
            get: () => mockNaturalHeight,
        })
        HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
            save: vi.fn(),
            restore: vi.fn(),
            translate: vi.fn(),
            scale: vi.fn(),
            clearRect: vi.fn(),
            beginPath: vi.fn(),
            arc: vi.fn(),
            closePath: vi.fn(),
            clip: vi.fn(),
            drawImage: drawImageMock,
        } as any))
        HTMLCanvasElement.prototype.toBlob = vi.fn((callback) => {
            callback?.(new Blob(['cropped'], { type: 'image/png' }))
        })
        mockNaturalWidth = 400
        mockNaturalHeight = 300
    })

    it('renders nothing when closed', () => {
        const wrapper = mount(AvatarCropModal, {
            props: { open: false, sourceUrl: 'blob:source.png' },
        })

        expect(wrapper.find('.avatar-crop-modal').exists()).toBe(false)
    })

    it('emits close when cancel is clicked', async () => {
        const wrapper = mount(AvatarCropModal, {
            props: { open: true, sourceUrl: 'blob:source.png' },
        })

        await wrapper.find('[data-test=crop-cancel]').trigger('click')
        expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('updates image transform when zoom slider changes', async () => {
        const wrapper = mount(AvatarCropModal, {
            props: { open: true, sourceUrl: 'blob:source.png' },
        })

        await wrapper.find('[data-test=zoom-slider]').setValue('1.6')
        expect(wrapper.text()).toContain('1.6x')
    })

    it('allows larger zoom for tighter avatar crops', async () => {
        const wrapper = mount(AvatarCropModal, {
            props: { open: true, sourceUrl: 'blob:source.png' },
        })

        const slider = wrapper.find('[data-test=zoom-slider]')
        expect(slider.attributes('max')).toBe('5')

        await slider.setValue('4.5')
        expect(wrapper.text()).toContain('4.5x')
    })

    it('uses a single circular crop stage instead of a separate legacy preview card', () => {
        const wrapper = mount(AvatarCropModal, {
            props: { open: true, sourceUrl: 'blob:source.png' },
        })

        expect(wrapper.text()).toContain('頭像會以圓形顯示')
        expect(wrapper.find('.avatar-crop-modal__preview-card').exists()).toBe(false)
        expect(wrapper.find('[data-test=crop-image]').exists()).toBe(true)
    })

    it('keeps confirm disabled until image finishes loading', async () => {
        const wrapper = mount(AvatarCropModal, {
            props: { open: true, sourceUrl: 'blob:source.png' },
        })

        const confirmButton = wrapper.find('[data-test=crop-confirm]')
        expect(confirmButton.attributes('disabled')).toBeDefined()

        await wrapper.find('[data-test=crop-image]').trigger('load')
        await flushPromises()

        expect(wrapper.find('[data-test=crop-confirm]').attributes('disabled')).toBeUndefined()
    })

    it('logs debug dimensions for the loaded source and current display size to console', async () => {
        const wrapper = mount(AvatarCropModal, {
            props: { open: true, sourceUrl: 'blob:source.png' },
        })

        Object.defineProperty((wrapper.find('[data-test=crop-stage]').element as HTMLDivElement), 'clientWidth', {
            configurable: true,
            value: 320,
        })

        await wrapper.find('[data-test=crop-image]').trigger('load')
        await flushPromises()

        expect(consoleInfoMock).toHaveBeenCalledWith(
            '[AvatarCropModal] rawNatural 400x300 | computedNatural 400x300 | display 320x240 | viewport 320x320',
        )
    })

    it('updates computed natural dimensions after image load when intrinsic size was initially unknown', async () => {
        mockNaturalWidth = 0
        mockNaturalHeight = 0

        const wrapper = mount(AvatarCropModal, {
            props: { open: true, sourceUrl: 'blob:source.png' },
        })

        Object.defineProperty((wrapper.find('[data-test=crop-stage]').element as HTMLDivElement), 'clientWidth', {
            configurable: true,
            value: 336,
        })

        window.dispatchEvent(new Event('resize'))
        await flushPromises()

        mockNaturalWidth = 1430
        mockNaturalHeight = 2048

        await wrapper.find('[data-test=crop-image]').trigger('load')
        await flushPromises()

        expect(consoleInfoMock).toHaveBeenCalledWith(
            '[AvatarCropModal] rawNatural 1430x2048 | computedNatural 1430x2048 | display 235x336 | viewport 336x336',
        )
    })

    it('emits confirm with a cropped file when user accepts', async () => {
        const wrapper = mount(AvatarCropModal, {
            props: { open: true, sourceUrl: 'blob:source.png', outputFileName: 'avatar.png' },
        })

        await wrapper.find('[data-test=crop-image]').trigger('load')
        await flushPromises()
        await wrapper.find('[data-test=crop-confirm]').trigger('click')

        const emitted = wrapper.emitted('confirm')
        expect(emitted).toBeTruthy()
        const file = emitted?.[0]?.[0] as File
        expect(file).toBeInstanceOf(File)
        expect(file.name).toBe('avatar.png')
        expect(file.type).toBe('image/png')
    })

    it('reopens with the previous crop state when initial values are provided', async () => {
        const wrapper = mount(AvatarCropModal, {
            props: {
                open: true,
                sourceUrl: 'blob:source.png',
                initialZoom: 2.1,
                initialOffsetX: 18,
                initialOffsetY: -12,
            },
        })

        await wrapper.find('[data-test=crop-image]').trigger('load')
        await flushPromises()

        expect(wrapper.text()).toContain('2.1x')
        await wrapper.find('[data-test=crop-confirm]').trigger('click')

        const emitted = wrapper.emitted('confirm')
        expect(emitted).toBeTruthy()
        expect(emitted?.[0]?.[1]).toEqual({
            zoom: 2.1,
            offsetX: 18,
            offsetY: -12,
        })
    })

    it('shows the uploaded image in its original aspect ratio inside the crop stage', async () => {
        const wrapper = mount(AvatarCropModal, {
            props: { open: true, sourceUrl: 'blob:source.png', outputFileName: 'avatar.png' },
        })

        Object.defineProperty((wrapper.find('[data-test=crop-stage]').element as HTMLDivElement), 'clientWidth', {
            configurable: true,
            value: 320,
        })

        await wrapper.find('[data-test=crop-image]').trigger('load')
        await flushPromises()

        const style = wrapper.find('[data-test=crop-image]').attributes('style')
        expect(style).toContain('width: 320px;')
        expect(style).toContain('height: 240px;')
    })

    it('stores the same square viewport seen in the modal without distorting aspect ratio', async () => {
        const wrapper = mount(AvatarCropModal, {
            props: { open: true, sourceUrl: 'blob:source.png', outputFileName: 'avatar.png' },
        })

        Object.defineProperty((wrapper.find('[data-test=crop-stage]').element as HTMLDivElement), 'clientWidth', {
            configurable: true,
            value: 320,
        })

        await wrapper.find('[data-test=zoom-slider]').setValue('1.5')
        await wrapper.find('[data-test=crop-image]').trigger('load')
        await flushPromises()
        await wrapper.find('[data-test=crop-confirm]').trigger('click')

        expect(drawImageMock).toHaveBeenCalled()
        const outputCall = drawImageMock.mock.calls.at(-1)!
        expect(outputCall).toHaveLength(5)

        const [, , , outputWidth, outputHeight] = outputCall
        expect(outputWidth / outputHeight).toBeCloseTo(400 / 300, 6)
    })
})
