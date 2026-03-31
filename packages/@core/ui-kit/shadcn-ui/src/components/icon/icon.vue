<script setup lang="ts">
import type { Component } from 'vue';

import { computed } from 'vue';

import { IconDefault, IconifyIcon } from '@vben-core/icons';
import {
  isFunction,
  isHttpUrl,
  isObject,
  isString,
} from '@vben-core/shared/utils';

const props = defineProps<{
  // 没有是否显示默认图标
  fallback?: boolean;
  icon?: Component | Function | string;
}>();

function isLikelyAssetPath(icon: string) {
  return (
    icon.startsWith('/') ||
    icon.startsWith('./') ||
    icon.startsWith('../') ||
    icon.startsWith('data:image/') ||
    icon.startsWith('api/') ||
    icon.includes('/api/') ||
    /\.(png|jpe?g|gif|svg|webp|ico)(\?.*)?$/i.test(icon)
  );
}

const isRemoteIcon = computed(() => {
  if (!isString(props.icon)) {
    return false;
  }
  const icon = props.icon.trim();
  return isHttpUrl(icon) || isLikelyAssetPath(icon);
});

const isComponent = computed(() => {
  const { icon } = props;
  return !isString(icon) && (isObject(icon) || isFunction(icon));
});
</script>

<template>
  <component :is="icon as Component" v-if="isComponent" v-bind="$attrs" />
  <img
    v-else-if="isRemoteIcon"
    :src="icon as string"
    class="vben-icon-image"
    v-bind="$attrs"
  />
  <IconifyIcon v-else-if="icon" v-bind="$attrs" :icon="icon as string" />
  <IconDefault v-else-if="fallback" v-bind="$attrs" />
</template>

<style scoped>
.vben-icon-image {
  object-fit: contain;
  vertical-align: middle;
}
</style>
