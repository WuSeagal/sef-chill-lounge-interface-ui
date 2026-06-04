import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PassportCard from '@/components/PassportCard.vue'
import { TagType, type Tag } from '@/types/user'

const tags: Tag[] = [
    { tagId: 'r1', type: TagType.ROLE, content: 'Backend', isCustom: false },
    { tagId: 'l1', type: TagType.LANGUAGE, content: 'Java', isCustom: false },
    { tagId: 'l2', type: TagType.LANGUAGE, content: 'Kotlin', isCustom: false },
    { tagId: 'c1', type: TagType.CUSTOM, content: '露營', isCustom: true },
]

const socials = [
    { platform: 'X', links: 'https://x.com/a' },
    { platform: 'GITHUB', links: 'https://github.com/a' },
    { platform: 'OTHER', links: 'https://example.com/a' },
    { platform: 'OTHER', links: 'https://example.com/b' },
]

function mountCard(extra: Record<string, unknown> = {}) {
    return mount(PassportCard, {
        props: {
            furName: 'Foxy',
            avatarSrc: '/avatar.png',
            tags,
            socials,
            stickers: [],
            ...extra,
        },
    })
}

describe('PassportCard — grouped TAG rows', () => {
    it('renders one row per non-empty TagType with its prefix label', () => {
        const wrapper = mountCard()
        const rows = wrapper.findAll('.ps-tag-row')
        // ROLE + LANGUAGE + CUSTOM = 3 rows
        expect(rows).toHaveLength(3)
        const prefixes = wrapper.findAll('.ps-tag-prefix').map(p => p.text())
        expect(prefixes).toContain('我是') // ROLE
        expect(prefixes).toContain('我寫') // LANGUAGE
        // CUSTOM has no prefix
        expect(prefixes).toHaveLength(2)
    })

    it('groups multiple chips of the same type into one row', () => {
        const wrapper = mountCard()
        // LANGUAGE row holds Java + Kotlin
        const text = wrapper.text()
        expect(text).toContain('Java')
        expect(text).toContain('Kotlin')
        expect(text).toContain('Backend')
        expect(text).toContain('露營')
    })
})

describe('PassportCard — social links', () => {
    it('renders ALL socials as clickable links (no 3-item cap, no "more")', () => {
        const wrapper = mountCard()
        const links = wrapper.findAll('a.ps-social-link')
        expect(links).toHaveLength(4)
        expect(wrapper.find('.ps-more').exists()).toBe(false)
        expect(wrapper.find('a[href="https://github.com/a"]').exists()).toBe(true)
        const x = wrapper.find('a[href="https://x.com/a"]')
        expect(x.attributes('target')).toBe('_blank')
        expect(x.attributes('rel')).toContain('noopener')
    })
})

describe('PassportCard — sticker click', () => {
    it('emits sticker-click with the sticker url when a sticker is clicked', async () => {
        const wrapper = mountCard({ stickers: ['/s1.png', '/s2.png'] })
        const stickerEls = wrapper.findAll('.ps-sticker')
        expect(stickerEls).toHaveLength(2)
        await stickerEls[1].trigger('click')
        expect(wrapper.emitted('sticker-click')).toBeTruthy()
        expect(wrapper.emitted('sticker-click')![0]).toEqual(['/s2.png'])
    })
})
