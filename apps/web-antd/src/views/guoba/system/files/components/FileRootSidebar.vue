<script lang="ts" setup>
import type { GuobaFileRoot } from '#/api';

import { computed } from 'vue';

import { IconifyIcon } from '@vben/icons';

const props = defineProps<{
  currentPath: string;
  loading?: boolean;
  roots: GuobaFileRoot[];
}>();

const emit = defineEmits<{
  open: [path: string];
}>();

const activeKey = computed(() => {
  return props.roots
    .filter((item) => props.currentPath === item.path || props.currentPath.startsWith(`${item.path}/`))
    .sort((a, b) => b.path.length - a.path.length)[0]?.key;
});
</script>

<template>
  <div class="root-sidebar">
    <div class="root-sidebar__title">位置</div>
    <button
      v-for="root in roots"
      :key="root.key"
      :class="{ 'is-active': activeKey === root.key }"
      :disabled="loading"
      class="root-sidebar__item"
      type="button"
      @click="emit('open', root.path)"
    >
      <IconifyIcon class="root-sidebar__icon" icon="lucide:folder-open" />
      <span>
        <span class="root-sidebar__name">{{ root.title }}</span>
        <span class="root-sidebar__path">{{ root.path }}</span>
      </span>
    </button>
  </div>
</template>

<style scoped>
.root-sidebar {
  display: flex;
  flex-direction: column;
  gap: 6px;
  height: 100%;
  padding: 12px;
  background: hsl(var(--background));
  border-right: 1px solid hsl(var(--border));
}

.root-sidebar__title {
  padding: 4px 8px 8px;
  color: hsl(var(--muted-foreground));
  font-size: 13px;
}

.root-sidebar__item {
  display: grid;
  grid-template-columns: 20px 1fr;
  gap: 10px;
  align-items: center;
  width: 100%;
  padding: 9px 10px;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 6px;
}

.root-sidebar__item:hover,
.root-sidebar__item.is-active {
  background: hsl(var(--accent));
}

.root-sidebar__icon {
  color: hsl(var(--primary));
}

.root-sidebar__name,
.root-sidebar__path {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.root-sidebar__name {
  color: hsl(var(--foreground));
  font-weight: 500;
}

.root-sidebar__path {
  color: hsl(var(--muted-foreground));
  font-size: 12px;
}
</style>
