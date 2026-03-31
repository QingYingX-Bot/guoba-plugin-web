import { computed, inject, reactive, ref, unref, watch } from 'vue';

export enum TypeEnum {
  unset = 'UNSET',
  every = 'EVERY',
  range = 'RANGE',
  loop = 'LOOP',
  work = 'WORK',
  last = 'LAST',
  specify = 'SPECIFY',
}

export function useTabProps(options?: {
  defaultValue?: string;
  props?: Record<string, any>;
}) {
  const defaultValue = options?.defaultValue ?? '?';
  return {
    value: {
      default: defaultValue,
      type: String,
    },
    disabled: {
      default: false,
      type: Boolean,
    },
    ...(options?.props ?? {}),
  };
}

export function useTabEmits() {
  return ['change', 'update:value'];
}

interface TabSetupOptions {
  defaultType?: TypeEnum;
  defaultValue?: string;
  disabled?: any;
  maxValue?: number;
  minValue?: number;
  valueLoop?: Record<string, any>;
  valueRange?: Record<string, any>;
  valueWeek?: Record<string, any>;
  valueWork?: number;
}

export function useTabSetup(props: any, context: any, options: TabSetupOptions) {
  const { emit } = context;
  const prefixCls = inject('prefixCls', 'guoba-easy-cron-inner');
  const defaultValue = ref(options?.defaultValue ?? '?');
  const type = ref(options.defaultType ?? TypeEnum.every);
  const valueList = ref<any[]>([]);
  const valueRange = reactive(options.valueRange ?? {});
  const valueLoop = reactive(options.valueLoop ?? {});
  const valueWeek = reactive(options.valueWeek ?? {});
  const valueWork = ref(options.valueWork ?? 1);
  const maxValue = ref(options.maxValue);
  const minValue = ref(options.minValue ?? 0);

  const computeValue = computed(() => {
    const valueArray: any[] = [];
    switch (type.value) {
      case TypeEnum.unset: {
        valueArray.push('?');
        break;
      }
      case TypeEnum.every: {
        valueArray.push('*');
        break;
      }
      case TypeEnum.range: {
        valueArray.push(`${valueRange.start}-${valueRange.end}`);
        break;
      }
      case TypeEnum.loop: {
        valueArray.push(`${valueLoop.start}/${valueLoop.interval}`);
        break;
      }
      case TypeEnum.work: {
        valueArray.push(`${valueWork.value}W`);
        break;
      }
      case TypeEnum.last: {
        valueArray.push('L');
        break;
      }
      case TypeEnum.specify: {
        if (valueList.value.length === 0) {
          valueList.value.push(minValue.value);
        }
        valueArray.push(valueList.value.join(','));
        break;
      }
      default: {
        valueArray.push(defaultValue.value);
        break;
      }
    }
    return valueArray.length > 0 ? valueArray.join('') : defaultValue.value;
  });

  const specifyRange = computed(() => {
    const range: number[] = [];
    if (maxValue.value != null) {
      for (let i = minValue.value; i <= maxValue.value; i += 1) {
        range.push(i);
      }
    }
    return range;
  });

  watch(
    () => props.value,
    (val) => {
      if (val !== computeValue.value) {
        parseValue(val);
      }
    },
    { immediate: true },
  );

  watch(computeValue, (v) => updateValue(v));

  function updateValue(value: string) {
    emit('change', value);
    emit('update:value', value);
  }

  function parseValue(value: string) {
    if (value === computeValue.value) {
      return;
    }
    try {
      if (!value || value === defaultValue.value) {
        type.value = TypeEnum.every;
      } else if (value.includes('?')) {
        type.value = TypeEnum.unset;
      } else if (value.includes('-')) {
        type.value = TypeEnum.range;
        const values = value.split('-');
        if (values.length >= 2) {
          valueRange.start = Number.parseInt(values[0]!, 10);
          valueRange.end = Number.parseInt(values[1]!, 10);
        }
      } else if (value.includes('/')) {
        type.value = TypeEnum.loop;
        const values = value.split('/');
        if (values.length >= 2) {
          valueLoop.start = values[0] === '*' ? 0 : Number.parseInt(values[0]!, 10);
          valueLoop.interval = Number.parseInt(values[1]!, 10);
        }
      } else if (value.includes('W')) {
        type.value = TypeEnum.work;
        const values = value.split('W');
        if (values[0]) {
          valueWork.value = Number.parseInt(values[0], 10);
        }
      } else if (value.includes('L')) {
        type.value = TypeEnum.last;
      } else if (value.includes(',') || !Number.isNaN(Number(value))) {
        type.value = TypeEnum.specify;
        valueList.value = value
          .split(',')
          .map((item) => Number.parseInt(item, 10))
          .filter((item) => !Number.isNaN(item));
      } else {
        type.value = TypeEnum.every;
      }
    } catch {
      type.value = TypeEnum.every;
    }
  }

  const beforeRadioAttrs = computed(() => ({
    class: ['choice'],
    disabled: props.disabled || unref(options.disabled),
  }));
  const inputNumberAttrs = computed(() => ({
    class: ['w60'],
    max: maxValue.value,
    min: minValue.value,
    precision: 0,
  }));
  const typeRangeAttrs = computed(() => ({
    disabled: type.value !== TypeEnum.range || props.disabled || unref(options.disabled),
    ...inputNumberAttrs.value,
  }));
  const typeLoopAttrs = computed(() => ({
    disabled: type.value !== TypeEnum.loop || props.disabled || unref(options.disabled),
    ...inputNumberAttrs.value,
  }));
  const typeSpecifyAttrs = computed(() => ({
    disabled: type.value !== TypeEnum.specify || props.disabled || unref(options.disabled),
    class: ['list-check-item'],
  }));

  return {
    beforeRadioAttrs,
    computeValue,
    defaultValue,
    inputNumberAttrs,
    maxValue,
    minValue,
    parseValue,
    prefixCls,
    specifyRange,
    type,
    TypeEnum,
    typeLoopAttrs,
    typeRangeAttrs,
    typeSpecifyAttrs,
    updateValue,
    valueList,
    valueLoop,
    valueRange,
    valueWeek,
    valueWork,
  };
}
