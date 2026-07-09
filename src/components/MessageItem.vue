<script setup lang="ts">
import { computed } from 'vue'
import './MessageItem.css'
import type { MessageResponse } from '@/types/message'
import { assetUrl } from '@/utils/assetUrl'
import { buildAvatarRingStyle } from '@/utils/avatarRing'
import { resolveAvatarSrc } from '@/utils/avatarSource'
import { parseMessageSegments } from '@/utils/messageLinks'
import { formatMessageTimestamp } from '@/utils/messageTimestamp'
import CircleCloseButton from '@/components/CircleCloseButton.vue'
import iconReplyRaw from '@/assets/icons/icon-reply.svg?raw'

const props = withDefaults(defineProps<{
    message: MessageResponse
    memberNames?: string[]
    canDelete?: boolean
}>(), {
    memberNames: () => [],
    canDelete: false,
})

const emit = defineEmits<{
    (e: 'avatar-click', userId: string): void
    (e: 'image-click', imageUrl: string): void
    (e: 'image-load'): void
    (e: 'link-click', url: string): void
    (e: 'delete-click', messageId: string): void
    (e: 'reply-click', messageId: string): void
    (e: 'jump', messageId: string): void
}>()

// 回覆預覽為衍生欄位（見 message-storage-and-history-api spec）：replyToFurName 非空即代表
// 已成功解析；為 null（送出當下目標不存在、送出後被刪、或前端 jump-load 找不到後就地清空）
// 則視為無法載入，示意塊不可點擊、不可跳轉。
const replyPreviewResolved = computed(() => props.message.replyToMessageId !== null && props.message.replyToFurName !== null)

function onReplyClick() {
    emit('reply-click', props.message.messageId)
}

function onReplyRefClick() {
    if (!replyPreviewResolved.value || !props.message.replyToMessageId) return
    emit('jump', props.message.replyToMessageId)
}

// content 一律經純函式拆成 segment 序列，以 Vue 文字插值渲染（嚴禁 v-html）。
const contentSegments = computed(() =>
    props.message.content ? parseMessageSegments(props.message.content, props.memberNames) : [],
)

const displayNickname = computed(() => props.message.furName || '')

const formattedTime = computed(() => formatMessageTimestamp(props.message.createdDate))

function onAvatarClick() {
    emit('avatar-click', props.message.userId)
}

const avatarStyle = computed(() => ({
    backgroundImage: `url(${resolveAvatarSrc(props.message.avatar)})`,
    ...buildAvatarRingStyle(props.message.avatarColor, props.message.avatarBorder, 'sm'),
}))
</script>

<template>
    <div class="message-item" :data-message-id="message.messageId">
        <div
            v-if="message.replyToMessageId"
            class="message-item__reply-ref"
            :class="{ 'message-item__reply-ref--unresolvable': !replyPreviewResolved }"
            :role="replyPreviewResolved ? 'button' : undefined"
            :tabindex="replyPreviewResolved ? 0 : undefined"
            @click="onReplyRefClick"
            @keydown.enter.space.prevent="onReplyRefClick"
        >
            <span class="message-item__reply-ref-icon" v-html="iconReplyRaw" aria-hidden="true"></span>
            <template v-if="replyPreviewResolved">
                <span class="message-item__reply-ref-author">{{ message.replyToFurName }}</span>
                <span class="message-item__reply-ref-snippet">{{ message.replyToContentSnippet }}</span>
            </template>
            <span v-else class="message-item__reply-ref-snippet">無法載入訊息</span>
        </div>
        <div class="message-item__row">
            <button
                class="message-item__avatar"
                type="button"
                :style="avatarStyle"
                :aria-label="`open ${displayNickname} profile`"
                @click.stop="onAvatarClick"
            ></button>
            <div class="message-item__body">
                <div class="message-item__meta">
                    <span
                        class="message-item__nickname"
                        role="button"
                        tabindex="0"
                        @click="onAvatarClick"
                        @keydown.enter.space.prevent="onAvatarClick"
                    >{{ displayNickname }}</span>
                    <span class="message-item__timestamp">{{ formattedTime }}</span>
                    <button
                        class="message-item__reply-btn"
                        type="button"
                        aria-label="回覆"
                        @click="onReplyClick"
                    >
                        <span v-html="iconReplyRaw" aria-hidden="true"></span>
                    </button>
                </div>
                <div v-if="message.content" class="message-item__line">
                    <span class="message-item__prompt" aria-hidden="true">&gt;</span>
                    <span class="message-item__content"><template
                        v-for="(seg, idx) in contentSegments"
                        :key="idx"
                    ><a
                            v-if="seg.kind === 'link'"
                            class="message-item__link"
                            :href="seg.url"
                            @click.prevent="emit('link-click', seg.url)"
                        >{{ seg.display }}</a><span
                            v-else-if="seg.kind === 'mention'"
                            class="message-item__mention"
                        >{{ seg.display }}</span><span
                            v-else-if="seg.kind === 'blocked'"
                        >***</span><template v-else>{{ seg.text }}</template></template></span>
                </div>
                <div
                    v-if="message.messageType === 'TEXT' && message.imageUrls.length"
                    class="message-item__images"
                >
                    <div
                        v-for="imageUrl in message.imageUrls"
                        :key="imageUrl"
                        class="message-item__image-frame"
                        @click="emit('image-click', imageUrl)"
                    >
                        <img
                            class="message-item__image"
                            :src="assetUrl(imageUrl)"
                            alt=""
                            loading="lazy"
                            decoding="async"
                            @load="emit('image-load')"
                        />
                    </div>
                </div>
                <img
                    v-if="message.messageType === 'STICKER' && message.stickerImageUrl"
                    class="message-item__sticker"
                    :src="assetUrl(message.stickerImageUrl)"
                    alt=""
                    loading="lazy"
                    decoding="async"
                    role="button"
                    tabindex="0"
                    @click="emit('image-click', message.stickerImageUrl)"
                    @keydown.enter.space.prevent="emit('image-click', message.stickerImageUrl)"
                    @load="emit('image-load')"
                />
            </div>
            <CircleCloseButton
                v-if="canDelete"
                class="message-item__delete"
                :ariaLabel="'刪除訊息'"
                @remove="emit('delete-click', message.messageId)"
            />
        </div>
    </div>
</template>
