<script lang="ts" setup>
import type {
  GuobaJsPluginDetail,
  GuobaJsPluginFile,
  GuobaJsPluginStatus,
} from '#/api';
import type { TablePaginationConfig } from 'ant-design-vue';

import { computed, onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { Button, Card, Input, message, Modal, Select, Space } from 'ant-design-vue';

import {
  copyGuobaJsPluginExampleApi,
  getGuobaJsPluginDetailApi,
  getGuobaJsPluginsApi,
  reloadGuobaJsPluginApi,
  toggleGuobaJsPluginApi,
} from '#/api';

import JsPluginDetailDrawer from './components/JsPluginDetailDrawer.vue';
import JsPluginTable from './components/JsPluginTable.vue';

const loading = ref(false);
const detailLoading = ref(false);
const drawerOpen = ref(false);
const files = ref<GuobaJsPluginFile[]>([]);
const detail = ref<GuobaJsPluginDetail>();
const filters = reactive({
  keyword: '',
  status: '' as '' | GuobaJsPluginStatus,
});
const pagination = reactive({ page: 1, pageSize: 20, total: 0 });

const statusOptions = [
  { label: '全部状态', value: '' },
  { label: '已启用', value: 'enabled' },
  { label: '已禁用', value: 'disabled' },
  { label: '示例', value: 'template' },
];

const tablePagination = computed<TablePaginationConfig>(() => ({
  current: pagination.page,
  pageSize: pagination.pageSize,
  showSizeChanger: true,
  total: pagination.total,
}));

async function loadFiles() {
  loading.value = true;
  try {
    const page = await getGuobaJsPluginsApi({
      keyword: filters.keyword.trim(),
      page: pagination.page,
      pageSize: pagination.pageSize,
      status: filters.status,
    });
    files.value = page?.items ?? [];
    pagination.total = page?.total ?? 0;
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  pagination.page = 1;
  loadFiles();
}

function handleTableChange(next: TablePaginationConfig) {
  pagination.page = Number(next.current || 1);
  pagination.pageSize = Number(next.pageSize || 20);
  loadFiles();
}

async function openDetail(record: GuobaJsPluginFile) {
  drawerOpen.value = true;
  detailLoading.value = true;
  try {
    detail.value = await getGuobaJsPluginDetailApi(record.path);
  } finally {
    detailLoading.value = false;
  }
}

function closeDetail() {
  drawerOpen.value = false;
  detail.value = undefined;
}

function confirmToggle(record: GuobaJsPluginFile) {
  const enabled = !record.enabled;
  Modal.confirm({
    title: enabled ? '启用 JS 插件' : '禁用 JS 插件',
    content: record.relativePath,
    async onOk() {
      await toggleGuobaJsPluginApi({ enabled, path: record.path });
      message.success(enabled ? '已启用' : '已禁用');
      await loadFiles();
    },
  });
}

function confirmCopy(record: GuobaJsPluginFile) {
  Modal.confirm({
    title: '复制示例插件',
    content: record.relativePath,
    async onOk() {
      await copyGuobaJsPluginExampleApi({ path: record.path });
      message.success('已复制');
      await loadFiles();
    },
  });
}

async function reloadPlugin(record: GuobaJsPluginFile) {
  await reloadGuobaJsPluginApi(record.path);
  message.success('已热重载');
  await loadFiles();
}

onMounted(() => {
  loadFiles();
});
</script>

<template>
  <Page title="JS插件管理">
    <Card title="plugins/example">
      <template #extra>
        <Space wrap>
          <Input
            v-model:value="filters.keyword"
            allow-clear
            placeholder="文件、名称、规则"
            @press-enter="handleSearch"
          />
          <Select v-model:value="filters.status" :options="statusOptions" class="status-filter" />
          <Button type="primary" @click="handleSearch">搜索</Button>
          <Button :loading="loading" @click="loadFiles">刷新</Button>
        </Space>
      </template>
      <JsPluginTable
        :files="files"
        :loading="loading"
        :pagination="tablePagination"
        @change="handleTableChange"
        @copy="confirmCopy"
        @reload="reloadPlugin"
        @toggle="confirmToggle"
        @view="openDetail"
      />
    </Card>
    <JsPluginDetailDrawer
      :detail="detail"
      :loading="detailLoading"
      :open="drawerOpen"
      @close="closeDetail"
    />
  </Page>
</template>

<style scoped>
.status-filter {
  width: 120px;
}
</style>
