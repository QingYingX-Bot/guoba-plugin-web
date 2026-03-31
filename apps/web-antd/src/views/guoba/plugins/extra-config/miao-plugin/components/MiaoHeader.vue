<script lang="ts" setup>
import type { MiaoVersionInfo } from '../types';

import { Button, Space, Tag } from 'ant-design-vue';

defineProps<{
  loading?: boolean;
  versions?: MiaoVersionInfo;
}>();

const emit = defineEmits<{
  backup: [];
  refresh: [];
  rollback: [];
  save: [];
  setting: [];
  theme: [];
}>();
</script>

<template>
  <div class="header-wrap">
    <Space wrap>
      <Tag color="blue">miao: {{ versions?.miao || 'x.x.x' }}</Tag>
      <Tag>yunzai: {{ versions?.yunzai || 'x.x.x' }}</Tag>
      <Button :loading="loading" @click="emit('refresh')">
        刷新
      </Button>
    </Space>
    <Space wrap>
      <Button danger @click="emit('rollback')">
        回滚
      </Button>
      <Button @click="emit('setting')">
        高级设置
      </Button>
      <Button @click="emit('theme')">
        皮肤
      </Button>
      <Button @click="emit('backup')">
        备份
      </Button>
      <Button type="primary" @click="emit('save')">
        保存
      </Button>
    </Space>
  </div>
</template>

<style scoped>
.header-wrap {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  gap: 12px;
  flex-wrap: wrap;
}
</style>
