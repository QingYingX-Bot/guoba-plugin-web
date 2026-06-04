<script lang="ts" setup>
import type {
  GuobaSandboxChatInput,
  GuobaSandboxConversation,
  GuobaSandboxEnvironment,
} from '#/api';

import { computed } from 'vue';

import { Button, Empty, Input, Select, Space, Tag } from 'ant-design-vue';

import SandboxChatForm from './SandboxChatForm.vue';

const props = defineProps<{
  activeId?: string;
  chat: GuobaSandboxChatInput;
  conversations: GuobaSandboxConversation[];
  environments: GuobaSandboxEnvironment[];
  message: string;
  selectedId?: string;
  sending?: boolean;
}>();

const emit = defineEmits<{
  (event: 'create'): void;
  (event: 'delete'): void;
  (event: 'send'): void;
  (event: 'update:activeId', value: string): void;
  (event: 'update:chat', value: GuobaSandboxChatInput): void;
  (event: 'update:message', value: string): void;
  (event: 'update:selectedId', value: string): void;
}>();

const envOptions = computed(() =>
  props.environments.map((item) => ({
    disabled: !item.enabled,
    label: item.name,
    value: item.id,
  })),
);

const conversationOptions = computed(() =>
  props.conversations.map((item) => ({
    label: item.title,
    value: item.id,
  })),
);

const activeConversation = computed(() =>
  props.conversations.find((item) => item.id === props.activeId),
);

function getRoleLabel(role: string) {
  if (role === 'user') return '用户';
  if (role === 'bot') return '插件';
  return '日志';
}
</script>

<template>
  <div class="conversation-pane">
    <div class="conversation-toolbar">
      <Space wrap>
        <Select
          :options="envOptions"
          :value="selectedId"
          class="env-select"
          @change="(value) => emit('update:selectedId', String(value))"
        />
        <Select
          :options="conversationOptions"
          :value="activeId"
          class="conversation-select"
          placeholder="选择会话"
          @change="(value) => emit('update:activeId', String(value))"
        />
        <Button @click="emit('create')">新建会话</Button>
        <Button :disabled="!activeId" danger @click="emit('delete')">删除会话</Button>
      </Space>
    </div>
    <SandboxChatForm
      :chat="chat"
      :show-message="false"
      @update:chat="(value) => emit('update:chat', value)"
    />
    <div class="message-list">
      <template v-if="activeConversation?.messages.length">
        <div
          v-for="item in activeConversation.messages"
          :key="item.id"
          :class="['message-item', `message-${item.role}`]"
        >
          <div class="message-head">
            <Tag>{{ getRoleLabel(item.role) }}</Tag>
            <span>{{ item.createdAt.replace('T', ' ').slice(0, 19) }}</span>
          </div>
          <pre>{{ item.content }}</pre>
        </div>
      </template>
      <Empty v-else description="暂无沙盒对话" />
    </div>
    <div class="send-row">
      <Input.TextArea
        :auto-size="{ minRows: 2, maxRows: 5 }"
        :value="message"
        placeholder="输入要发送给真实插件的命令"
        @press-enter.ctrl="emit('send')"
        @update:value="(value) => emit('update:message', String(value))"
      />
      <Button
        :disabled="!selectedId"
        :loading="sending"
        type="primary"
        @click="emit('send')"
      >
        发送
      </Button>
    </div>
  </div>
</template>

<style scoped>
.conversation-pane {
  display: grid;
  gap: 12px;
}

.conversation-toolbar {
  display: flex;
  justify-content: space-between;
}

.env-select {
  width: 180px;
}

.conversation-select {
  width: 220px;
}

.message-list {
  border: 1px solid hsl(var(--border));
  border-radius: 6px;
  display: grid;
  gap: 8px;
  max-height: 420px;
  min-height: 260px;
  overflow: auto;
  padding: 10px;
}

.message-item {
  border-radius: 6px;
  display: grid;
  gap: 6px;
  padding: 8px;
}

.message-bot {
  background: hsl(var(--primary) / 8%);
}

.message-log {
  background: hsl(var(--muted) / 35%);
}

.message-user {
  background: hsl(var(--accent) / 45%);
}

.message-head {
  align-items: center;
  color: hsl(var(--muted-foreground));
  display: flex;
  gap: 8px;
  font-size: 12px;
}

.message-item pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.send-row {
  align-items: flex-end;
  display: grid;
  gap: 8px;
  grid-template-columns: minmax(0, 1fr) auto;
}
</style>
