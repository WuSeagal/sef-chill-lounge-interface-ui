import { describe, it, expect } from 'vitest'

describe('smoke', () => {
    it('vitest runs', () => {
        expect(1 + 1).toBe(2)
    })

    it('happy-dom is available', () => {
        const div = document.createElement('div')
        div.textContent = 'hello'
        expect(div.textContent).toBe('hello')
    })
})
