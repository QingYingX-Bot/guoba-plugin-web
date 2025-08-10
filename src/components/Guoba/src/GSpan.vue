<template>
  <span :class="spanClass">{{ spanValue }}</span>
</template>

<script setup lang="ts">
  import { useDesign } from '/@/hooks/web/useDesign';
  import { propTypes } from '/@/utils/propTypes';
  import { computed } from 'vue';

  const props = defineProps({
    value: propTypes.any,
    password: propTypes.bool.def(false),
  });
  const { prefixCls } = useDesign('g-span');

  const isEmpty = computed(() => {
    return props.value == null || props.value.length === 0;
  });

  const spanClass = computed(() => {
    return [
      prefixCls,
      {
        [`${prefixCls}-empty`]: isEmpty.value,
      },
    ];
  });

  // 安全地将任何值转换为可显示的字符串。
  function toDisplayStringSafe(val: any): string {
    if (val == null) return '';
    // strings
    if (typeof val === 'string') return val;
    // numbers/booleans
    if (typeof val === 'number' || typeof val === 'boolean') return String(val);
    // Date
    if (val instanceof Date) return String(val);
    // 数组：安全地将每个元素转换为字符串并使用逗号连接，跳过空值。
    if (Array.isArray(val)) {
      const parts = (val as any[])
        .map((item) => toDisplayStringSafe(item))
        .filter((s) => s !== '');
      return parts.join(',');
    }
    // 对象：首选通用标签字段；回退到JSON字符串（避免 [object Object]）
    if (typeof val === 'object') {
      const candidate = (val as Record<string, any>);
      for (const key of ['label', 'name', 'title', 'text', 'key', 'value']) {
        const v = candidate?.[key];
        if (v != null && (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean')) {
          return String(v);
        }
      }
      try {
        return JSON.stringify(val);
      } catch (e) {
        // 循环或不可序列化对象；显示为空而不是 [object Object]
        return '';
      }
    }
    try {
      return String(val);
    } catch {
      return '';
    }
  }

  const spanValue = computed(() => {
    if (isEmpty.value) {
      return '';
    } else {
      let value = toDisplayStringSafe(props.value);
      if (props.password) {
        // 掩盖所有字符，限制长度为12
        value = '*'.repeat(value.length).slice(0, 12);
      }
      return value;
    }
  });
</script>

<style lang="less">
  //noinspection LessUnresolvedVariable
  @prefix-cls: ~'@{namespace}-g-span';

  .@{prefix-cls} {
    &-empty {
      display: inline-block;
      width: 22px;
      height: 6px;
      background: #eaeaea;
      border-radius: 3px;
    }
  }
</style>
