<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import './SettingsTab.css'
import { useUser } from '@/composables/useUser'

const user = useUser()

// 本地編輯欄位（不會 keystroke 直打 API，改成 onBlur 才 update）
const localFurName = ref<string>('')
const localAvatarColor = ref<string>('')

watch(
    () => user.profile.value,
    (p) => {
        if (p) {
            localFurName.value = p.furName ?? p.username
            localAvatarColor.value = p.avatarColor ?? '#cccccc'
        }
    },
    { immediate: true, deep: true },
)

const tags = computed(() => user.profile.value?.tags ?? [])
const socials = computed(() => user.profile.value?.socials ?? [])
const stickers = computed(() => user.profile.value?.stickers ?? [])
const topicContent = computed(() => user.profile.value?.topic?.content ?? '')
const avatar = computed(() => user.profile.value?.avatar ?? '')

const newTag = ref('')
const newPlatform = ref('')
const newUrl = ref('')

const redrawing = ref(false)

async function onFurNameBlur() {
    const next = localFurName.value.trim()
    if (!next || next === (user.profile.value?.furName ?? user.profile.value?.username)) return
    await user.updateProfile({ furName: next })
}

async function onColorChange(event: Event) {
    const target = event.target as HTMLInputElement
    localAvatarColor.value = target.value
    await user.updateProfile({ avatarColor: target.value })
}

function onAvatarFileChange(event: Event) {
    const target = event.target as HTMLInputElement
    console.log('[SettingsTab] avatar file selected:', target.files?.[0]?.name ?? 'none')
    // 圖片上傳屬另一 change（chat-image-upload 衍生），本 change 暫不實作
}

async function onRedraw() {
    if (redrawing.value) return
    redrawing.value = true
    try {
        await user.redrawTopicCard()
    } finally {
        redrawing.value = false
    }
}

async function addTag() {
    const trimmed = newTag.value.trim()
    if (!trimmed) return
    await user.addTag({ type: 'custom', content: trimmed })
    newTag.value = ''
}

async function removeTag(tagId: string) {
    await user.removeTag(tagId)
}

async function addSocialLink() {
    const platform = newPlatform.value.trim()
    const url = newUrl.value.trim()
    if (!platform || !url) return
    await user.addSocialLink({ platform, links: url })
    newPlatform.value = ''
    newUrl.value = ''
}

async function removeSocialLink(id: number) {
    await user.removeSocialLink(id)
}

function onStickerFileChange(index: number, event: Event) {
    const target = event.target as HTMLInputElement
    console.log(`[SettingsTab] sticker ${index} file selected:`, target.files?.[0]?.name ?? 'none')
    // sticker 上傳屬 chat-image-upload 衍生，本 change 暫不實作
}
</script>

<template>
    <div class="settings-tab">
        <div class="settings-tab__field">
            <label class="settings-tab__label">顯示名稱</label>
            <input
                class="settings-tab__nickname"
                type="text"
                v-model="localFurName"
                @blur="onFurNameBlur"
            />
        </div>

        <div class="settings-tab__field">
            <label class="settings-tab__label">頭像</label>
            <div class="settings-tab__avatar-row">
                <img
                    class="settings-tab__avatar-img"
                    :src="avatar || ''"
                    alt="avatar"
                    :style="{ borderColor: localAvatarColor }"
                />
                <input
                    class="settings-tab__avatar-upload"
                    type="file"
                    accept="image/*"
                    @change="onAvatarFileChange"
                />
            </div>
        </div>

        <div class="settings-tab__field">
            <label class="settings-tab__label">頭像框背景色</label>
            <div class="settings-tab__color-row">
                <input
                    class="settings-tab__color-input"
                    type="color"
                    :value="localAvatarColor"
                    @input="onColorChange"
                />
                <span class="settings-tab__color-value">{{ localAvatarColor }}</span>
            </div>
        </div>

        <div class="settings-tab__field" data-field="tags">
            <label class="settings-tab__label">TAG</label>
            <div class="settings-tab__tags">
                <span v-for="t in tags" :key="t.tagId" class="settings-tab__tag-chip">
                    {{ t.content }}
                    <button type="button" class="settings-tab__tag-remove" @click="removeTag(t.tagId)">&times;</button>
                </span>
            </div>
            <div class="settings-tab__add-row">
                <input v-model="newTag" class="settings-tab__input" placeholder="新增 TAG" @keydown.enter="addTag" />
                <button type="button" class="settings-tab__btn" @click="addTag">+</button>
            </div>
        </div>

        <div class="settings-tab__field" data-field="social-links">
            <label class="settings-tab__label">社群連結</label>
            <div class="settings-tab__social-list">
                <div v-for="link in socials" :key="link.id" class="settings-tab__social-item">
                    <span class="settings-tab__social-platform">{{ link.platform }}</span>
                    <a :href="link.links" target="_blank" rel="noopener noreferrer" class="settings-tab__social-url">{{ link.links }}</a>
                    <button type="button" class="settings-tab__social-remove" @click="removeSocialLink(link.id)">&times;</button>
                </div>
            </div>
            <div class="settings-tab__add-row">
                <input v-model="newPlatform" class="settings-tab__input settings-tab__input--short" placeholder="平台" />
                <input v-model="newUrl" class="settings-tab__input" placeholder="URL" @keydown.enter="addSocialLink" />
                <button type="button" class="settings-tab__btn" @click="addSocialLink">+</button>
            </div>
        </div>

        <div class="settings-tab__field" data-field="stickers">
            <label class="settings-tab__label">自訂貼圖</label>
            <div class="settings-tab__sticker-grid">
                <div v-for="s in stickers" :key="s.id" class="settings-tab__sticker-slot">
                    <img class="settings-tab__sticker-img" :src="s.sticker ?? ''" :alt="'sticker ' + (s.stickerNo)" />
                    <input
                        class="settings-tab__sticker-upload"
                        type="file"
                        accept="image/*"
                        @change="onStickerFileChange(s.stickerNo, $event)"
                    />
                </div>
            </div>
        </div>

        <div class="settings-tab__field">
            <label class="settings-tab__label">話題卡</label>
            <div class="settings-tab__topic-card">
                <span class="settings-tab__topic-content">{{ topicContent }}</span>
                <button class="settings-tab__topic-redraw" type="button" :disabled="redrawing" @click="onRedraw">重抽</button>
            </div>
        </div>
    </div>
</template>
