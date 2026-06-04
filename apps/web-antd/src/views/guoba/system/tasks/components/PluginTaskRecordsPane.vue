<script lang="ts" setup>
import type { GuobaPluginTaskLogRecord, GuobaPluginTaskLogStatus } from '#/api';
import type { TablePaginationConfig } from 'ant-design-vue';

import { computed, onMounted, reactive, ref } from 'vue';

import { Button, Card, Input, Select, Space } from 'ant-design-vue';

import { getGuobaPluginTaskRecordsApi } from '#/api';

import PluginTaskRecordTable from '../../_components/PluginTaskRecordTable.vue';

const loading = ref(false);
const records = ref<GuobaPluginTaskLogRecord[]>([]);
const filters = reactive({
  keyword: '',
  status: '' as '' | GuobaPluginTaskLogStatus,
});
const pagination = reactive({ page: 1, pageSize: 20, total: 0 });

const statusOptions = [
  { label: '全部状态', value: '' },
  { label: '开始处理', value: 'running' },
  { label: '完成', value: 'success' },
  { label: '其他', value: 'unknown' },
];

const tablePagination = computed<TablePaginationConfig>(() => ({
  current: pagination.page,
  pageSize: pagination.pageSize,
  showSizeChanger: true,
  total: pagination.total,
}));

async function loadRecords() {
  loading.value = true;
  try {
    const page = await getGuobaPluginTaskRecordsApi({
      keyword: filters.keyword.trim(),
      page: pagination.page,
      pageSize: pagination.pageSize,
      status: filters.status,
    });
    records.value = page?.items ?? [];
    pagination.total = page?.total ?? 0;
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  pagination.page = 1;
  loadRecords();
}

function handleTableChange(next: TablePaginationConfig) {
  pagination.page = Number(next.current || 1);
  pagination.pageSize = Number(next.pageSize || 20);
  loadRecords();
}

onMounted(() => {
  loadRecords();
});
</script>

<template>
  <Card title="任务执行记录">
    <template #extra>
      <Space wrap>
        <Input v-model:value="filters.keyword" allow-clear placeholder="插件、任务、Cron" @press-enter="handleSearch" />
        <Select v-model:value="filters.status" :options="statusOptions" class="task-filter" />
        <Button type="primary" @click="handleSearch">搜索</Button>
        <Button :loading="loading" @click="loadRecords">刷新</Button>
      </Space>
    </template>
    <PluginTaskRecordTable
      :loading="loading"
      :pagination="tablePagination"
      :records="records"
      @change="handleTableChange"
    />
  </Card>
</template>

<style scoped>
.task-filter {
  width: 120px;
}
</style>
