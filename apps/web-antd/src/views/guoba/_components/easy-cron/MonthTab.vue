<template>
  <div :class="`${prefixCls}-config-list`">
    <ARadioGroup v-model:value="type">
      <div class="item">
        <ARadio :value="TypeEnum.every" v-bind="beforeRadioAttrs">每月</ARadio>
      </div>
      <div class="item">
        <ARadio :value="TypeEnum.range" v-bind="beforeRadioAttrs">区间</ARadio>
        <span> 从 </span>
        <AInputNumber v-model:value="valueRange.start" v-bind="typeRangeAttrs" />
        <span> 月 至 </span>
        <AInputNumber v-model:value="valueRange.end" v-bind="typeRangeAttrs" />
        <span> 月 </span>
      </div>
      <div class="item">
        <ARadio :value="TypeEnum.loop" v-bind="beforeRadioAttrs">循环</ARadio>
        <span> 从 </span>
        <AInputNumber v-model:value="valueLoop.start" v-bind="typeLoopAttrs" />
        <span> 月开始，间隔 </span>
        <AInputNumber v-model:value="valueLoop.interval" v-bind="typeLoopAttrs" />
        <span> 月 </span>
      </div>
      <div class="item">
        <ARadio :value="TypeEnum.specify" v-bind="beforeRadioAttrs">指定</ARadio>
        <div class="list">
          <ACheckboxGroup v-model:value="valueList">
            <template v-for="i in specifyRange" :key="i">
              <ACheckbox :value="i" v-bind="typeSpecifyAttrs">{{ i }}</ACheckbox>
            </template>
          </ACheckboxGroup>
        </div>
      </div>
    </ARadioGroup>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import { Checkbox, InputNumber, Radio } from 'ant-design-vue';

import { useTabEmits, useTabProps, useTabSetup } from './tab-utils';

export default defineComponent({
  components: {
    ACheckbox: Checkbox,
    ACheckboxGroup: Checkbox.Group,
    AInputNumber: InputNumber,
    ARadio: Radio,
    ARadioGroup: Radio.Group,
  },
  emits: useTabEmits(),
  name: 'MonthTab',
  props: useTabProps({
    defaultValue: '*',
  }),
  setup(props, context) {
    return useTabSetup(props, context, {
      defaultValue: '*',
      maxValue: 12,
      minValue: 1,
      valueLoop: { interval: 1, start: 1 },
      valueRange: { end: 12, start: 1 },
    });
  },
});
</script>
