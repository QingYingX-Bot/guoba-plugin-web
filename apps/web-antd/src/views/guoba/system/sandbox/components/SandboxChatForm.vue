<script lang="ts" setup>
import type {
  GuobaSandboxChatInput,
  GuobaSandboxChatType,
} from '#/api';

import { Checkbox, Input, Segmented, Space } from 'ant-design-vue';

const props = defineProps<{
  chat: GuobaSandboxChatInput;
}>();

const emit = defineEmits<{
  (event: 'update:chat', value: GuobaSandboxChatInput): void;
}>();

const typeOptions = [
  { label: '群聊', value: 'group' },
  { label: '私聊', value: 'private' },
];

function update(patch: Partial<GuobaSandboxChatInput>) {
  emit('update:chat', { ...props.chat, ...patch });
}

function updateType(value: string | number) {
  const messageType: GuobaSandboxChatType =
    value === 'private' ? 'private' : 'group';
  update({ messageType });
}
</script>

<template>
  <div class="chat-form">
    <div class="chat-toolbar">
      <Segmented
        :options="typeOptions"
        :value="chat.messageType"
        @change="updateType"
      />
      <Space>
        <Checkbox
          :checked="chat.atBot"
          @update:checked="(value) => update({ atBot: Boolean(value) })"
        >
          at Bot
        </Checkbox>
        <Checkbox
          :checked="chat.isMaster"
          @update:checked="(value) => update({ isMaster: Boolean(value) })"
        >
          主人
        </Checkbox>
      </Space>
    </div>
    <div class="field-grid">
      <Input
        :value="chat.selfId"
        addon-before="Bot"
        @update:value="(value) => update({ selfId: String(value) })"
      />
      <Input
        :value="chat.userId"
        addon-before="用户"
        @update:value="(value) => update({ userId: String(value) })"
      />
      <Input
        v-if="chat.messageType === 'group'"
        :value="chat.groupId"
        addon-before="群"
        @update:value="(value) => update({ groupId: String(value) })"
      />
      <Input
        :value="chat.senderName"
        addon-before="昵称"
        @update:value="(value) => update({ senderName: String(value) })"
      />
      <Input
        v-if="chat.messageType === 'group'"
        :value="chat.groupName"
        addon-before="群名"
        @update:value="(value) => update({ groupName: String(value) })"
      />
    </div>
    <Input.TextArea
      :auto-size="{ minRows: 3, maxRows: 6 }"
      :value="chat.message"
      placeholder="输入模拟消息内容"
      @update:value="(value) => update({ message: String(value), rawMessage: String(value) })"
    />
  </div>
</template>

<style scoped>
.chat-form {
  border: 1px solid hsl(var(--border));
  border-radius: 6px;
  display: grid;
  gap: 10px;
  padding: 10px;
}

.chat-toolbar {
  align-items: center;
  display: flex;
  gap: 10px;
  justify-content: space-between;
}

.field-grid {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

@media (max-width: 680px) {
  .chat-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .field-grid {
    grid-template-columns: 1fr;
  }
}
</style>
