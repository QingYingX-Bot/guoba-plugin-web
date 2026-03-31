<script lang="ts" setup>
import type { VbenFormSchema } from '@vben/common-ui';
import type { Recordable } from '@vben/types';

import { computed } from 'vue';

import { AuthenticationCodeLogin, z } from '@vben/common-ui';
import { $t } from '@vben/locales';
import { message } from 'ant-design-vue';

import { useAuthStore } from '#/store';

defineOptions({ name: 'CodeLogin' });

const authStore = useAuthStore();
const CODE_LENGTH = 16;
const pageTitle = '锅巴管理登录';
const pageSubTitle = '点击获取验证码，并在机器人控制台日志中查看 16 位字母数字验证码后输入';

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
</script>

<template>
  <AuthenticationCodeLogin
    :form-schema="formSchema"
    :loading="authStore.loginLoading"
    :sub-title="pageSubTitle"
    :show-back="false"
    :title="pageTitle"
    @submit="handleLogin"
  />
</template>
