<script lang="ts" setup>
import type { GuobaPluginTaskLogRecord } from '#/api';
import type { TableColumnsType, TablePaginationConfig } from 'ant-design-vue';

import { Table, Tag } from 'ant-design-vue';

defineProps<{
  loading?: boolean;
  pagination?: false | TablePaginationConfig;
  records: GuobaPluginTaskLogRecord[];
}>();

const emit = defineEmits<{
  change: [pagination: TablePaginationConfig];
}>();

const columns: TableColumnsType<GuobaPluginTaskLogRecord> = [
  { dataIndex: 'createdAt', key: 'createdAt', title: '时间', width: 170 },
  { dataIndex: 'pluginId', key: 'pluginId', title: '插件', width: 180 },
  { dataIndex: 'taskName', key: 'taskName', title: '任务', width: 240 },
  { dataIndex: 'cron', key: 'cron', title: 'Cron', width: 180 },
  { key: 'status', title: '状态', width: 110 },
  { dataIndex: 'cost', key: 'cost', title: '耗时', width: 120 },
];

function formatTime(value?: string) {
  return value ? value.replace('T', ' ').slice(0, 19) : '-';
}

function getStatusMeta(status: string, statusText?: string) {
  const map: Record<string, { color: string; label: string }> = {
    running: { color: 'processing', label: '开始处理' },
    success: { color: 'success', label: '完成' },
    unknown: { color: 'default', label: statusText || '其他' },
  };
  return map[status] ?? { color: 'default', label: statusText || status || '-' };
}

function handleChange(pagination: TablePaginationConfig) {
  emit('change', pagination);
}
</script>

<template>
  <Table
    :columns="columns"
    :data-source="records"
    :loading="loading"
    :pagination="pagination"
    :scroll="{ x: 1100 }"
    row-key="id"
    size="small"
    @change="handleChange"
  >
    <template #bodyCell="{ column, record }">
      <template v-if="column.key === 'createdAt'">
        {{ formatTime(record.createdAt) }}
      </template>
      <template v-else-if="column.key === 'status'">
        <Tag :color="getStatusMeta(record.status, record.statusText).color">
          {{ getStatusMeta(record.status, record.statusText).label }}
        </Tag>
      </template>
      <template v-else-if="column.key === 'cost'">
        {{ record.cost || '-' }}
      </template>
    </template>
  </Table>
</template>
