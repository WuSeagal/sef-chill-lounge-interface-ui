<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { push } from 'notivue'
import './SettingsTab.css'
import TagEditorPreview from './TagEditorPreview.vue'
import TagEditorModal from './TagEditorModal.vue'
import { useUser } from '@/composables/useUser'
import { useTagEditorState } from '@/composables/useTagEditorState'
import { fetchSelectableTags } from '@/api/userApi'
import { assetUrl } from '@/utils/assetUrl'
import { TagType, TAG_TYPE_ORDER, type GroupedTags, type Tag, type AddSocialLinkRequest } from '@/types/user'

const TAG_MAX = 20

const user = useUser()

const draftFurName = ref<string | null>(null)
const draftAvatarColor = ref<string | null>(null)
const draftSocialAdd = ref<AddSocialLinkRequest[]>([])
const draftSocialRemove = ref<number[]>([])

const tagEditorState = useTagEditorState({ maxPerUser: TAG_MAX })
const tagModalOpen = ref(false)
const selectable = ref<GroupedTags>({
    [TagType.ROLE]: [], [TagType.LANGUAGE]: [], [TagType.FRAMEWORK]: [],
    [TagType.DATABASE]: [], [TagType.DEVOPS]: [], [TagType.CUSTOM]: [],
})

const newSocialPlatform = ref('')
const newSocialUrl = ref('')
const saving = ref(false)

const displayFurName = computed(() =>
    draftFurName.value ?? user.profile.value?.furName ?? user.profile.value?.username ?? '')
const displayAvatarColor = computed(() =>
    draftAvatarColor.value ?? user.profile.value?.avatarColor ?? '#cccccc')
const avatar = computed(() => user.profile.value?.avatar ?? '')

const previewTags = computed<Tag[]>(() => {
    const result: Tag[] = []
    for (const type of TAG_TYPE_ORDER) {
        const arr = selectable.value[type] ?? []
        for (const tag of arr) {
            if (tagEditorState.selectedTagIds.value.has(tag.tagId)) result.push(tag)
        }
        for (const content of tagEditorState.newCustomTags.value.get(type) ?? []) {
            result.push({ tagId: `__new__${type}__${content}`, type, content, isCustom: true })
        }
    }
    return result
})

const previewSocials = computed(() => {
    const existing = user.profile.value?.socials ?? []
    const kept = existing.filter(s => !draftSocialRemove.value.includes(s.id))
    const drafts = draftSocialAdd.value.map((s, i) => ({ id: -1 - i, ...s }))
    return [...kept, ...drafts]
})

const isDirty = computed(() =>
    draftFurName.value !== null ||
    draftAvatarColor.value !== null ||
    tagEditorState.isDirty.value ||
    draftSocialAdd.value.length > 0 ||
    draftSocialRemove.value.length > 0)

watch(
    () => user.profile.value,
    (p) => {
        if (p) tagEditorState.reset(p.tags ?? [])
    },
    { immediate: true, deep: true },
)

async function loadSelectable(): Promise<void> {
    try { selectable.value = await fetchSelectableTags() } catch { /* keep empty */ }
}
void loadSelectable()

function stageFurName(value: string): void {
    const current = user.profile.value?.furName ?? user.profile.value?.username ?? ''
    draftFurName.value = value === current ? null : value
}
function stageAvatarColor(value: string): void {
    const current = user.profile.value?.avatarColor ?? '#cccccc'
    draftAvatarColor.value = value === current ? null : value
}
function stageAddSocial(): void {
    const platform = newSocialPlatform.value.trim()
    const links = newSocialUrl.value.trim()
    if (!platform || !links) return
    draftSocialAdd.value = [...draftSocialAdd.value, { platform, links }]
    newSocialPlatform.value = ''
    newSocialUrl.value = ''
}
function stageRemoveSocial(id: number): void {
    if (id < 0) {
        const idx = -1 - id
        draftSocialAdd.value = draftSocialAdd.value.filter((_, i) => i !== idx)
    } else {
        draftSocialRemove.value = [...draftSocialRemove.value, id]
    }
}

async function saveAll(): Promise<void> {
    if (!isDirty.value || saving.value) return
    saving.value = true
    try {
        if (draftFurName.value !== null || draftAvatarColor.value !== null) {
            await user.updateProfile({
                furName: draftFurName.value ?? undefined,
                avatarColor: draftAvatarColor.value ?? undefined,
            })
            draftFurName.value = null
            draftAvatarColor.value = null
        }
        const { toAdd, toRemove, toCreate } = tagEditorState.diff(user.profile.value?.tags ?? [])
        for (const tagId of toRemove) await user.removeTag(tagId)
        for (const tagId of toAdd) await user.addTag({ tagId })
        for (const t of toCreate) await user.addTag({ type: t.type, content: t.content })
        for (const id of [...draftSocialRemove.value]) {
            await user.removeSocialLink(id)
            draftSocialRemove.value = draftSocialRemove.value.filter(x => x !== id)
        }
        for (const s of [...draftSocialAdd.value]) {
            await user.addSocialLink(s)
            draftSocialAdd.value = draftSocialAdd.value.filter(x => x !== s)
        }
        tagEditorState.reset(user.profile.value?.tags ?? [])
        push.success('已儲存')
    } catch (e: any) {
        push.warning(e?.response?.data?.message ?? '儲存失敗')
    } finally {
        saving.value = false
    }
}

defineExpose({ isDirty, saveAll })
</script>

<template>
    <div class="settings-tab">
        <div class="settings-tab__field">
            <label class="settings-tab__label">顯示名稱</label>
            <input
                class="settings-tab__nickname"
                type="text"
                :value="displayFurName"
                @input="stageFurName(($event.target as HTMLInputElement).value)"
            />
        </div>

        <div class="settings-tab__field">
            <label class="settings-tab__label">頭像</label>
            <div class="settings-tab__avatar-row">
                <img
                    class="settings-tab__avatar-img"
                    :src="assetUrl(avatar)"
                    alt="avatar"
                    :style="{ borderColor: displayAvatarColor }"
                />
            </div>
        </div>

        <div class="settings-tab__field">
            <label class="settings-tab__label">頭像框背景色</label>
            <div class="settings-tab__color-row">
                <input
                    class="settings-tab__color-input"
                    type="color"
                    :value="displayAvatarColor"
                    @input="stageAvatarColor(($event.target as HTMLInputElement).value)"
                />
                <span class="settings-tab__color-value">{{ displayAvatarColor }}</span>
            </div>
        </div>

        <TagEditorPreview :tags="previewTags" @edit="tagModalOpen = true" />

        <div class="settings-tab__field" data-field="social-links">
            <label class="settings-tab__label">社群連結</label>
            <div class="settings-tab__social-list">
                <div v-for="link in previewSocials" :key="link.id" class="settings-tab__social-item">
                    <span class="settings-tab__social-platform">{{ link.platform }}</span>
                    <a :href="link.links" target="_blank" rel="noopener noreferrer" class="settings-tab__social-url">{{ link.links }}</a>
                    <button type="button" class="settings-tab__social-remove" @click="stageRemoveSocial(link.id)">&times;</button>
                </div>
            </div>
            <div class="settings-tab__add-row">
                <input v-model="newSocialPlatform" class="settings-tab__input settings-tab__input--short" placeholder="平台" />
                <input v-model="newSocialUrl" class="settings-tab__input" placeholder="URL" @keydown.enter="stageAddSocial" />
                <button type="button" class="settings-tab__btn" @click="stageAddSocial">+</button>
            </div>
        </div>

        <div class="settings-tab__save-row">
            <button
                type="button"
                class="settings-tab__save-btn"
                :disabled="!isDirty || saving"
                data-test="save-all"
                @click="saveAll"
            >{{ saving ? '儲存中...' : '儲存' }}</button>
        </div>

        <TagEditorModal
            :open="tagModalOpen"
            :selectable="selectable"
            :state="tagEditorState"
            :max-per-user="TAG_MAX"
            @close="tagModalOpen = false"
        />
    </div>
</template>
