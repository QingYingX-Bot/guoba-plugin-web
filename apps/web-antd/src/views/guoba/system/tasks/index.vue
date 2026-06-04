<script lang="ts" setup>
import type { GuobaTaskRecord } from '#/api';
import type { TablePaginationConfig } from 'ant-design-vue';

import { computed, onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { Button, Card, Input, Select, Space } from 'ant-design-vue';

import { getGuobaTasksApi } from '#/api';

import TaskTable from '../_components/TaskTable.vue';

const loading = ref(false);
const tasks = ref<GuobaTaskRecord[]>([]);
const filters = reactive({
  keyword: '',
  status: '',
  type: '',
});
const pagination = reactive({ page: 1, pageSize: 20, total: 0 });

const statusOptions = [
  { label: '全部状态', value: '' },
  { label: '待执行', value: 'pending' },
  { label: '执行中', value: 'running' },
  { label: '成功', value: 'success' },
  { label: '失败', value: 'failed' },
];
const typeOptions = [
  { label: '全部类型', value: '' },
  { label: '代发消息', value: 'message.send' },
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
    const page = await getGuobaTasksApi({
      keyword: filters.keyword.trim(),
      page: pagination.page,
      pageSize: pagination.pageSize,
      status: filters.status,
      type: filters.type,
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
  <Page title="任务管理">
    <Card title="任务列表">
      <template #extra>
        <Space wrap>
          <Input v-model:value="filters.keyword" allow-clear placeholder="任务、账号、目标" @press-enter="handleSearch" />
          <Select v-model:value="filters.status" :options="statusOptions" class="task-filter" />
          <Select v-model:value="filters.type" :options="typeOptions" class="task-filter" />
          <Button type="primary" @click="handleSearch">搜索</Button>
          <Button :loading="loading" @click="loadTasks">刷新</Button>
        </Space>
      </template>
      <TaskTable
        :loading="loading"
        :pagination="tablePagination"
        :tasks="tasks"
        @change="handleTableChange"
      />
    </Card>
  </Page>
</template>

<style scoped>
.task-filter {
  width: 120px;
}
</style>
