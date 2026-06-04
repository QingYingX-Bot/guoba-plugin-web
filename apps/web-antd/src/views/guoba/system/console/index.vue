<script lang="ts" setup>
import type { GuobaConsoleLogResult, GuobaConsoleLogType } from '#/api';

import { computed, onMounted, reactive, ref, watch } from 'vue';

import { Page } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import { Button, Card, Input, Select, Space, Tag, Tooltip, Typography, message } from 'ant-design-vue';

import { getGuobaConsoleLogsApi } from '#/api';

import ConsoleLogPanel from './components/ConsoleLogPanel.vue';

const loading = ref(false);
const result = ref<GuobaConsoleLogResult>();
const filters = reactive({
  date: '',
  keyword: '',
  limit: 300,
  type: 'command' as GuobaConsoleLogType,
});

const typeOptions = [
  { label: '命令日志', value: 'command' },
  { label: '错误日志', value: 'error' },
];
const limitOptions = [100, 300, 500, 1000].map((value) => ({
  label: `${value} 行`,
  value,
}));
const dateOptions = computed(() => (result.value?.dates ?? []).map((date) => ({
  label: date,
  value: date,
})));
const logItems = computed(() => result.value?.items ?? []);
const metaText = computed(() => {
  const data = result.value;
  if (!data) {
    return '';
  }
  const time = data.updatedAt ? data.updatedAt.replace('T', ' ').slice(0, 19) : '无更新时间';
  return `${data.file} | 匹配 ${data.total} 行 | ${time}`;
});

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '日志读取失败';
}

async function loadLogs() {
  loading.value = true;
  try {
    const data = await getGuobaConsoleLogsApi({
      date: filters.date,
      keyword: filters.keyword.trim(),
      limit: filters.limit,
      type: filters.type,
    });
    result.value = data;
    filters.date = data.date;
  } catch (error: unknown) {
    message.error(getErrorMessage(error));
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  loadLogs();
}

watch(() => filters.type, () => {
  filters.date = '';
  loadLogs();
});

onMounted(() => {
  loadLogs();
});
</script>

<template>
  <Page title="控制台">
    <Card>
      <template #title>
        <Space>
          <span>日志控制台</span>
          <Tag v-if="result?.truncated" color="orange">尾部截取</Tag>
          <Tag v-if="result && !result.exists" color="red">文件不存在</Tag>
        </Space>
      </template>
      <template #extra>
        <Space wrap>
          <Select v-model:value="filters.type" :options="typeOptions" class="console-type" />
          <Select
            v-model:value="filters.date"
            :disabled="filters.type !== 'command'"
            :options="dateOptions"
            class="console-date"
            @change="handleSearch"
          />
          <Select v-model:value="filters.limit" :options="limitOptions" class="console-limit" @change="handleSearch" />
          <Input v-model:value="filters.keyword" allow-clear class="console-keyword" placeholder="关键词" @press-enter="handleSearch" />
          <Button type="primary" @click="handleSearch">搜索</Button>
          <Tooltip title="刷新">
            <Button :loading="loading" @click="loadLogs">
              <IconifyIcon icon="lucide:refresh-cw" />
            </Button>
          </Tooltip>
        </Space>
      </template>
      <Typography.Text class="console-meta" type="secondary">
        {{ metaText }}
      </Typography.Text>
      <ConsoleLogPanel :items="logItems" :loading="loading" />
    </Card>
  </Page>
</template>

<style scoped>
.console-type {
  width: 120px;
}

.console-date {
  width: 150px;
}

.console-limit {
  width: 110px;
}

.console-keyword {
  width: min(260px, 58vw);
}

.console-meta {
  display: block;
  margin-bottom: 10px;
  word-break: break-all;
}
</style>
