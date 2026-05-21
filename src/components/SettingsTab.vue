<script setup lang="ts">
import { ref } from 'vue'
import './SettingsTab.css'
import { useMockUser } from '@/composables/useMockUser'
import { useMockTopics } from '@/composables/useMockTopics'

const { user, setNickname, redrawTopicCard } = useMockUser()
const { topics } = useMockTopics()

const newTag = ref('')
const newPlatform = ref('')
const newUrl = ref('')

function onNicknameInput(event: Event) {
    const target = event.target as HTMLInputElement
    setNickname(target.value)
}

function onColorChange(event: Event) {
    const target = event.target as HTMLInputElement
    user.value.avatarBgColor = target.value
}

function onAvatarFileChange(event: Event) {
    const target = event.target as HTMLInputElement
    console.log('[SettingsTab] avatar file selected:', target.files?.[0]?.name ?? 'none')
}

function onRedraw() {
    redrawTopicCard(topics.value)
}

function addTag() {
    const trimmed = newTag.value.trim()
    if (!trimmed) return
    user.value.tags.push(trimmed)
    newTag.value = ''
}

function removeTag(index: number) {
    user.value.tags.splice(index, 1)
}

function addSocialLink() {
    const platform = newPlatform.value.trim()
    const url = newUrl.value.trim()
    if (!platform || !url) return
    user.value.socialLinks.push({ platform, url })
    newPlatform.value = ''
    newUrl.value = ''
}

function removeSocialLink(index: number) {
    user.value.socialLinks.splice(index, 1)
}

function onStickerFileChange(index: number, event: Event) {
    const target = event.target as HTMLInputElement
    console.log(`[SettingsTab] sticker ${index} file selected:`, target.files?.[0]?.name ?? 'none')
}
</script>

<template>
    <div class="settings-tab">
        <div class="settings-tab__field">
            <label class="settings-tab__label">暱稱</label>
            <input
                class="settings-tab__nickname"
                type="text"
                :value="user.nickname"
                @input="onNicknameInput"
            />
        </div>

        <div class="settings-tab__field">
            <label class="settings-tab__label">頭像</label>
            <div class="settings-tab__avatar-row">
                <img
                    class="settings-tab__avatar-img"
                    :src="user.avatarUrl"
                    alt="avatar"
                    :style="{ borderColor: user.avatarBgColor }"
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
                    :value="user.avatarBgColor"
                    @input="onColorChange"
                />
                <span class="settings-tab__color-value">{{ user.avatarBgColor }}</span>
            </div>
        </div>

        <div class="settings-tab__field" data-field="tags">
            <label class="settings-tab__label">TAG</label>
            <div class="settings-tab__tags">
                <span v-for="(tag, i) in user.tags" :key="i" class="settings-tab__tag-chip">
                    {{ tag }}
                    <button type="button" class="settings-tab__tag-remove" @click="removeTag(i)">&times;</button>
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
                <div v-for="(link, i) in user.socialLinks" :key="i" class="settings-tab__social-item">
                    <span class="settings-tab__social-platform">{{ link.platform }}</span>
                    <a :href="link.url" target="_blank" rel="noopener noreferrer" class="settings-tab__social-url">{{ link.url }}</a>
                    <button type="button" class="settings-tab__social-remove" @click="removeSocialLink(i)">&times;</button>
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
                <div v-for="(sticker, i) in user.stickers" :key="i" class="settings-tab__sticker-slot">
                    <img class="settings-tab__sticker-img" :src="sticker" :alt="'sticker ' + (i + 1)" />
                    <input
                        class="settings-tab__sticker-upload"
                        type="file"
                        accept="image/*"
                        @change="onStickerFileChange(i, $event)"
                    />
                </div>
            </div>
        </div>

        <div class="settings-tab__field">
            <label class="settings-tab__label">話題卡</label>
            <div class="settings-tab__topic-card">
                <span class="settings-tab__topic-content">{{ user.topicCard.content }}</span>
                <button class="settings-tab__topic-redraw" type="button" @click="onRedraw">重抽</button>
            </div>
        </div>
    </div>
</template>
