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
  'FACEBOOK', 'STEAM', 'PLURK', 'CAKERESUME', 'LINKEDIN', 'TWITCH', 'THREADS',
  'INSTAGRAM', 'DISCORD', 'BLUESKY', 'X', 'GITHUB', 'PERSONAL', 'OTHER',
] as const

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number]

export interface PlatformMeta {
  value: SocialPlatform
  label: string
  /** 內嵌 SVG 原始碼字串（供 v-html，沿用 BottomBar 慣例，吃 currentColor） */
  icon: string
  brandColor: string
  /** host 級允許 pattern；undefined 代表只跑通用安全層（PERSONAL/OTHER） */
  urlPattern?: RegExp
}

export const PLATFORMS: Record<SocialPlatform, PlatformMeta> = {
  FACEBOOK:   { value: 'FACEBOOK',   label: 'Facebook',   icon: facebook,   brandColor: '#1877f2', urlPattern: /^(www\.|m\.)?facebook\.com$|^fb\.com$/i },
  STEAM:      { value: 'STEAM',      label: 'Steam',      icon: steam,      brandColor: '#171a21', urlPattern: /^(www\.)?steamcommunity\.com$/i },
  PLURK:      { value: 'PLURK',      label: 'Plurk',      icon: plurk,      brandColor: '#ff574d', urlPattern: /^(www\.)?plurk\.com$/i },
  CAKERESUME: { value: 'CAKERESUME', label: 'CakeResume', icon: cakeresume, brandColor: '#34c759', urlPattern: /^(www\.)?(cake\.me|cakeresume\.com)$/i },
  LINKEDIN:   { value: 'LINKEDIN',   label: 'LinkedIn',   icon: linkedin,   brandColor: '#0a66c2', urlPattern: /^(www\.)?linkedin\.com$/i },
  TWITCH:     { value: 'TWITCH',     label: 'Twitch',     icon: twitch,     brandColor: '#9146ff', urlPattern: /^(www\.)?twitch\.tv$/i },
  THREADS:    { value: 'THREADS',    label: 'Threads',    icon: threads,    brandColor: '#000000', urlPattern: /^(www\.)?threads\.(com|net)$/i },
  INSTAGRAM:  { value: 'INSTAGRAM',  label: 'Instagram',  icon: instagram,  brandColor: '#e4405f', urlPattern: /^(www\.)?instagram\.com$/i },
  DISCORD:    { value: 'DISCORD',    label: 'Discord',    icon: discord,    brandColor: '#5865f2', urlPattern: /^(www\.)?discord\.(gg|com)$/i },
  BLUESKY:    { value: 'BLUESKY',    label: 'Bluesky',    icon: bluesky,    brandColor: '#0085ff', urlPattern: /^(www\.)?bsky\.app$/i },
  X:          { value: 'X',          label: 'X',          icon: x,          brandColor: '#000000', urlPattern: /^(www\.)?(x\.com|twitter\.com)$/i },
  GITHUB:     { value: 'GITHUB',     label: 'GitHub',     icon: github,     brandColor: '#181717', urlPattern: /^(www\.)?github\.com$/i },
  PERSONAL:   { value: 'PERSONAL',   label: '個人頁面',    icon: personal,   brandColor: '#625945' },
  OTHER:      { value: 'OTHER',      label: '其他',        icon: other,      brandColor: '#8c8672' },
}

export const PLATFORM_LIST: PlatformMeta[] = SOCIAL_PLATFORMS.map((p) => PLATFORMS[p])
