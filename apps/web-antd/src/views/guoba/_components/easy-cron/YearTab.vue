<template>
  <div :class="`${prefixCls}-config-list`">
    <ARadioGroup v-model:value="type">
      <div class="item">
        <ARadio :value="TypeEnum.every" v-bind="beforeRadioAttrs">每年</ARadio>
      </div>
      <div class="item">
        <ARadio :value="TypeEnum.range" v-bind="beforeRadioAttrs">区间</ARadio>
        <span> 从 </span>
        <AInputNumber
          class="w80"
          v-model:value="valueRange.start"
          v-bind="typeRangeAttrs"
        />
        <span> 年 至 </span>
        <AInputNumber
          class="w80"
          v-model:value="valueRange.end"
          v-bind="typeRangeAttrs"
        />
        <span> 年 </span>
      </div>
      <div class="item">
        <ARadio :value="TypeEnum.loop" v-bind="beforeRadioAttrs">循环</ARadio>
        <span> 从 </span>
        <AInputNumber
          class="w80"
          v-model:value="valueLoop.start"
          v-bind="typeLoopAttrs"
        />
        <span> 年开始，间隔 </span>
        <AInputNumber
          class="w80"
          v-model:value="valueLoop.interval"
          v-bind="typeLoopAttrs"
        />
        <span> 年 </span>
      </div>
    </ARadioGroup>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import { InputNumber, Radio } from 'ant-design-vue';

import { useTabEmits, useTabProps, useTabSetup } from './tab-utils';

export default defineComponent({
  components: {
    AInputNumber: InputNumber,
    ARadio: Radio,
    ARadioGroup: Radio.Group,
  },
  emits: useTabEmits(),
  name: 'YearTab',
  props: useTabProps({
    defaultValue: '*',
  }),
  setup(props, context) {
    const nowYear = new Date().getFullYear();
    return useTabSetup(props, context, {
      defaultValue: '*',
      minValue: 0,
      valueLoop: { interval: 1, start: nowYear },
      valueRange: { end: nowYear + 100, start: nowYear },
    });
  },
});
</script>
