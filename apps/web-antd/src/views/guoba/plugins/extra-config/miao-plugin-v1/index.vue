<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import { Alert, Button, Card, Empty, Input, Skeleton, Space } from 'ant-design-vue';

import { getMiaoHelpApi } from '#/api';

const router = useRouter();

const loading = ref(true);
const configText = ref('');

async function loadConfig() {
  loading.value = true;
  try {
    const result = await getMiaoHelpApi();
    configText.value = JSON.stringify(result ?? {}, null, 2);
  } finally {
    loading.value = false;
  }
}

function goPluginDetail() {
  router.push('/plugin/@/miao-plugin');
}

onMounted(() => {
  loadConfig();
});
</script>

<template>
  <Page title="喵喵帮助（v1）">
    <Card>
      <Alert
        show-icon
        type="warning"
        message="该页面为 Guoba Fork 1.0.1 过渡版，当前提供配置读取和详情跳转。由于 v1 接口保存依赖图片文件，完整编辑器将在后续单独迁移。"
      />

      <Space class="my-4">
        <Button :loading="loading" @click="loadConfig">刷新配置</Button>
        <Button type="primary" @click="goPluginDetail">
          打开 miao-plugin 详情页
        </Button>
      </Space>

      <Skeleton v-if="loading" active />
      <Empty v-else-if="!configText" description="暂无配置数据" />
      <Input.TextArea
        v-else
        :value="configText"
        readonly
        :auto-size="{ minRows: 12, maxRows: 28 }"
      />
    </Card>
  </Page>
</template>
