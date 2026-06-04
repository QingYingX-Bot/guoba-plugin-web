<script lang="ts" setup>
import type {
  GuobaSandboxChatInput,
  GuobaSandboxConversation,
  GuobaSandboxEnvironment,
  GuobaSandboxRecord,
} from '#/api';

import { Card, Tabs } from 'ant-design-vue';

import SandboxConversationPane from './SandboxConversationPane.vue';
import SandboxRunnerPane from './SandboxRunnerPane.vue';

defineProps<{
  activeConversationId?: string;
  chat: GuobaSandboxChatInput;
  code: string;
  conversations: GuobaSandboxConversation[];
  environments: GuobaSandboxEnvironment[];
  message: string;
  record?: GuobaSandboxRecord;
  running?: boolean;
  selectedId?: string;
  sending?: boolean;
}>();

const emit = defineEmits<{
  (event: 'conversation-create'): void;
  (event: 'conversation-delete'): void;
  (event: 'conversation-send'): void;
  (event: 'run-code'): void;
  (event: 'update:activeConversationId', value: string): void;
  (event: 'update:chat', value: GuobaSandboxChatInput): void;
  (event: 'update:code', value: string): void;
  (event: 'update:message', value: string): void;
  (event: 'update:selectedId', value: string): void;
}>();
</script>

<template>
  <Card title="控制台">
    <Tabs>
      <Tabs.TabPane key="conversation" tab="对话沙盒">
        <SandboxConversationPane
          :active-id="activeConversationId"
          :chat="chat"
          :conversations="conversations"
          :environments="environments"
          :message="message"
          :selected-id="selectedId"
          :sending="sending"
          @create="emit('conversation-create')"
          @delete="emit('conversation-delete')"
          @send="emit('conversation-send')"
          @update:active-id="(value) => emit('update:activeConversationId', value)"
          @update:chat="(value) => emit('update:chat', value)"
          @update:message="(value) => emit('update:message', value)"
          @update:selected-id="(value) => emit('update:selectedId', value)"
        />
      </Tabs.TabPane>
      <Tabs.TabPane key="code" tab="JS片段">
        <SandboxRunnerPane
          :chat="chat"
          :code="code"
          :environments="environments"
          :record="record"
          :running="running"
          :selected-id="selectedId"
          @run="emit('run-code')"
          @update:chat="(value) => emit('update:chat', value)"
          @update:code="(value) => emit('update:code', value)"
          @update:selected-id="(value) => emit('update:selectedId', value)"
        />
      </Tabs.TabPane>
    </Tabs>
  </Card>
</template>
