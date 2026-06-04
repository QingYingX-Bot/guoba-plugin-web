<script lang="ts" setup>
import type { GuobaPluginTaskRecord, GuobaPluginTaskStatus } from '#/api';
import type { TablePaginationConfig } from 'ant-design-vue';

import { computed, onMounted, reactive, ref } from 'vue';

import { Button, Card, Input, Select, Space } from 'ant-design-vue';

import { getGuobaPluginTasksApi } from '#/api';

import PluginTaskTable from '../../_components/PluginTaskTable.vue';

const loading = ref(false);
const tasks = ref<GuobaPluginTaskRecord[]>([]);
const filters = reactive({
  keyword: '',
  status: '' as '' | GuobaPluginTaskStatus,
});
const pagination = reactive({ page: 1, pageSize: 20, total: 0 });

const statusOptions = [
  { label: '全部状态', value: '' },
  { label: '已注册', value: 'scheduled' },
  { label: '未注册', value: 'inactive' },
];

const tablePagination = computed<TablePaginationConfig>(() => ({
  current: pagination.page,
  pageSize: pagination.pageSize,
  showSizeChanger: true,
  total: pagination.total,
}));

async function loadTasks() {
  loading.value = true;
  try {
    const page = await getGuobaPluginTasksApi({
      keyword: filters.keyword.trim(),
      page: pagination.page,
      pageSize: pagination.pageSize,
      status: filters.status,
    });
    tasks.value = page?.items ?? [];
    pagination.total = page?.total ?? 0;
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  pagination.page = 1;
  loadTasks();
}

function handleTableChange(next: TablePaginationConfig) {
  pagination.page = Number(next.current || 1);
  pagination.pageSize = Number(next.pageSize || 20);
  loadTasks();
}

onMounted(() => {
  loadTasks();
});
</script>

<template>
  <Card title="插件定时任务">
    <template #extra>
      <Space wrap>
        <Input v-model:value="filters.keyword" allow-clear placeholder="插件、任务、Cron" @press-enter="handleSearch" />
        <Select v-model:value="filters.status" :options="statusOptions" class="task-filter" />
        <Button type="primary" @click="handleSearch">搜索</Button>
        <Button :loading="loading" @click="loadTasks">刷新</Button>
      </Space>
    </template>
    <PluginTaskTable
      :loading="loading"
      :pagination="tablePagination"
      :tasks="tasks"
      @change="handleTableChange"
    />
  </Card>
</template>

<style scoped>
.task-filter {
  width: 120px;
}
</style>
