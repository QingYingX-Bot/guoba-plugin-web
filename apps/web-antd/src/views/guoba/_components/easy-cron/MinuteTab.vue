<template>
  <div :class="`${prefixCls}-config-list`">
    <ARadioGroup v-model:value="type">
      <div class="item">
        <ARadio :value="TypeEnum.every" v-bind="beforeRadioAttrs">每分</ARadio>
      </div>
      <div class="item">
        <ARadio :value="TypeEnum.range" v-bind="beforeRadioAttrs">区间</ARadio>
        <span> 从 </span>
        <AInputNumber v-model:value="valueRange.start" v-bind="typeRangeAttrs" />
        <span> 分 至 </span>
        <AInputNumber v-model:value="valueRange.end" v-bind="typeRangeAttrs" />
        <span> 分 </span>
      </div>
      <div class="item">
        <ARadio :value="TypeEnum.loop" v-bind="beforeRadioAttrs">循环</ARadio>
        <span> 从 </span>
        <AInputNumber v-model:value="valueLoop.start" v-bind="typeLoopAttrs" />
        <span> 分开始，间隔 </span>
        <AInputNumber v-model:value="valueLoop.interval" v-bind="typeLoopAttrs" />
        <span> 分 </span>
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
  name: 'MinuteTab',
  props: useTabProps({
    defaultValue: '*',
  }),
  setup(props, context) {
    return useTabSetup(props, context, {
      defaultValue: '*',
      maxValue: 59,
      minValue: 0,
      valueLoop: { interval: 1, start: 0 },
      valueRange: { end: 59, start: 0 },
    });
  },
});
</script>
