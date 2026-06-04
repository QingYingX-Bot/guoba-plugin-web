<script lang="ts" setup>
import type { GuobaTaskRecord } from '#/api';
import type { TableColumnsType, TablePaginationConfig } from 'ant-design-vue';

import { computed } from 'vue';

import { Table, Tag } from 'ant-design-vue';

const props = defineProps<{
  compact?: boolean;
  loading?: boolean;
  pagination?: false | TablePaginationConfig;
  tasks: GuobaTaskRecord[];
}>();

const emit = defineEmits<{
  change: [pagination: TablePaginationConfig];
}>();

const columns = computed<TableColumnsType<GuobaTaskRecord>>(() => {
  const base: TableColumnsType<GuobaTaskRecord> = [
    { dataIndex: 'createdAt', key: 'createdAt', title: '时间', width: 170 },
    { key: 'title', title: '任务', width: 160 },
    { key: 'target', title: '目标', width: 220 },
    { dataIndex: 'summary', key: 'summary', title: '说明' },
    { key: 'status', title: '状态', width: 96 },
    { key: 'duration', title: '耗时', width: 90 },
    { dataIndex: 'error', key: 'error', title: '错误', width: 220 },
  ];
  return props.compact ? base.filter((item) => item.key !== 'error') : base;
});

function getStatusMeta(status: string) {
  const map: Record<string, { color: string; label: string }> = {
    failed: { color: 'error', label: '失败' },
    pending: { color: 'default', label: '待执行' },
    running: { color: 'processing', label: '执行中' },
    success: { color: 'success', label: '成功' },
  };
  return map[status] ?? { color: 'default', label: status || '-' };
}

function getTaskTitle(record: GuobaTaskRecord) {
  return record.title || (record.type === 'message.send' ? '代发消息' : record.type);
}

function toTaskRecord(record: unknown) {
  return record as GuobaTaskRecord;
}

function getTargetText(record: GuobaTaskRecord) {
  const type = record.targetType === 'group' ? '群聊' : record.targetType === 'private' ? '私聊' : record.targetType;
  const target = [record.accountId, type, record.targetId].filter(Boolean);
  return target.length > 0 ? target.join(' / ') : '-';
}

function formatTime(value?: string) {
  return value ? value.replace('T', ' ').slice(0, 19) : '-';
}

function formatDuration(value?: number) {
  if (!value) {
    return '-';
  }
  return value >= 1000 ? `${(value / 1000).toFixed(1)}s` : `${value}ms`;
}

function handleChange(pagination: TablePaginationConfig) {
  emit('change', pagination);
}
</script>

<template>
  <Table
    :columns="columns"
    :data-source="tasks"
    :loading="loading"
    :pagination="pagination"
    :scroll="{ x: compact ? 900 : 1200 }"
    row-key="id"
    size="small"
    @change="handleChange"
  >
    <template #bodyCell="{ column, record }">
      <template v-if="column.key === 'createdAt'">
        {{ formatTime(record.createdAt) }}
      </template>
      <template v-else-if="column.key === 'title'">
        {{ getTaskTitle(toTaskRecord(record)) }}
      </template>
      <template v-else-if="column.key === 'target'">
        {{ getTargetText(toTaskRecord(record)) }}
      </template>
      <template v-else-if="column.key === 'status'">
        <Tag :color="getStatusMeta(record.status).color">
          {{ getStatusMeta(record.status).label }}
        </Tag>
      </template>
      <template v-else-if="column.key === 'duration'">
        {{ formatDuration(record.duration) }}
      </template>
      <template v-else-if="column.key === 'error'">
        {{ record.error || '-' }}
      </template>
    </template>
  </Table>
</template>
