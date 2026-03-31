<script lang="ts" setup>
import type { GuobaPlugin } from '#/api/guoba';

import { Space, Tag } from 'ant-design-vue';

interface Props {
  plugin: GuobaPlugin;
  size?: number;
}

withDefaults(defineProps<Props>(), {
  size: 6,
});
</script>

<template>
  <Space :size="size" wrap>
    <Tag v-if="plugin.installed" color="green">已安装</Tag>
    <Tag v-else>未安装</Tag>
    <Tag v-if="plugin.hasConfig" color="purple">可配置</Tag>
    <Tag v-if="plugin.isV3" color="blue">V3</Tag>
    <Tag v-if="plugin.isV2" color="orange">V2</Tag>
    <Tag v-if="plugin.isDeleted" color="red">已失效</Tag>
  </Space>
</template>
