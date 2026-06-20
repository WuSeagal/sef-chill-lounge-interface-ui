import facebook from '@/assets/social/facebook.svg?raw'
import steam from '@/assets/social/steam.svg?raw'
import plurk from '@/assets/social/plurk.svg?raw'
import cakeresume from '@/assets/social/cakeresume.svg?raw'
import linkedin from '@/assets/social/linkedin.svg?raw'
import twitch from '@/assets/social/twitch.svg?raw'
import threads from '@/assets/social/threads.svg?raw'
import instagram from '@/assets/social/instagram.svg?raw'
import discord from '@/assets/social/discord.svg?raw'
import bluesky from '@/assets/social/bluesky.svg?raw'
import x from '@/assets/social/x.svg?raw'
import github from '@/assets/social/github.svg?raw'
import personal from '@/assets/social/personal.svg?raw'
import other from '@/assets/social/other.svg?raw'

export const SOCIAL_PLATFORMS = [
  'FACEBOOK', 'FACEBOOK_PAGE', 'STEAM', 'PLURK', 'CAKERESUME', 'LINKEDIN', 'TWITCH', 'THREADS',
  'INSTAGRAM', 'DISCORD', 'DISCORD_SERVER', 'BLUESKY', 'X', 'GITHUB', 'PERSONAL', 'OTHER',
] as const

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number]

/** 輸入模式：template = 只填槽位自動補前綴；free = 自由貼完整 URL */
export type InputMode = 'template' | 'free'
/** 顯示模式：handle = 去前綴顯示 @帳號；fullUrl = 顯示完整 URL；lastSegment = 顯示路徑識別段（/id/ 或 /profiles/ 後一段） */
export type DisplayMode = 'handle' | 'fullUrl' | 'lastSegment'

export interface PlatformMeta {
  value: SocialPlatform
  label: string
  /** 內嵌 SVG 原始碼字串（供 v-html，沿用 BottomBar 慣例，吃 currentColor） */
  icon: string
  brandColor: string
  /** host 級允許 pattern；undefined 代表只跑通用安全層（PERSONAL/OTHER） */
  urlPattern?: RegExp
  /** 輸入模式 */
  inputMode: InputMode
  /** 顯示模式 */
  displayMode: DisplayMode
  /** template 模式的 URL 模板，含 `{{}}` 槽位；free 模式為 undefined */
  urlTemplate?: string
  /** 槽位 placeholder（username / id / key / name） */
  fillPlaceholder?: string
}

const FACEBOOK_HOST = /^(www\.|m\.)?facebook\.com$|^fb\.com$/i

export const PLATFORMS: Record<SocialPlatform, PlatformMeta> = {
  FACEBOOK:       { value: 'FACEBOOK',       label: 'Facebook個人',     icon: facebook,   brandColor: '#1877f2', urlPattern: FACEBOOK_HOST, inputMode: 'template', displayMode: 'handle',  urlTemplate: 'https://www.facebook.com/{{}}', fillPlaceholder: 'username' },
  FACEBOOK_PAGE:  { value: 'FACEBOOK_PAGE',  label: 'Facebook粉絲專頁', icon: facebook,   brandColor: '#1877f2', urlPattern: FACEBOOK_HOST, inputMode: 'template', displayMode: 'fullUrl', urlTemplate: 'https://www.facebook.com/profile.php?id={{}}', fillPlaceholder: 'id' },
  STEAM:          { value: 'STEAM',          label: 'Steam',            icon: steam,      brandColor: '#171a21', urlPattern: /^(www\.)?steamcommunity\.com$/i, inputMode: 'free', displayMode: 'lastSegment' },
  PLURK:          { value: 'PLURK',          label: 'Plurk',            icon: plurk,      brandColor: '#ff574d', urlPattern: /^(www\.)?plurk\.com$/i, inputMode: 'template', displayMode: 'handle', urlTemplate: 'https://www.plurk.com/{{}}', fillPlaceholder: 'username' },
  CAKERESUME:     { value: 'CAKERESUME',     label: 'CakeResume',       icon: cakeresume, brandColor: '#34c759', urlPattern: /^(www\.)?(cake\.me|cakeresume\.com)$/i, inputMode: 'template', displayMode: 'handle', urlTemplate: 'https://www.cake.me/me/{{}}', fillPlaceholder: 'username' },
  LINKEDIN:       { value: 'LINKEDIN',       label: 'LinkedIn',         icon: linkedin,   brandColor: '#0a66c2', urlPattern: /^(www\.)?linkedin\.com$/i, inputMode: 'template', displayMode: 'handle', urlTemplate: 'https://www.linkedin.com/in/{{}}', fillPlaceholder: 'name' },
  TWITCH:         { value: 'TWITCH',         label: 'Twitch',           icon: twitch,     brandColor: '#9146ff', urlPattern: /^(www\.)?twitch\.tv$/i, inputMode: 'template', displayMode: 'handle', urlTemplate: 'https://www.twitch.tv/{{}}', fillPlaceholder: 'username' },
  THREADS:        { value: 'THREADS',        label: 'Threads',          icon: threads,    brandColor: '#000000', urlPattern: /^(www\.)?threads\.(com|net)$/i, inputMode: 'template', displayMode: 'handle', urlTemplate: 'https://www.threads.com/@{{}}', fillPlaceholder: 'username' },
  INSTAGRAM:      { value: 'INSTAGRAM',      label: 'Instagram',        icon: instagram,  brandColor: '#e4405f', urlPattern: /^(www\.)?instagram\.com$/i, inputMode: 'template', displayMode: 'handle', urlTemplate: 'https://www.instagram.com/{{}}', fillPlaceholder: 'username' },
  DISCORD:        { value: 'DISCORD',        label: 'Discord個人',      icon: discord,    brandColor: '#5865f2', urlPattern: /^(www\.)?discord\.(gg|com)$/i, inputMode: 'template', displayMode: 'fullUrl', urlTemplate: 'https://discord.com/users/{{}}', fillPlaceholder: 'id' },
  DISCORD_SERVER: { value: 'DISCORD_SERVER', label: 'Discord伺服器',    icon: discord,    brandColor: '#5865f2', urlPattern: /^(www\.)?discord\.gg$/i, inputMode: 'template', displayMode: 'fullUrl', urlTemplate: 'https://discord.gg/{{}}', fillPlaceholder: 'key' },
  BLUESKY:        { value: 'BLUESKY',        label: 'Bluesky',          icon: bluesky,    brandColor: '#0085ff', urlPattern: /^(www\.)?bsky\.app$/i, inputMode: 'template', displayMode: 'handle', urlTemplate: 'https://bsky.app/profile/{{}}', fillPlaceholder: 'username' },
  X:              { value: 'X',              label: 'X',                icon: x,          brandColor: '#000000', urlPattern: /^(www\.)?(x\.com|twitter\.com)$/i, inputMode: 'template', displayMode: 'handle', urlTemplate: 'https://x.com/{{}}', fillPlaceholder: 'username' },
  GITHUB:         { value: 'GITHUB',         label: 'GitHub',           icon: github,     brandColor: '#181717', urlPattern: /^(www\.)?github\.com$/i, inputMode: 'template', displayMode: 'handle', urlTemplate: 'https://github.com/{{}}', fillPlaceholder: 'username' },
  PERSONAL:       { value: 'PERSONAL',       label: '個人頁面',          icon: personal,   brandColor: '#625945', inputMode: 'free', displayMode: 'fullUrl' },
  OTHER:          { value: 'OTHER',          label: '其他',              icon: other,      brandColor: '#8c8672', inputMode: 'free', displayMode: 'fullUrl' },
}

export const PLATFORM_LIST: PlatformMeta[] = SOCIAL_PLATFORMS.map((p) => PLATFORMS[p])

export function resolvePlatformMeta(value: string): PlatformMeta {
  return (PLATFORMS as Record<string, PlatformMeta>)[value] ?? PLATFORMS.OTHER
}
