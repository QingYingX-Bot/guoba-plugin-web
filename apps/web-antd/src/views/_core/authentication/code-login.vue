<script lang="ts" setup>
import type { VbenFormSchema } from '@vben/common-ui';

import { computed, h, onMounted, reactive, ref } from 'vue';

import { useVbenForm, VbenButton, z } from '@vben/common-ui';
import { $t } from '@vben/locales';
import { message } from 'ant-design-vue';

import { useAuthStore } from '#/store';

defineOptions({ name: 'CodeLogin' });

const authStore = useAuthStore();
const CODE_LENGTH = 16;
const pageTitle = '锅巴管理登录';
const loginMode = ref<'code' | 'password'>('password');
const passwordLoginStatus = ref({
  hasPassword: false,
  rememberDays: 7,
});

const modeTabs = [
  {
    description: '使用配置的固定密码进入管理面板',
    label: '密码登录',
    value: 'password',
  },
  {
    description: '从机器人控制台日志获取一次性验证码',
    label: '验证码登录',
    value: 'code',
  },
] as const;

const activeMode = computed(() => {
  return modeTabs.find((item) => item.value === loginMode.value) ?? modeTabs[0];
});

const passwordLoginReady = computed(() => {
  return passwordLoginStatus.value.hasPassword;
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

const codeFormSchema = computed((): VbenFormSchema[] => {
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

const [PasswordForm, passwordFormApi] = useVbenForm(
  reactive({
    commonConfig: {
      hideLabel: true,
      hideRequiredMark: true,
    },
    schema: passwordFormSchema,
    showDefaultActions: false,
  }),
);

const [CodeForm, codeFormApi] = useVbenForm(
  reactive({
    commonConfig: {
      hideLabel: true,
      hideRequiredMark: true,
    },
    schema: codeFormSchema,
    showDefaultActions: false,
  }),
);

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

async function handleCodeLogin() {
  const { valid } = await codeFormApi.validate();
  const values = await codeFormApi.getValues();
  if (!valid) {
    return;
  }
  await authStore.authLogin({
    code: String(values.code ?? '').trim().toLowerCase(),
  });
}

async function handlePasswordLogin() {
  if (!passwordLoginReady.value) {
    await refreshPasswordLoginStatus();
    if (!passwordLoginReady.value) {
      message.warning('固定密码登录尚未配置完成');
      return;
    }
  }

  const { valid } = await passwordFormApi.validate();
  const values = await passwordFormApi.getValues();
  if (!valid) {
    return;
  }

  await authStore.authPasswordLogin({
    password: String(values.password ?? ''),
    remember: values.remember === true,
  });
}

function switchLoginMode(mode: 'code' | 'password') {
  if (loginMode.value === mode) {
    return;
  }
  loginMode.value = mode;
}

async function handleSubmit() {
  if (loginMode.value === 'password') {
    await handlePasswordLogin();
    return;
  }
  await handleCodeLogin();
}
</script>

<template>
  <section class="guoba-login-panel" @keydown.enter.prevent="handleSubmit">
    <div class="guoba-login-heading">
      <h1>{{ pageTitle }}</h1>
      <Transition name="guoba-fade" mode="out-in">
        <p :key="activeMode.value" class="guoba-login-description">
          {{ activeMode.description }}
        </p>
      </Transition>
    </div>

    <div
      class="guoba-mode-switch"
      :class="{ 'is-code': loginMode === 'code' }"
      role="tablist"
      aria-label="登录方式"
    >
      <span class="guoba-mode-indicator" aria-hidden="true"></span>
      <button
        v-for="tab in modeTabs"
        :key="tab.value"
        class="guoba-mode-button"
        :class="{ 'is-active': loginMode === tab.value }"
        role="tab"
        :aria-selected="loginMode === tab.value"
        type="button"
        @click="switchLoginMode(tab.value)"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="guoba-login-body">
      <div class="guoba-login-track" :class="{ 'is-code': loginMode === 'code' }">
        <div class="guoba-login-content guoba-password-content" aria-hidden="false">
          <PasswordForm />
        </div>

        <div class="guoba-login-content guoba-code-content" aria-hidden="false">
          <CodeForm />
        </div>
      </div>
    </div>

    <VbenButton
      :class="{
        'cursor-wait': authStore.loginLoading,
      }"
      :loading="authStore.loginLoading"
      aria-label="login"
      class="guoba-login-submit"
      @click="handleSubmit"
    >
      登录
    </VbenButton>
  </section>
</template>

<style scoped>
.guoba-login-panel {
  width: min(100%, 448px);
}

.guoba-login-heading {
  margin-bottom: 18px;
}

.guoba-login-heading h1 {
  margin: 0;
  font-size: 34px;
  font-weight: 800;
  line-height: 1.16;
  color: hsl(var(--foreground));
  letter-spacing: 0;
}

.guoba-login-description {
  min-height: 22px;
  margin: 12px 0 0;
  font-size: 14px;
  line-height: 1.6;
  color: hsl(var(--muted-foreground));
}

.guoba-mode-switch {
  position: relative;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0;
  padding: 3px;
  margin-bottom: 24px;
  background: hsl(var(--muted) / 0.48);
  border: 1px solid hsl(var(--border) / 0.68);
  border-radius: 8px;
  overflow: hidden;
}

.guoba-mode-indicator {
  position: absolute;
  inset: 3px auto 3px 3px;
  width: calc((100% - 6px) / 2);
  background: hsl(var(--background));
  border-radius: 6px;
  box-shadow:
    0 1px 2px hsl(var(--foreground) / 0.08),
    0 8px 22px hsl(var(--foreground) / 0.06);
  transform: translateX(0);
  transition:
    transform 260ms cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 220ms ease;
  will-change: transform;
}

.guoba-mode-switch.is-code .guoba-mode-indicator {
  transform: translateX(100%);
}

.guoba-mode-button {
  position: relative;
  z-index: 1;
  min-height: 36px;
  padding: 0 16px;
  font-size: 13px;
  font-weight: 500;
  color: hsl(var(--muted-foreground));
  border-radius: 6px;
  outline: none;
  transition:
    color 180ms ease,
    background-color 180ms ease,
    box-shadow 180ms ease;
}

.guoba-mode-button:hover {
  color: hsl(var(--foreground));
}

.guoba-mode-button.is-active {
  color: hsl(var(--foreground));
}

.guoba-login-body {
  position: relative;
  height: 94px;
  overflow: hidden;
}

.guoba-login-track {
  display: flex;
  width: 200%;
  height: 100%;
  transform: translateX(0);
  transition: transform 300ms cubic-bezier(0.22, 1, 0.36, 1);
  will-change: transform;
}

.guoba-login-track.is-code {
  transform: translateX(-50%);
}

.guoba-login-content {
  flex: 0 0 50%;
  width: 100%;
  padding-right: 1px;
}

.guoba-password-content {
  padding-top: 0;
}

.guoba-code-content {
  padding-top: 0;
}

.guoba-login-submit {
  width: 100%;
  height: 42px;
  margin-top: 20px;
  border-radius: 8px;
}

.guoba-fade-enter-active,
.guoba-fade-leave-active {
  transition:
    opacity 140ms ease,
    transform 140ms ease;
}

.guoba-fade-enter-from,
.guoba-fade-leave-to {
  opacity: 0;
  transform: translateY(4px);
}

:deep(.form-field) {
  margin-bottom: 18px;
}

:deep(.form-field:last-child) {
  margin-bottom: 0;
}

:deep(.ant-input-affix-wrapper),
:deep(.ant-input) {
  min-height: 40px;
  border-radius: 8px;
}

:deep([data-slot='pin-input-root']) {
  width: 100%;
}

:deep([data-slot='pin-input-root'] > div) {
  width: 100%;
}

:deep([data-slot='pin-input-root'] button) {
  height: 40px;
  border-radius: 8px;
}

@media (max-width: 520px) {
  .guoba-login-panel {
    width: 100%;
  }

  .guoba-login-heading h1 {
    font-size: 30px;
  }
}
</style>
