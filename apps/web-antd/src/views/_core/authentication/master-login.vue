<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { LOGIN_PATH } from '@vben/constants';
import { useAccessStore } from '@vben/stores';

import { quickLoginApi } from '#/api';

defineOptions({ name: 'MasterLogin' });

const route = useRoute();
const router = useRouter();
const accessStore = useAccessStore();
const statusText = ref('Quick login in progress...');

async function runQuickLogin() {
  const code = String(route.params?.code ?? '').trim();
  if (!code) {
    statusText.value = 'Invalid code, redirecting to login...';
    await router.replace(LOGIN_PATH);
    return;
  }

  try {
    const { token } = await quickLoginApi(code);
    if (token) {
      accessStore.setAccessToken(token);
      statusText.value = 'Login succeeded, redirecting...';
    } else {
      statusText.value = 'Quick login failed, redirecting...';
    }
  } catch {
    statusText.value = 'Quick login failed, redirecting...';
  }

  await router.replace(LOGIN_PATH);
}

void runQuickLogin();
</script>

<template>
  <div class="p-6 text-sm text-muted-foreground">
    {{ statusText }}
  </div>
</template>
