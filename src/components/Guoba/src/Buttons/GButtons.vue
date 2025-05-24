<template>
  <div :class="[prefixCls]">
    <div v-if="errorTip" class="error-tip">{{ errorTip }}</div>
    <a-space :size="spaceSize">
      <template v-for="(btn, index) in getButtons" :key="index">
        <a-tooltip v-if="btn.tooltip" :title="btn.tooltip.title" :placement="btn.tooltip.placement">
          <GButton :btn="btn" />
        </a-tooltip>
        <GButton v-else :btn="btn" />
      </template>
    </a-space>
  </div>
</template>

<script lang="ts" setup>
  import { ref, computed } from 'vue';
  import { useDesign } from '/@/hooks/web/useDesign';
  import GButton from './GButton.vue';

  const props = defineProps({
    spaceSize: {
      type: Number,
      default: 8,
    },
    buttons: {
      type: Array as PropType<Recordable[]>,
      required: true,
    },
  });

  const { prefixCls } = useDesign('g-buttons');

  const errorTip = ref('');

  const getButtons = computed(() => {
    const { buttons } = props;
    return validateButtons(buttons) ? buttons : [];
  });

  function validateButtons(buttons: Recordable[]) {
    if (!Array.isArray(buttons)) {
      errorTip.value = '按钮格式不正确';
      return false;
    }
    return true;
  }
</script>

<style lang="less">
  //noinspection LessUnresolvedVariable
  @prefix-cls: ~'@{namespace}-g-buttons';

  .@{prefix-cls} {
    .error-tip {
      color: red;
      margin-bottom: 8px;
    }
  }
</style>
