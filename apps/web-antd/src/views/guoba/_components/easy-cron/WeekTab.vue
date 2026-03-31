<template>
  <div :class="`${prefixCls}-config-list`">
    <ARadioGroup v-model:value="type">
      <div class="item">
        <ARadio :value="TypeEnum.unset" v-bind="beforeRadioAttrs">不设置</ARadio>
        <span class="tip-info">日和周只能设置其中之一</span>
      </div>
      <div class="item">
        <ARadio :value="TypeEnum.range" v-bind="beforeRadioAttrs">区间</ARadio>
        <span> 从 </span>
        <ASelect
          v-model:value="valueRange.start"
          :options="weekOptions"
          v-bind="typeRangeSelectAttrs"
        />
        <span> 至 </span>
        <ASelect
          v-model:value="valueRange.end"
          :options="weekOptions"
          v-bind="typeRangeSelectAttrs"
        />
      </div>
      <div class="item">
        <ARadio :value="TypeEnum.loop" v-bind="beforeRadioAttrs">循环</ARadio>
        <span> 从 </span>
        <ASelect
          v-model:value="valueLoop.start"
          :options="weekOptions"
          v-bind="typeLoopSelectAttrs"
        />
        <span> 开始，间隔 </span>
        <AInputNumber v-model:value="valueLoop.interval" v-bind="typeLoopAttrs" />
        <span> 天 </span>
      </div>
      <div class="item">
        <ARadio :value="TypeEnum.specify" v-bind="beforeRadioAttrs">指定</ARadio>
        <div class="list list-cn">
          <ACheckboxGroup v-model:value="valueList">
            <template v-for="opt in weekOptions" :key="opt.value">
              <ACheckbox :value="opt.value" v-bind="typeSpecifyAttrs">
                {{ opt.label }}
              </ACheckbox>
            </template>
          </ACheckboxGroup>
        </div>
      </div>
    </ARadioGroup>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, watch } from 'vue';

import { Checkbox, InputNumber, Radio, Select } from 'ant-design-vue';

import { TypeEnum, useTabEmits, useTabProps, useTabSetup } from './tab-utils';

const WEEK_MAP_CN: Record<string, string> = {
  '1': '周日',
  '2': '周一',
  '3': '周二',
  '4': '周三',
  '5': '周四',
  '6': '周五',
  '7': '周六',
};

export default defineComponent({
  components: {
    ACheckbox: Checkbox,
    ACheckboxGroup: Checkbox.Group,
    AInputNumber: InputNumber,
    ARadio: Radio,
    ARadioGroup: Radio.Group,
    ASelect: Select,
  },
  emits: useTabEmits(),
  name: 'WeekTab',
  props: {
    ...useTabProps({
      defaultValue: '?',
    }),
    day: {
      default: '*',
      type: String,
    },
  },
  setup(props, context) {
    const disabledChoice = computed(() => {
      return (props.day && props.day !== '?') || props.disabled;
    });

    const setup = useTabSetup(props, context, {
      defaultType: TypeEnum.unset,
      defaultValue: '?',
      disabled: disabledChoice,
      maxValue: 7,
      minValue: 1,
      valueLoop: { interval: 1, start: 2 },
      valueRange: { end: 7, start: 1 },
    });

    const weekOptions = computed(() => {
      return Object.keys(WEEK_MAP_CN).map((key) => ({
        label: WEEK_MAP_CN[key]!,
        value: Number.parseInt(key, 10),
      }));
    });

    const typeRangeSelectAttrs = computed(() => ({
      class: ['w80'],
      disabled: setup.typeRangeAttrs.value.disabled,
    }));

    const typeLoopSelectAttrs = computed(() => ({
      class: ['w80'],
      disabled: setup.typeLoopAttrs.value.disabled,
    }));

    watch(
      () => props.day,
      () => {
        setup.updateValue(disabledChoice.value ? '?' : setup.computeValue.value);
      },
    );

    return {
      ...setup,
      typeLoopSelectAttrs,
      typeRangeSelectAttrs,
      weekOptions,
    };
  },
});
</script>
