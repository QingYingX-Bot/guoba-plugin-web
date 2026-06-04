<script lang="ts" setup>
import type { GuobaFileEntry } from '#/api';
import type { TableColumnsType } from 'ant-design-vue';

import { IconifyIcon } from '@vben/icons';

import { Button, Space, Table, Tag } from 'ant-design-vue';

defineProps<{
  items: GuobaFileEntry[];
  loading?: boolean;
}>();

const emit = defineEmits<{
  delete: [item: GuobaFileEntry];
  open: [item: GuobaFileEntry];
  rename: [item: GuobaFileEntry];
}>();

const columns: TableColumnsType<GuobaFileEntry> = [
  { key: 'name', title: '名称' },
  { key: 'type', title: '类型', width: 100 },
  { key: 'size', title: '大小', width: 110 },
  { key: 'modifiedAt', title: '修改时间', width: 180 },
  { key: 'action', title: '操作', width: 230 },
];

function toFileEntry(record: unknown) {
  return record as GuobaFileEntry;
}

function getFileIcon(item: GuobaFileEntry) {
  return item.isDirectory ? 'lucide:folder' : item.editable ? 'lucide:file-text' : 'lucide:file';
}

function getRowProps(record: GuobaFileEntry) {
  return {
    class: 'file-table__row',
    onDblclick: () => emit('open', record),
  };
}

function formatSize(size: number) {
  if (!size) {
    return '-';
  }
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function formatTime(value?: string) {
  return value ? value.replace('T', ' ').slice(0, 19) : '-';
}
</script>

<template>
  <Table
    :columns="columns"
    :custom-row="getRowProps"
    :data-source="items"
    :loading="loading"
    :pagination="{ pageSize: 20, showSizeChanger: true }"
    :scroll="{ x: 980 }"
    row-key="path"
    size="small"
  >
    <template #bodyCell="{ column, record }">
      <template v-if="column.key === 'name'">
        <Button class="file-table__name" type="link" @click="emit('open', toFileEntry(record))">
          <IconifyIcon class="file-table__icon" :icon="getFileIcon(toFileEntry(record))" />
          <span class="file-table__text">{{ record.name }}</span>
        </Button>
      </template>
      <template v-else-if="column.key === 'type'">
        <Tag :color="record.isDirectory ? 'blue' : 'default'">
          {{ record.isDirectory ? '目录' : record.extension || '文件' }}
        </Tag>
      </template>
      <template v-else-if="column.key === 'size'">
        {{ record.isDirectory ? '-' : formatSize(record.size) }}
      </template>
      <template v-else-if="column.key === 'modifiedAt'">
        {{ formatTime(record.modifiedAt) }}
      </template>
      <template v-else-if="column.key === 'action'">
        <Space>
          <Button size="small" @click="emit('open', toFileEntry(record))">打开</Button>
          <Button size="small" @click="emit('rename', toFileEntry(record))">
            重命名
          </Button>
          <Button danger size="small" @click="emit('delete', toFileEntry(record))">
            删除
          </Button>
        </Space>
      </template>
    </template>
  </Table>
</template>

<style scoped>
.file-table__name {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  gap: 8px;
  padding: 0;
}

.file-table__icon {
  flex: 0 0 auto;
  color: hsl(var(--primary));
}

.file-table__text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:deep(.file-table__row) {
  cursor: pointer;
}
</style>
