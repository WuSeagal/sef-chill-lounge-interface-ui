<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { push } from 'notivue'
import './SettingsTab.css'
import TagEditorPreview from './TagEditorPreview.vue'
import TagEditorModal from './TagEditorModal.vue'
import ToggleSwitch from './ToggleSwitch.vue'
import AvatarCropModal from './AvatarCropModal.vue'
import { buildAvatarRingStyle } from '@/utils/avatarRing'
import { useUser } from '@/composables/useUser'
import { useTagEditorState } from '@/composables/useTagEditorState'
import { useAvatarUploadDraft } from '@/composables/useAvatarUploadDraft'
import { fetchSelectableTags } from '@/api/userApi'
import { uploadAvatar } from '@/api/avatarUploadApi'
import { resolveAvatarSrc } from '@/utils/avatarSource'
import { TagType, TAG_TYPE_ORDER, type GroupedTags, type Tag, type AddSocialLinkRequest } from '@/types/user'

const TAG_MAX = 20

const user = useUser()

const draftFurName = ref<string | null>(null)
const draftAvatarColor = ref<string | null>(null)
const draftAvatarBorder = ref<boolean | null>(null)
const draftSocialAdd = ref<AddSocialLinkRequest[]>([])
const draftSocialRemove = ref<number[]>([])
const avatarDraft = useAvatarUploadDraft()
const avatarInputRef = ref<HTMLInputElement | null>(null)

const tagEditorState = useTagEditorState({ maxPerUser: TAG_MAX })
const tagModalOpen = ref(false)
const selectable = ref<GroupedTags>({
    [TagType.ROLE]: [], [TagType.LANGUAGE]: [], [TagType.FRAMEWORK]: [],
    [TagType.DATABASE]: [], [TagType.DEVOPS]: [], [TagType.CUSTOM]: [],
})

const newSocialPlatform = ref('')
const newSocialUrl = ref('')
const saving = ref(false)
const selectableLoading = ref(false)
const selectableError = ref<string | null>(null)

const displayFurName = computed(() =>
    draftFurName.value ?? user.profile.value?.furName ?? user.profile.value?.username ?? '')
const displayAvatarColor = computed(() =>
    draftAvatarColor.value ?? user.profile.value?.avatarColor ?? '#cccccc')
const displayAvatarBorder = computed(() =>
    draftAvatarBorder.value ?? user.profile.value?.avatarBorder ?? false)
const avatarSrc = computed(() => avatarDraft.previewUrl.value ?? resolveAvatarSrc(user.profile.value?.avatar))
const hasRecroppableAvatar = computed(() => avatarDraft.file.value !== null)
const avatarButtonLabel = computed(() => (avatarDraft.previewUrl.value || user.profile.value?.avatar) ? '更換圖片' : '上傳圖片')
const avatarPreviewStyle = computed(() =>
    buildAvatarRingStyle(displayAvatarColor.value, displayAvatarBorder.value, 'lg'))

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
    avatarDraft.file.value !== null ||
    draftFurName.value !== null ||
    draftAvatarColor.value !== null ||
    draftAvatarBorder.value !== null ||
    tagEditorState.isDirty.value ||
    draftSocialAdd.value.length > 0 ||
    draftSocialRemove.value.length > 0)

// F7 fix: watch only userId identity (shallow), not the entire profile object.
// Deep watch would clobber in-flight drafts whenever any unrelated profile field
// updated (e.g. another tab refreshing avatar after the user starts editing).
watch(
    () => user.profile.value?.userId,
    (currentUserId, previousUserId) => {
        // Only reset draft on first load or when switching users — not on every
        // profile mutation. After saveAll() succeeds we explicitly call reset()
        // ourselves, so this watch is purely for the "initial / user-change" case.
        if (currentUserId && currentUserId !== previousUserId) {
            tagEditorState.reset(user.profile.value?.tags ?? [])
        }
    },
    { immediate: true },
)

async function loadSelectable(): Promise<void> {
    selectableLoading.value = true
    selectableError.value = null
    try {
        selectable.value = await fetchSelectableTags()
    } catch (e: any) {
        selectableError.value = e?.response?.data?.message ?? '載入 TAG 清單失敗'
    } finally {
        selectableLoading.value = false
    }
}
void loadSelectable()

function openAvatarPicker(): void {
    avatarInputRef.value?.click()
}

function reopenAvatarCrop(): void {
    avatarDraft.reopenCrop()
}

function onAvatarFileChange(event: Event): void {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    avatarDraft.setCropSource(file)
    input.value = ''
}

async function onAvatarCropConfirm(file: File, cropState?: import('@/types/avatar').AvatarCropState): Promise<void> {
    await avatarDraft.setCroppedResult(file, cropState)
}

function stageFurName(value: string): void {
    const current = user.profile.value?.furName ?? user.profile.value?.username ?? ''
    draftFurName.value = value === current ? null : value
}
function stageAvatarColor(value: string): void {
    const current = user.profile.value?.avatarColor ?? '#cccccc'
    draftAvatarColor.value = value === current ? null : value
}
function stageAvatarBorder(value: boolean): void {
    const current = user.profile.value?.avatarBorder ?? false
    draftAvatarBorder.value = value === current ? null : value
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
    // F1 fix: don't clear drafts incrementally. Keep all drafts until the entire
    // save succeeds. On partial failure, drafts stay intact + the toast reports
    // which step failed. Retry runs diff() against the now-mutated profile, so
    // already-applied changes won't be re-issued.
    let currentStep = ''
    try {
        let uploadedAvatarPath: string | undefined
        if (avatarDraft.file.value) {
            currentStep = '頭像'
            uploadedAvatarPath = (await uploadAvatar(avatarDraft.file.value)).avatarPath
        }

        if (uploadedAvatarPath !== undefined
            || draftFurName.value !== null
            || draftAvatarColor.value !== null
            || draftAvatarBorder.value !== null) {
            currentStep = '個人資料'
            await user.updateProfile({
                avatar: uploadedAvatarPath,
                furName: draftFurName.value ?? undefined,
                avatarColor: draftAvatarColor.value ?? undefined,
                avatarBorder: draftAvatarBorder.value ?? undefined,
            })
        }
        const { toAdd, toRemove, toCreate } = tagEditorState.diff(user.profile.value?.tags ?? [])
        currentStep = 'TAG'
        for (const tagId of toRemove) await user.removeTag(tagId)
        for (const tagId of toAdd) await user.addTag({ tagId })
        for (const t of toCreate) await user.addTag({ type: t.type, content: t.content })

        currentStep = '社群連結'
        for (const id of [...draftSocialRemove.value]) {
            await user.removeSocialLink(id)
        }
        for (const s of [...draftSocialAdd.value]) {
            await user.addSocialLink(s)
        }

        // Full success — now safe to clear all drafts atomically
        avatarDraft.clearDraft()
        draftFurName.value = null
        draftAvatarColor.value = null
        draftAvatarBorder.value = null
        draftSocialAdd.value = []
        draftSocialRemove.value = []
        tagEditorState.reset(user.profile.value?.tags ?? [])
        push.success('已儲存')
    } catch (e: any) {
        const apiMsg = e?.response?.data?.message
        push.warning(`儲存${currentStep}時失敗${apiMsg ? `:${apiMsg}` : ''},請再試一次`)
    } finally {
        saving.value = false
    }
}

onBeforeUnmount(() => {
    avatarDraft.clearDraft()
})

defineExpose({ isDirty, saveAll, avatarDraft })
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
                    :src="avatarSrc"
                    alt="avatar"
                    :style="avatarPreviewStyle"
                />
                <button
                    type="button"
                    class="settings-tab__btn settings-tab__avatar-upload"
                    @click="openAvatarPicker"
                >{{ avatarButtonLabel }}</button>
                <button
                    v-if="hasRecroppableAvatar"
                    type="button"
                    class="settings-tab__btn settings-tab__avatar-upload settings-tab__avatar-recrop"
                    @click="reopenAvatarCrop"
                >重新裁切</button>
                <input
                    ref="avatarInputRef"
                    class="settings-tab__file-input"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    @change="onAvatarFileChange"
                />
            </div>
        </div>

        <div class="settings-tab__field">
            <label class="settings-tab__label">顯示頭像外框</label>
            <div class="settings-tab__border-row">
                <div class="settings-tab__border-enable">
                    <span class="settings-tab__sublabel">啟用</span>
                    <ToggleSwitch
                        data-test="avatar-border-toggle"
                        aria-label="啟用頭像外框"
                        :model-value="displayAvatarBorder"
                        @update:model-value="stageAvatarBorder"
                    />
                </div>
                <div v-if="displayAvatarBorder" class="settings-tab__border-color">
                    <span class="settings-tab__sublabel">邊框顏色</span>
                    <input
                        class="settings-tab__color-input"
                        type="color"
                        :value="displayAvatarColor"
                        @input="stageAvatarColor(($event.target as HTMLInputElement).value)"
                    />
                    <span class="settings-tab__color-value">{{ displayAvatarColor }}</span>
                </div>
            </div>
        </div>

        <div v-if="selectableError" class="settings-tab__error" data-test="selectable-error">
            <span>{{ selectableError }}</span>
            <button type="button" class="settings-tab__btn" :disabled="selectableLoading" @click="loadSelectable">
                {{ selectableLoading ? '載入中...' : '重試' }}
            </button>
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

        <AvatarCropModal
            :open="avatarDraft.cropOpen.value"
            :source-url="avatarDraft.sourceUrl.value"
            :initial-zoom="avatarDraft.modalCropState.value?.zoom ?? 1"
            :initial-offset-x="avatarDraft.modalCropState.value?.offsetX ?? 0"
            :initial-offset-y="avatarDraft.modalCropState.value?.offsetY ?? 0"
            output-file-name="avatar.png"
            @close="avatarDraft.cancelCrop()"
            @confirm="onAvatarCropConfirm"
        />
    </div>
</template>
