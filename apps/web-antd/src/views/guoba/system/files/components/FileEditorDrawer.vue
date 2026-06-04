<script lang="ts" setup>
import type { GuobaFileEntry } from '#/api';

import { computed } from 'vue';

import { Button, Drawer, Input, Space } from 'ant-design-vue';

const props = defineProps<{
  content: string;
  file?: GuobaFileEntry;
  open: boolean;
  saving?: boolean;
}>();

const emit = defineEmits<{
  save: [];
  'update:content': [value: string];
  'update:open': [value: boolean];
}>();

const title = computed(() => props.file?.name || '编辑文件');

function closeDrawer() {
  emit('update:open', false);
}

function updateContent(value: string) {
  emit('update:content', value);
}
</script>

<template>
  <Drawer :open="open" :title="title" placement="right" width="760" @close="closeDrawer">
    <Input.TextArea
      :value="content"
      class="file-editor"
      :rows="24"
      @update:value="updateContent"
    />
    <template #footer>
      <Space>
        <Button @click="closeDrawer">取消</Button>
        <Button type="primary" :loading="saving" @click="emit('save')">保存</Button>
      </Space>
    </template>
  </Drawer>
</template>

<style scoped>
.file-editor {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
</style>
