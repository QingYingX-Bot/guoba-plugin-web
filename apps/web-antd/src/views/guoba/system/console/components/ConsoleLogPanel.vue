<script lang="ts" setup>
import type { GuobaConsoleStreamEvent } from '#/api';

import { Empty, Tag } from 'ant-design-vue';

defineProps<{
  items: GuobaConsoleStreamEvent[];
}>();

function getLevelColor(level?: string) {
  const value = String(level || '').toUpperCase();
  if (value.includes('ERR')) {
    return 'red';
  }
  if (value.includes('WARN')) {
    return 'orange';
  }
  if (value.includes('MARK')) {
    return 'green';
  }
  return 'blue';
}

function formatTime(value: string) {
  return value ? value.replace('T', ' ').slice(11, 23) : '--:--:--.---';
}
</script>

<template>
  <div class="console-panel">
    <div v-if="items.length > 0" class="console-lines">
      <div v-for="item in items" :key="item.id" class="console-line">
        <span class="console-line__no">#{{ item.id }}</span>
        <span class="console-line__time">{{ formatTime(item.createdAt) }}</span>
        <Tag v-if="item.level" :color="getLevelColor(item.level)" class="console-line__level">
          {{ item.level }}
        </Tag>
        <span class="console-line__source">{{ item.source }}</span>
        <span class="console-line__text">{{ item.content }}</span>
      </div>
    </div>
    <Empty v-else description="等待实时输出" />
  </div>
</template>

<style scoped>
.console-panel {
  min-height: calc(100vh - 280px);
  max-height: calc(100vh - 260px);
  overflow: auto;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  background: #0f172a;
  color: #dbeafe;
}

.console-lines {
  min-width: 960px;
  padding: 10px 0;
}

.console-line {
  display: grid;
  grid-template-columns: 72px 108px 72px 72px minmax(0, 1fr);
  gap: 8px;
  align-items: start;
  padding: 2px 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  line-height: 1.6;
}

.console-line__no,
.console-line__time,
.console-line__source {
  color: #94a3b8;
  user-select: none;
}

.console-line__level {
  width: fit-content;
  margin-inline-end: 0;
}

.console-line__text {
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
