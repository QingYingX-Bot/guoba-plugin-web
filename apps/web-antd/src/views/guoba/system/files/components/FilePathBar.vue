<script lang="ts" setup>
import { IconifyIcon } from '@vben/icons';

import { Button, Input, Space, Tooltip } from 'ant-design-vue';

defineProps<{
  loading?: boolean;
  parentPath?: string;
  path: string;
}>();

const emit = defineEmits<{
  mkdir: [];
  open: [path: string];
  parent: [];
  refresh: [];
  'update:path': [value: string];
}>();
</script>

<template>
  <Space class="path-bar" wrap>
    <Input
      :value="path"
      class="path-input"
      @press-enter="emit('open', path)"
      @update:value="emit('update:path', $event)"
    />
    <Tooltip title="上级">
      <Button :disabled="!parentPath" @click="emit('parent')">
        <IconifyIcon icon="lucide:arrow-up" />
      </Button>
    </Tooltip>
    <Tooltip title="新建目录">
      <Button @click="emit('mkdir')">
        <IconifyIcon icon="lucide:folder-plus" />
      </Button>
    </Tooltip>
    <Tooltip title="刷新">
      <Button :loading="loading" @click="emit('refresh')">
        <IconifyIcon icon="lucide:refresh-cw" />
      </Button>
    </Tooltip>
    <Button :loading="loading" type="primary" @click="emit('open', path)">打开</Button>
  </Space>
</template>

<style scoped>
.path-bar {
  justify-content: flex-end;
}

.path-input {
  width: min(520px, 70vw);
}
</style>
