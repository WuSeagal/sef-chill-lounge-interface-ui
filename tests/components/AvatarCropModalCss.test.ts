import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('AvatarCropModal.css', () => {
    it('renders the crop preview as a positioned image with preserved intrinsic aspect ratio', () => {
        const css = readFileSync(
            resolve(import.meta.dirname, '../../src/components/AvatarCropModal.css'),
            'utf8',
        )

        expect(css).toContain('.avatar-crop-modal__source-image')
        expect(css).toContain('position: absolute;')
        expect(css).toContain('max-width: none;')
        expect(css).toContain('pointer-events: none;')
    })
})
