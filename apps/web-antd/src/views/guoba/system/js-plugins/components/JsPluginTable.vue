<script lang="ts" setup>
import type { GuobaJsPluginFile } from '#/api';
import type { TableColumnsType, TablePaginationConfig } from 'ant-design-vue';

import { IconifyIcon } from '@vben/icons';

import { Button, Space, Table, Tag, Tooltip } from 'ant-design-vue';

defineProps<{
  files: GuobaJsPluginFile[];
  loading?: boolean;
  pagination?: false | TablePaginationConfig;
}>();

const emit = defineEmits<{
  (event: 'change', pagination: TablePaginationConfig): void;
  (event: 'copy', record: GuobaJsPluginFile): void;
  (event: 'reload', record: GuobaJsPluginFile): void;
  (event: 'toggle', record: GuobaJsPluginFile): void;
  (event: 'view', record: GuobaJsPluginFile): void;
}>();

const columns: TableColumnsType<GuobaJsPluginFile> = [
  { key: 'file', title: '文件', width: 360 },
  { key: 'meta', title: '插件信息', width: 280 },
  { key: 'stats', title: '规则 / 任务', width: 150 },
  { key: 'status', title: '状态', width: 150 },
  { key: 'modifiedAt', title: '修改时间', width: 170 },
  { key: 'actions', title: '操作', width: 180 },
];

function formatTime(value?: string) {
  return value ? value.replace('T', ' ').slice(0, 19) : '-';
}

function getStatusMeta(status: string) {
  const map: Record<string, { color: string; label: string }> = {
    disabled: { color: 'default', label: '已禁用' },
    enabled: { color: 'success', label: '已启用' },
    template: { color: 'processing', label: '示例' },
  };
  return map[status] ?? { color: 'default', label: status || '-' };
}

function handleChange(pagination: TablePaginationConfig) {
  emit('change', pagination);
}

function toJsPlugin(record: unknown) {
  return record as GuobaJsPluginFile;
}
</script>

<template>
  <Table
    :columns="columns"
    :data-source="files"
    :loading="loading"
    :pagination="pagination"
    :scroll="{ x: 1110 }"
    row-key="path"
    size="small"
    @change="handleChange"
  >
    <template #bodyCell="{ column, record }">
      <template v-if="column.key === 'file'">
        <div class="file-cell">
          <strong>{{ record.moduleFile }}</strong>
          <span>plugins/{{ record.relativePath }}</span>
        </div>
      </template>
      <template v-else-if="column.key === 'meta'">
        <div class="file-cell">
          <strong>{{ record.name }}</strong>
          <span>{{ record.dsc || record.event || '-' }}</span>
        </div>
      </template>
      <template v-else-if="column.key === 'stats'">
        <Space :size="4" wrap>
          <Tag>{{ record.ruleCount || 0 }} 规则</Tag>
          <Tag>{{ record.taskCount || 0 }} 任务</Tag>
        </Space>
      </template>
      <template v-else-if="column.key === 'status'">
        <Space :size="4" wrap>
          <Tag :color="getStatusMeta(record.status).color">
            {{ getStatusMeta(record.status).label }}
          </Tag>
          <Tag v-if="record.loaded" color="blue">已加载</Tag>
        </Space>
      </template>
      <template v-else-if="column.key === 'modifiedAt'">
        {{ formatTime(record.modifiedAt) }}
      </template>
      <template v-else-if="column.key === 'actions'">
        <Space :size="4">
          <Tooltip title="查看">
            <Button size="small" @click="emit('view', toJsPlugin(record))">
              <IconifyIcon icon="lucide:eye" />
            </Button>
          </Tooltip>
          <Tooltip v-if="record.status !== 'template'" :title="record.enabled ? '禁用' : '启用'">
            <Button size="small" @click="emit('toggle', toJsPlugin(record))">
              <IconifyIcon :icon="record.enabled ? 'lucide:pause' : 'lucide:play'" />
            </Button>
          </Tooltip>
          <Tooltip v-if="record.enabled" title="热重载">
            <Button size="small" @click="emit('reload', toJsPlugin(record))">
              <IconifyIcon icon="lucide:refresh-cw" />
            </Button>
          </Tooltip>
          <Tooltip v-if="record.status === 'template'" title="复制">
            <Button size="small" @click="emit('copy', toJsPlugin(record))">
              <IconifyIcon icon="lucide:copy" />
            </Button>
          </Tooltip>
        </Space>
      </template>
    </template>
  </Table>
</template>

<style scoped>
.file-cell {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.file-cell strong,
.file-cell span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-cell span {
  color: hsl(var(--muted-foreground));
  font-size: 12px;
}
</style>
