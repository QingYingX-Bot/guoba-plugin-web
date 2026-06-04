<script lang="ts" setup>
import type { GuobaSandboxEnvironment, GuobaSandboxRecord } from '#/api';

import { computed } from 'vue';

import {
  Button,
  Card,
  Descriptions,
  Empty,
  Input,
  Select,
  Space,
  Tag,
} from 'ant-design-vue';

const props = defineProps<{
  code: string;
  environments: GuobaSandboxEnvironment[];
  record?: GuobaSandboxRecord;
  running?: boolean;
  selectedId?: string;
}>();

const emit = defineEmits<{
  (event: 'run'): void;
  (event: 'update:code', value: string): void;
  (event: 'update:selectedId', value: string): void;
}>();

const envOptions = computed(() =>
  props.environments.map((item) => ({
    disabled: !item.enabled,
    label: item.name,
    value: item.id,
  })),
);

function getStatusColor(status?: string) {
  if (status === 'success') {
    return 'success';
  }
  if (status === 'failed') {
    return 'error';
  }
  return 'processing';
}
</script>

<template>
  <Card title="运行控制台">
    <template #extra>
      <Space>
        <Select
          :options="envOptions"
          :value="selectedId"
          class="env-select"
          @change="(value) => emit('update:selectedId', String(value))"
        />
        <Button :loading="running" type="primary" @click="emit('run')">运行</Button>
      </Space>
    </template>
    <div class="runner-grid">
      <Input.TextArea
        :auto-size="{ minRows: 14, maxRows: 24 }"
        :value="code"
        class="code-input"
        @update:value="(value) => emit('update:code', String(value))"
      />
      <div class="result-pane">
        <template v-if="record">
          <Descriptions bordered :column="2" size="small">
            <Descriptions.Item label="状态">
              <Tag :color="getStatusColor(record.status)">{{ record.status }}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="耗时">{{ record.duration }} ms</Descriptions.Item>
            <Descriptions.Item label="环境">{{ record.environmentName }}</Descriptions.Item>
            <Descriptions.Item label="时间">
              {{ record.finishedAt || record.startedAt }}
            </Descriptions.Item>
          </Descriptions>
          <div class="output-block">
            <strong>输出</strong>
            <pre>{{ record.output || '-' }}</pre>
          </div>
          <div class="output-block">
            <strong>返回值</strong>
            <pre>{{ record.result || '-' }}</pre>
          </div>
          <div v-if="record.error" class="output-block">
            <strong>错误</strong>
            <pre>{{ record.error }}</pre>
          </div>
        </template>
        <Empty v-else description="暂无运行结果" />
      </div>
    </div>
  </Card>
</template>

<style scoped>
.env-select {
  width: 180px;
}

.runner-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 0.8fr);
}

.code-input,
.result-pane {
  min-width: 0;
}

.result-pane {
  display: grid;
  gap: 10px;
}

.output-block {
  display: grid;
  gap: 4px;
}

.output-block strong {
  color: hsl(var(--muted-foreground));
  font-size: 12px;
}

.output-block pre {
  background: hsl(var(--muted) / 35%);
  border: 1px solid hsl(var(--border));
  border-radius: 6px;
  margin: 0;
  max-height: 180px;
  overflow: auto;
  padding: 8px;
  white-space: pre-wrap;
  word-break: break-word;
}

@media (max-width: 1100px) {
  .runner-grid {
    grid-template-columns: 1fr;
  }
}
</style>
