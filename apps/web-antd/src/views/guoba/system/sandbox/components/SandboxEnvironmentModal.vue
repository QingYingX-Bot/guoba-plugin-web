<script lang="ts" setup>
import type {
  GuobaSandboxEnvironment,
  GuobaSandboxEnvironmentPayload,
} from '#/api';

import { reactive, watch } from 'vue';

import { Checkbox, Form, Input, InputNumber, Modal } from 'ant-design-vue';

const props = defineProps<{
  environment?: GuobaSandboxEnvironment;
  open: boolean;
  saving?: boolean;
}>();

const emit = defineEmits<{
  (event: 'close'): void;
  (event: 'save', value: GuobaSandboxEnvironmentPayload): void;
}>();

const form = reactive({
  allowedCommands: '',
  allowedDirs: '',
  description: '',
  enabled: true,
  maxOutputLength: 12_000,
  name: '',
  timeoutMs: 3000,
});

watch(
  () => props.open,
  (open) => {
    if (!open) {
      return;
    }
    const env = props.environment;
    form.name = env?.name || '';
    form.description = env?.description || '';
    form.enabled = env?.enabled ?? true;
    form.timeoutMs = env?.timeoutMs ?? 3000;
    form.maxOutputLength = env?.maxOutputLength ?? 12_000;
    form.allowedDirs = (env?.allowedDirs || ['plugins/example', 'data/guoba/sandbox']).join('\n');
    form.allowedCommands = (env?.allowedCommands || []).join('\n');
  },
);

function splitText(value: string) {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function handleOk() {
  emit('save', {
    allowedCommands: splitText(form.allowedCommands),
    allowedDirs: splitText(form.allowedDirs),
    description: form.description,
    enabled: form.enabled,
    maxOutputLength: Number(form.maxOutputLength || 12_000),
    name: form.name.trim(),
    timeoutMs: Number(form.timeoutMs || 3000),
  });
}
</script>

<template>
  <Modal
    :confirm-loading="saving"
    :open="open"
    :title="environment ? '编辑沙盒环境' : '新建沙盒环境'"
    width="720px"
    @cancel="emit('close')"
    @ok="handleOk"
  >
    <Form layout="vertical">
      <Form.Item label="名称" required>
        <Input v-model:value="form.name" placeholder="例如：example 插件测试" />
      </Form.Item>
      <Form.Item label="描述">
        <Input v-model:value="form.description" />
      </Form.Item>
      <div class="form-grid">
        <Form.Item label="超时时间">
          <InputNumber
            v-model:value="form.timeoutMs"
            :max="10_000"
            :min="100"
            addon-after="ms"
            class="full-input"
          />
        </Form.Item>
        <Form.Item label="输出上限">
          <InputNumber
            v-model:value="form.maxOutputLength"
            :max="100_000"
            :min="1000"
            addon-after="字符"
            class="full-input"
          />
        </Form.Item>
      </div>
      <Form.Item label="允许目录">
        <Input.TextArea
          v-model:value="form.allowedDirs"
          :auto-size="{ minRows: 3, maxRows: 6 }"
        />
      </Form.Item>
      <Form.Item label="允许命令">
        <Input.TextArea
          v-model:value="form.allowedCommands"
          :auto-size="{ minRows: 2, maxRows: 5 }"
          placeholder="每行一个命令，例如 node"
        />
      </Form.Item>
      <Form.Item>
        <Checkbox v-model:checked="form.enabled">启用环境</Checkbox>
      </Form.Item>
    </Form>
  </Modal>
</template>

<style scoped>
.form-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: 1fr 1fr;
}

.full-input {
  width: 100%;
}

@media (max-width: 720px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
