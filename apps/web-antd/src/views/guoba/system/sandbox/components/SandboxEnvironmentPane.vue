<script lang="ts" setup>
import type { GuobaSandboxEnvironment } from '#/api';
import type { TableColumnsType } from 'ant-design-vue';

import { IconifyIcon } from '@vben/icons';

import { Button, Card, Space, Switch, Table, Tag, Tooltip } from 'ant-design-vue';

const props = defineProps<{
  environments: GuobaSandboxEnvironment[];
  loading?: boolean;
  selectedId?: string;
}>();

const emit = defineEmits<{
  (event: 'create'): void;
  (event: 'delete', record: GuobaSandboxEnvironment): void;
  (event: 'edit', record: GuobaSandboxEnvironment): void;
  (event: 'select', id: string): void;
  (event: 'toggle', record: GuobaSandboxEnvironment, enabled: boolean): void;
}>();

const columns: TableColumnsType<GuobaSandboxEnvironment> = [
  { key: 'name', title: '环境', width: 220 },
  { key: 'limits', title: '限制', width: 260 },
  { key: 'dirs', title: '目录', width: 260 },
  { key: 'enabled', title: '启用', width: 90 },
  { key: 'actions', title: '操作', width: 130 },
];

function formatLimits(record: GuobaSandboxEnvironment) {
  return `${record.timeoutMs}ms / ${record.maxOutputLength} 字符`;
}

function toSandbox(record: unknown) {
  return record as GuobaSandboxEnvironment;
}

function getRowClassName(record: GuobaSandboxEnvironment) {
  return record.id === props.selectedId ? 'selected-row' : '';
}

function handleRow(record: GuobaSandboxEnvironment) {
  return { onClick: () => emit('select', record.id) };
}
</script>

<template>
  <Card title="沙盒环境">
    <template #extra>
      <Button type="primary" @click="emit('create')">
        <IconifyIcon icon="lucide:plus" />
      </Button>
    </template>
    <Table
      :columns="columns"
      :data-source="environments"
      :loading="loading"
      :pagination="false"
      :row-class-name="getRowClassName"
      :scroll="{ x: 960 }"
      row-key="id"
      size="small"
      @row="handleRow"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'name'">
          <div class="env-cell">
            <strong>{{ record.name }}</strong>
            <span>{{ record.description || record.id }}</span>
          </div>
        </template>
        <template v-else-if="column.key === 'limits'">
          <Tag>{{ formatLimits(toSandbox(record)) }}</Tag>
        </template>
        <template v-else-if="column.key === 'dirs'">
          <Space :size="4" wrap>
            <Tag v-for="dir in record.allowedDirs.slice(0, 2)" :key="dir">
              {{ dir }}
            </Tag>
            <Tag v-if="record.allowedDirs.length > 2">
              +{{ record.allowedDirs.length - 2 }}
            </Tag>
          </Space>
        </template>
        <template v-else-if="column.key === 'enabled'">
          <Switch
            :checked="record.enabled"
            size="small"
            @click.stop
            @change="(checked) => emit('toggle', toSandbox(record), Boolean(checked))"
          />
        </template>
        <template v-else-if="column.key === 'actions'">
          <Space :size="4">
            <Tooltip title="编辑">
              <Button size="small" @click.stop="emit('edit', toSandbox(record))">
                <IconifyIcon icon="lucide:pencil" />
              </Button>
            </Tooltip>
            <Tooltip title="删除">
              <Button
                danger
                :disabled="record.locked"
                size="small"
                @click.stop="emit('delete', toSandbox(record))"
              >
                <IconifyIcon icon="lucide:trash-2" />
              </Button>
            </Tooltip>
          </Space>
        </template>
      </template>
    </Table>
  </Card>
</template>

<style scoped>
.env-cell {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.env-cell strong,
.env-cell span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.env-cell span {
  color: hsl(var(--muted-foreground));
  font-size: 12px;
}

:deep(.selected-row > td) {
  background: hsl(var(--accent) / 70%) !important;
}
</style>
