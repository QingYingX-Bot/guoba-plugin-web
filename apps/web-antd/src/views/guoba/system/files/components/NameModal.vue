<script lang="ts" setup>
import { Modal, Input } from 'ant-design-vue';

defineProps<{
  open: boolean;
  title: string;
  value: string;
}>();

const emit = defineEmits<{
  ok: [];
  'update:open': [value: boolean];
  'update:value': [value: string];
}>();

function closeModal() {
  emit('update:open', false);
}
</script>

<template>
  <Modal :open="open" :title="title" @cancel="closeModal" @ok="emit('ok')">
    <Input
      :value="value"
      autofocus
      placeholder="输入名称"
      @press-enter="emit('ok')"
      @update:value="emit('update:value', $event)"
    />
  </Modal>
</template>
