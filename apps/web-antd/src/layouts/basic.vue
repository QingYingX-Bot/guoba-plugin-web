<script lang="ts" setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue';

import { AuthenticationLoginExpiredModal, VCropper } from '@vben/common-ui';
import { useWatermark } from '@vben/hooks';
import {
  BasicLayout,
  LockScreen,
  UserDropdown,
} from '@vben/layouts';
import { preferences } from '@vben/preferences';
import { useAccessStore, useUserStore } from '@vben/stores';

import { Button, Form, Input, Modal, message } from 'ant-design-vue';

import { getUserProfileApi, updateUserProfileApi } from '#/api';
import { useAuthStore } from '#/store';
import LoginForm from '#/views/_core/authentication/login.vue';

const userStore = useUserStore();
const authStore = useAuthStore();
const accessStore = useAccessStore();
const { destroyWatermark, updateWatermark } = useWatermark();
const profileModalOpen = ref(false);
const profileSaving = ref(false);
const avatarCropperOpen = ref(false);
const avatarCropping = ref(false);
const avatarFileInputRef = ref<HTMLInputElement | null>(null);
const avatarCropperRef = ref<InstanceType<typeof VCropper> | null>(null);
const avatarCropperImage = ref('');
const profileForm = reactive({
  avatar: '',
  displayName: '',
});

const avatar = computed(() => {
  return userStore.userInfo?.avatar ?? preferences.app.defaultAvatar;
});

const userMenus = computed(() => [
  {
    handler: openProfileModal,
    icon: 'lucide:user-pen',
    text: '面板资料',
  },
]);

async function handleLogout() {
  await authStore.logout(false);
}

async function openProfileModal() {
  const profile = await getUserProfileApi();
  profileForm.displayName =
    profile?.displayName ?? userStore.userInfo?.realName ?? '';
  profileForm.avatar = profile?.avatar ?? userStore.userInfo?.avatar ?? '';
  profileModalOpen.value = true;
}

async function handleProfileSubmit() {
  try {
    profileSaving.value = true;
    await updateUserProfileApi({
      avatar: profileForm.avatar.trim(),
      displayName: profileForm.displayName.trim(),
    });
    await authStore.fetchUserInfo();
    profileModalOpen.value = false;
    message.success('面板资料已保存');
  } finally {
    profileSaving.value = false;
  }
}

function openAvatarFilePicker() {
  avatarFileInputRef.value?.click();
}

function handleAvatarFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    message.warning('请选择图片文件');
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    message.warning('图片不能超过 5MB');
    return;
  }
  revokeAvatarCropperImage();
  avatarCropperImage.value = URL.createObjectURL(file);
  avatarCropperOpen.value = true;
}

async function handleAvatarCropConfirm() {
  const cropper = avatarCropperRef.value;
  if (!cropper) {
    message.error('裁剪器未就绪');
    return;
  }
  try {
    avatarCropping.value = true;
    const cropped = await cropper.getCropImage(
      'image/png',
      0.92,
      'base64',
      256,
      256,
    );
    if (typeof cropped !== 'string' || !cropped) {
      message.error('头像裁剪失败');
      return;
    }
    profileForm.avatar = cropped;
    closeAvatarCropper();
  } catch {
    message.error('头像裁剪失败');
  } finally {
    avatarCropping.value = false;
  }
}

function clearAvatar() {
  profileForm.avatar = '';
}

function closeAvatarCropper() {
  avatarCropperOpen.value = false;
  avatarCropperRef.value = null;
  revokeAvatarCropperImage();
}

function revokeAvatarCropperImage() {
  if (avatarCropperImage.value) {
    URL.revokeObjectURL(avatarCropperImage.value);
    avatarCropperImage.value = '';
  }
}

onBeforeUnmount(() => {
  revokeAvatarCropperImage();
});

watch(
  () => ({
    enable: preferences.app.watermark,
    content: preferences.app.watermarkContent,
  }),
  async ({ enable, content }) => {
    if (enable) {
      await updateWatermark({
        content:
          content ||
          `${userStore.userInfo?.username} - ${userStore.userInfo?.realName}`,
      });
    } else {
      destroyWatermark();
    }
  },
  {
    immediate: true,
  },
);
</script>

<template>
  <BasicLayout @clear-preferences-and-logout="handleLogout">
    <template #user-dropdown>
      <UserDropdown
        :avatar
        :menus="userMenus"
        :text="userStore.userInfo?.realName"
        @logout="handleLogout"
      />
    </template>
    <template #extra>
      <AuthenticationLoginExpiredModal
        v-model:open="accessStore.loginExpired"
        :avatar
      >
        <LoginForm />
      </AuthenticationLoginExpiredModal>
      <Modal
        v-model:open="profileModalOpen"
        :confirm-loading="profileSaving"
        title="面板资料"
        width="520px"
        @ok="handleProfileSubmit"
      >
        <Form class="profile-form" layout="vertical">
          <Form.Item label="面板头像">
            <div class="profile-avatar-editor">
              <button
                aria-label="上传头像"
                class="profile-avatar-trigger"
                type="button"
                @click="openAvatarFilePicker"
              >
                <img
                  :src="profileForm.avatar || avatar"
                  alt="avatar"
                  class="profile-avatar-preview"
                />
              </button>
              <div class="profile-avatar-actions">
                <Button type="primary" @click="openAvatarFilePicker">
                  上传头像
                </Button>
                <Button :disabled="!profileForm.avatar" @click="clearAvatar">
                  恢复默认
                </Button>
              </div>
            </div>
            <input
              ref="avatarFileInputRef"
              accept="image/*"
              class="profile-avatar-file"
              style="display: none"
              tabindex="-1"
              type="file"
              @change="handleAvatarFileChange"
            />
          </Form.Item>
          <Form.Item label="面板昵称">
            <Input
              v-model:value="profileForm.displayName"
              allow-clear
              placeholder="留空则使用当前机器人昵称"
              size="large"
            />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        v-model:open="avatarCropperOpen"
        :confirm-loading="avatarCropping"
        :mask-closable="false"
        title="裁剪头像"
        width="548px"
        @cancel="closeAvatarCropper"
        @ok="handleAvatarCropConfirm"
      >
        <VCropper
          v-if="avatarCropperImage"
          ref="avatarCropperRef"
          aspect-ratio="1:1"
          :img="avatarCropperImage"
        />
      </Modal>
    </template>
    <template #lock-screen>
      <LockScreen :avatar @to-login="handleLogout" />
    </template>
  </BasicLayout>
</template>

<style scoped>
.profile-form {
  padding-top: 4px;
}

.profile-avatar-editor {
  display: flex;
  align-items: center;
  gap: 20px;
  min-height: 112px;
  padding: 14px 0 6px;
}

.profile-avatar-trigger {
  position: relative;
  display: flex;
  width: 96px;
  height: 96px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  padding: 0;
  overflow: hidden;
  cursor: pointer;
  background: hsl(var(--muted) / 35%);
  border: 1px solid hsl(var(--border));
  border-radius: 50%;
  outline: none;
}

.profile-avatar-trigger::after {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: #fff;
  content: '更换';
  background: rgb(0 0 0 / 48%);
  opacity: 0;
  transition: opacity 0.16s ease;
}

.profile-avatar-trigger:hover::after,
.profile-avatar-trigger:focus-visible::after {
  opacity: 1;
}

.profile-avatar-preview {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.profile-avatar-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.profile-avatar-file {
  display: none !important;
}

@media (max-width: 520px) {
  .profile-avatar-editor {
    align-items: flex-start;
    gap: 14px;
  }

  .profile-avatar-trigger {
    width: 80px;
    height: 80px;
  }

  .profile-avatar-actions {
    flex-direction: column;
  }
}
</style>
