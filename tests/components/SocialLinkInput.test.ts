import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SocialLinkInput from '@/components/SocialLinkInput.vue'

function mountInput(props: Record<string, unknown> = {}) {
  return mount(SocialLinkInput, { props: { platform: '', modelValue: '', ...props } })
}

function lastEmit(wrapper: ReturnType<typeof mountInput>): string {
  const calls = wrapper.emitted('update:modelValue')
  return (calls?.[calls.length - 1]?.[0] ?? '') as string
}

describe('SocialLinkInput', () => {
  it('模式 A：輸入帳號自動組完整 URL、顯示前綴 affix', async () => {
    const wrapper = mountInput({ platform: 'INSTAGRAM' })
    expect(wrapper.find('.social-link-input__affix').text()).toContain('instagram.com/')
    await wrapper.find('input').setValue('maomao')
    expect(lastEmit(wrapper)).toBe('https://www.instagram.com/maomao')
  })

  it('模式 A：給既有完整 URL，槽位輸入框只顯示帳號', () => {
    const wrapper = mountInput({ platform: 'INSTAGRAM', modelValue: 'https://www.instagram.com/maomao' })
    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('maomao')
  })

  it('模式 A：貼整條 URL 自動剝成帳號再組回', async () => {
    const wrapper = mountInput({ platform: 'INSTAGRAM' })
    await wrapper.find('input').setValue('https://www.instagram.com/maomao/?hl=en')
    expect(lastEmit(wrapper)).toBe('https://www.instagram.com/maomao')
  })

  it('Threads affix 含 @、輸入帳號組出帶 @ 的 URL', async () => {
    const wrapper = mountInput({ platform: 'THREADS' })
    expect(wrapper.find('.social-link-input__affix').text()).toContain('threads.com/@')
    await wrapper.find('input').setValue('maomao')
    expect(lastEmit(wrapper)).toBe('https://www.threads.com/@maomao')
  })

  it('模式 C（free）：無 affix、原樣 emit', async () => {
    const wrapper = mountInput({ platform: 'PERSONAL' })
    expect(wrapper.find('.social-link-input__affix').exists()).toBe(false)
    await wrapper.find('input').setValue('https://my.example.com')
    expect(lastEmit(wrapper)).toBe('https://my.example.com')
  })

  it('切換平台時用同一帳號重組 URL', async () => {
    const wrapper = mountInput({ platform: 'INSTAGRAM', modelValue: 'https://www.instagram.com/maomao' })
    await wrapper.setProps({ platform: 'GITHUB' })
    expect(lastEmit(wrapper)).toBe('https://github.com/maomao')
  })

  it('free→template 平台切換：不把舊完整 URL 當帳號 double-encode', async () => {
    // PERSONAL（free）打了完整 IG URL → 切到 INSTAGRAM（template）
    const wrapper = mountInput({ platform: 'PERSONAL', modelValue: 'https://www.instagram.com/maomao' })
    await wrapper.setProps({ platform: 'INSTAGRAM' })
    // 應反解成帳號再乾淨重組，而非把整條 URL 編碼進路徑
    expect(lastEmit(wrapper)).toBe('https://www.instagram.com/maomao')
  })

  it('free→template 平台切換：舊 URL 與新平台不符則清空', async () => {
    const wrapper = mountInput({ platform: 'PERSONAL', modelValue: 'https://example.com/foo' })
    await wrapper.setProps({ platform: 'INSTAGRAM' })
    expect(lastEmit(wrapper)).toBe('')
  })

  it('模式 A：清空帳號 emit 空字串（讓上層空值檢查擋下加入）', async () => {
    const wrapper = mountInput({ platform: 'INSTAGRAM', modelValue: 'https://www.instagram.com/maomao' })
    await wrapper.find('input').setValue('')
    expect(lastEmit(wrapper)).toBe('')
  })

  it('disabled 時 input 不可填', () => {
    const wrapper = mountInput({ platform: 'INSTAGRAM', disabled: true })
    expect((wrapper.find('input').element as HTMLInputElement).disabled).toBe(true)
  })

  it('平台被清空（取消選擇）時不覆蓋 parent 重置的值', async () => {
    const wrapper = mountInput({ platform: 'INSTAGRAM', modelValue: 'https://www.instagram.com/maomao' })
    const before = wrapper.emitted('update:modelValue')?.length ?? 0
    // parent 同時重置：平台清空 + modelValue 清空
    await wrapper.setProps({ platform: '', modelValue: '' })
    const after = wrapper.emitted('update:modelValue') ?? []
    // 不應再 emit 出非空值把重置蓋回去
    expect(after.slice(before).every(c => c[0] === '')).toBe(true)
  })
})
