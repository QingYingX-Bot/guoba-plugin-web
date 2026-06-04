<script lang="ts" setup>
import type { GuobaPluginTaskRecord } from '#/api';
import type { TableColumnsType, TablePaginationConfig } from 'ant-design-vue';

import { Table, Tag } from 'ant-design-vue';

defineProps<{
  loading?: boolean;
  pagination?: false | TablePaginationConfig;
  tasks: GuobaPluginTaskRecord[];
}>();

const emit = defineEmits<{
  change: [pagination: TablePaginationConfig];
}>();

const columns: TableColumnsType<GuobaPluginTaskRecord> = [
  { key: 'plugin', title: '插件', width: 220 },
  { dataIndex: 'taskName', key: 'taskName', title: '任务', width: 180 },
  { dataIndex: 'cron', key: 'cron', title: 'Cron', width: 180 },
  { key: 'nextRunAt', title: '下次运行', width: 180 },
  { key: 'functionName', title: '方法', width: 180 },
  { key: 'log', title: '日志', width: 90 },
  { key: 'status', title: '状态', width: 110 },
];

function formatTime(value?: string) {
  return value ? value.replace('T', ' ').slice(0, 19) : '-';
}

function getStatusMeta(status: string) {
  const map: Record<string, { color: string; label: string }> = {
    inactive: { color: 'default', label: '未注册' },
    scheduled: { color: 'processing', label: '已注册' },
  };
  return map[status] ?? { color: 'default', label: status || '-' };
}

function toPluginTask(record: unknown) {
  return record as GuobaPluginTaskRecord;
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
    :scroll="{ x: 1140 }"
    row-key="id"
    size="small"
    @change="handleChange"
  >
    <template #bodyCell="{ column, record }">
      <template v-if="column.key === 'plugin'">
        <div class="plugin-cell">
          <strong>{{ record.pluginId }}</strong>
          <span>{{ record.pluginName }}</span>
        </div>
      </template>
      <template v-else-if="column.key === 'nextRunAt'">
        {{ formatTime(record.nextRunAt) }}
      </template>
      <template v-else-if="column.key === 'functionName'">
        {{ toPluginTask(record).functionName || '-' }}
      </template>
      <template v-else-if="column.key === 'log'">
        <Tag :color="record.log ? 'success' : 'default'">
          {{ record.log ? '开启' : '关闭' }}
        </Tag>
      </template>
      <template v-else-if="column.key === 'status'">
        <Tag :color="getStatusMeta(record.status).color">
          {{ getStatusMeta(record.status).label }}
        </Tag>
      </template>
    </template>
  </Table>
</template>

<style scoped>
.plugin-cell {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.plugin-cell strong,
.plugin-cell span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.plugin-cell span {
  color: hsl(var(--muted-foreground));
  font-size: 12px;
}
</style>
