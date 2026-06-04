<script lang="ts" setup>
import type { GuobaSandboxRecord } from '#/api';
import type { TableColumnsType, TablePaginationConfig } from 'ant-design-vue';

import { Card, Table, Tag } from 'ant-design-vue';

defineProps<{
  loading?: boolean;
  pagination?: false | TablePaginationConfig;
  records: GuobaSandboxRecord[];
}>();

const emit = defineEmits<{
  (event: 'change', pagination: TablePaginationConfig): void;
}>();

const columns: TableColumnsType<GuobaSandboxRecord> = [
  { dataIndex: 'environmentName', key: 'environmentName', title: '环境', width: 160 },
  { key: 'status', title: '状态', width: 100 },
  { dataIndex: 'duration', key: 'duration', title: '耗时', width: 100 },
  { dataIndex: 'codePreview', key: 'codePreview', title: '代码预览', width: 360 },
  { dataIndex: 'startedAt', key: 'startedAt', title: '开始时间', width: 180 },
];

function getStatusColor(status: string) {
  if (status === 'success') {
    return 'success';
  }
  if (status === 'failed') {
    return 'error';
  }
  return 'processing';
}

function formatTime(value?: string) {
  return value ? value.replace('T', ' ').slice(0, 19) : '-';
}

function formatChat(record: GuobaSandboxRecord) {
  const chat = record.chat;
  if (!chat) {
    return '-';
  }
  const type = chat.messageType === 'group' ? '群聊' : '私聊';
  return [
    `类型：${type}`,
    `Bot：${chat.selfId}`,
    `用户：${chat.userId}`,
    chat.groupId ? `群：${chat.groupId}` : '',
    `消息：${chat.message}`,
  ].filter(Boolean).join('\n');
}

function handleChange(pagination: TablePaginationConfig) {
  emit('change', pagination);
}
</script>

<template>
  <Card title="运行记录">
    <Table
      :columns="columns"
      :data-source="records"
      :loading="loading"
      :pagination="pagination"
      :scroll="{ x: 900 }"
      row-key="id"
      size="small"
      @change="handleChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'status'">
          <Tag :color="getStatusColor(record.status)">{{ record.status }}</Tag>
        </template>
        <template v-else-if="column.key === 'duration'">
          {{ record.duration }} ms
        </template>
        <template v-else-if="column.key === 'startedAt'">
          {{ formatTime(record.startedAt) }}
        </template>
      </template>
      <template #expandedRowRender="{ record }">
        <div class="record-detail">
          <div>
            <strong>模拟聊天</strong>
            <pre>{{ formatChat(record) }}</pre>
          </div>
          <div v-if="record.replies?.length">
            <strong>模拟回复</strong>
            <div class="reply-list">
              <pre v-for="item in record.replies" :key="item.messageId">{{ item.content }}</pre>
            </div>
          </div>
          <div>
            <strong>输出</strong>
            <pre>{{ record.output || '-' }}</pre>
          </div>
          <div>
            <strong>返回值</strong>
            <pre>{{ record.result || '-' }}</pre>
          </div>
          <div v-if="record.error">
            <strong>错误</strong>
            <pre>{{ record.error }}</pre>
          </div>
        </div>
      </template>
    </Table>
  </Card>
</template>

<style scoped>
.record-detail {
  display: grid;
  gap: 8px;
}

.reply-list {
  display: grid;
  gap: 6px;
}

.record-detail strong {
  color: hsl(var(--muted-foreground));
  font-size: 12px;
}

.record-detail pre {
  background: hsl(var(--muted) / 35%);
  border: 1px solid hsl(var(--border));
  border-radius: 6px;
  margin: 4px 0 0;
  max-height: 180px;
  overflow: auto;
  padding: 8px;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
