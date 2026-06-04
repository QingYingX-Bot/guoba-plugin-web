<script lang="ts" setup>
import type { GuobaConsoleStreamEvent } from '#/api';

import { computed } from 'vue';

import { Empty } from 'ant-design-vue';

import { parseAnsiText } from './ansiText';

const props = defineProps<{
  items: GuobaConsoleStreamEvent[];
}>();

const renderedItems = computed(() => {
  return props.items.map(item => ({
    id: item.id,
    segments: parseAnsiText(item.raw || item.content),
  }));
});
</script>

<template>
  <div class="console-panel">
    <div v-if="renderedItems.length > 0" class="console-lines">
      <div v-for="item in renderedItems" :key="item.id" class="console-line">
        <span class="console-line__no">#{{ item.id }}</span>
        <span class="console-line__text">
          <span
            v-for="(segment, index) in item.segments"
            :key="index"
            :style="segment.style"
          >
            {{ segment.text }}
          </span>
        </span>
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
  grid-template-columns: 72px minmax(0, 1fr);
  gap: 8px;
  align-items: start;
  padding: 2px 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  line-height: 1.6;
}

.console-line__no {
  color: #94a3b8;
  user-select: none;
}

.console-line__text {
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
