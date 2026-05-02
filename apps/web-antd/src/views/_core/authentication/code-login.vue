<script lang="ts" setup>
import type { VbenFormSchema } from '@vben/common-ui';
import type { Recordable } from '@vben/types';

import { computed, h, onMounted, ref } from 'vue';

import { AuthenticationCodeLogin, AuthenticationLogin, z } from '@vben/common-ui';
import { $t } from '@vben/locales';
import { message } from 'ant-design-vue';

import { useAuthStore } from '#/store';

defineOptions({ name: 'CodeLogin' });

const authStore = useAuthStore();
const CODE_LENGTH = 16;
const pageTitle = '锅巴管理登录';
const pageSubTitle = '点击获取验证码，并在机器人控制台日志中查看 16 位字母数字验证码后输入';
const loginMode = ref<'code' | 'password'>('password');
const passwordLoginStatus = ref({
  hasPassword: false,
  rememberDays: 7,
});

const passwordLoginReady = computed(() => {
  return passwordLoginStatus.value.hasPassword;
});
const passwordLoginTip = computed(() => {
  if (passwordLoginReady.value) {
    return '';
  }
  return '固定登录密码未设置，请先使用验证码登录后在锅巴配置中设置密码';
});

async function handleSendCode() {
  try {
    await authStore.requestLoginCode();
    message.success('验证码已生成，请在机器人控制台日志中查看');
  } catch (error) {
    const errorMessage =
      (error as any)?.response?.data?.message ??
      (error as Error)?.message ??
      '验证码请求失败，请稍后重试';
    message.error(errorMessage);
    throw error;
  }
}

const formSchema = computed((): VbenFormSchema[] => {
  return [
    {
      component: 'VbenPinInput',
      componentProps: {
        codeLength: CODE_LENGTH,
        createText: (countdown: number) => {
          const text =
            countdown > 0
              ? $t('authentication.sendText', [countdown])
              : $t('authentication.sendCode');
          return text;
        },
        handleSendCode,
        placeholder: $t('authentication.code'),
      },
      fieldName: 'code',
      label: $t('authentication.code'),
      rules: z.string().regex(new RegExp(`^[a-z0-9]{${CODE_LENGTH}}$`, 'i'), {
        message: `请输入 ${CODE_LENGTH} 位字母数字验证码`,
      }),
    },
  ];
});

const passwordFormSchema = computed((): VbenFormSchema[] => {
  return [
    {
      component: 'VbenInputPassword',
      componentProps: {
        placeholder: '请输入固定登录密码',
      },
      fieldName: 'password',
      label: $t('authentication.password'),
      rules: z.string().min(1, { message: $t('authentication.passwordTip') }),
    },
    {
      component: 'VbenCheckbox',
      defaultValue: true,
      fieldName: 'remember',
      renderComponentContent: () => ({
        default: () =>
          h('span', `记住登录 ${passwordLoginStatus.value.rememberDays} 天`),
      }),
    },
  ];
});

async function refreshPasswordLoginStatus() {
  try {
    const status = await authStore.getPasswordLoginStatus();
    passwordLoginStatus.value = {
      hasPassword: status?.hasPassword === true,
      rememberDays: Number(status?.rememberDays || 7),
    };
  } catch {
    passwordLoginStatus.value = {
      hasPassword: false,
      rememberDays: 7,
    };
  }
}

onMounted(refreshPasswordLoginStatus);

/**
 * 异步处理登录操作
 * Asynchronously handle the login process
 * @param values 登录表单数据
 */
async function handleLogin(values: Recordable<any>) {
  await authStore.authLogin({
    code: String(values.code ?? '').trim().toLowerCase(),
  });
}

async function handlePasswordLogin(values: Recordable<any>) {
  if (!passwordLoginReady.value) {
    await refreshPasswordLoginStatus();
    if (!passwordLoginReady.value) {
      message.warning('固定密码登录尚未配置完成');
      return;
    }
  }
  await authStore.authPasswordLogin({
    password: String(values.password ?? ''),
    remember: values.remember === true,
  });
}
</script>

<template>
  <div>
    <div class="mb-4 grid grid-cols-2 gap-2">
      <button
        class="rounded-md border px-3 py-2 text-sm transition-colors"
        :class="loginMode === 'password' ? 'border-primary text-primary' : 'border-border text-muted-foreground'"
        type="button"
        @click="loginMode = 'password'"
      >
        密码登录
      </button>
      <button
        class="rounded-md border px-3 py-2 text-sm transition-colors"
        :class="loginMode === 'code' ? 'border-primary text-primary' : 'border-border text-muted-foreground'"
        type="button"
        @click="loginMode = 'code'"
      >
        验证码登录
      </button>
    </div>

    <div
      v-if="loginMode === 'password' && passwordLoginTip"
      class="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700"
    >
      {{ passwordLoginTip }}
    </div>

    <AuthenticationLogin
      v-if="loginMode === 'password'"
      :form-schema="passwordFormSchema"
      :loading="authStore.loginLoading"
      :show-code-login="false"
      :show-forget-password="false"
      :show-qrcode-login="false"
      :show-register="false"
      :show-remember-me="false"
      :show-third-party-login="false"
      sub-title="使用配置的固定密码登录锅巴管理面板"
      submit-button-text="登录"
      :title="pageTitle"
      @submit="handlePasswordLogin"
    />

    <AuthenticationCodeLogin
      v-else
      :form-schema="formSchema"
      :loading="authStore.loginLoading"
      :sub-title="pageSubTitle"
      :show-back="false"
      :title="pageTitle"
      @submit="handleLogin"
    />
  </div>
</template>
