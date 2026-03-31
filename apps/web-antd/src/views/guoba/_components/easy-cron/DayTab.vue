<template>
  <div :class="`${prefixCls}-config-list`">
    <ARadioGroup v-model:value="type">
      <div class="item">
        <ARadio :value="TypeEnum.unset" v-bind="beforeRadioAttrs">不设置</ARadio>
        <span class="tip-info">日和周只能设置其中之一</span>
      </div>
      <div class="item">
        <ARadio :value="TypeEnum.every" v-bind="beforeRadioAttrs">每日</ARadio>
      </div>
      <div class="item">
        <ARadio :value="TypeEnum.range" v-bind="beforeRadioAttrs">区间</ARadio>
        <span> 从 </span>
        <AInputNumber v-model:value="valueRange.start" v-bind="typeRangeAttrs" />
        <span> 日 至 </span>
        <AInputNumber v-model:value="valueRange.end" v-bind="typeRangeAttrs" />
        <span> 日 </span>
      </div>
      <div class="item">
        <ARadio :value="TypeEnum.loop" v-bind="beforeRadioAttrs">循环</ARadio>
        <span> 从 </span>
        <AInputNumber v-model:value="valueLoop.start" v-bind="typeLoopAttrs" />
        <span> 日开始，间隔 </span>
        <AInputNumber v-model:value="valueLoop.interval" v-bind="typeLoopAttrs" />
        <span> 日 </span>
      </div>
      <div class="item">
        <ARadio :value="TypeEnum.last" v-bind="beforeRadioAttrs">最后一日</ARadio>
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
import { computed, defineComponent, watch } from 'vue';

import { Checkbox, InputNumber, Radio } from 'ant-design-vue';

import { TypeEnum, useTabEmits, useTabProps, useTabSetup } from './tab-utils';

export default defineComponent({
  components: {
    ACheckbox: Checkbox,
    ACheckboxGroup: Checkbox.Group,
    AInputNumber: InputNumber,
    ARadio: Radio,
    ARadioGroup: Radio.Group,
  },
  emits: useTabEmits(),
  name: 'DayTab',
  props: {
    ...useTabProps({
      defaultValue: '*',
    }),
    week: {
      default: '?',
      type: String,
    },
  },
  setup(props, context) {
    const disabledChoice = computed(() => {
      return (props.week && props.week !== '?') || props.disabled;
    });
    const setup = useTabSetup(props, context, {
      defaultValue: '*',
      disabled: disabledChoice,
      maxValue: 31,
      minValue: 1,
      valueLoop: { interval: 1, start: 1 },
      valueRange: { end: 31, start: 1 },
      valueWork: 1,
    });

    watch(
      () => props.week,
      () => {
        setup.updateValue(disabledChoice.value ? '?' : setup.computeValue.value);
      },
    );

    return setup;
  },
});
</script>
