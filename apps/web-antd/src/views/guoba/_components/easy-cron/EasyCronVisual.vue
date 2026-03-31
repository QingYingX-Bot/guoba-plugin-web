<template>
  <div class="guoba-easy-cron-inner">
    <div class="content">
      <Tabs v-model:activeKey="activeKey" size="small">
        <Tabs.TabPane v-if="!hideSecond" key="second" tab="秒">
          <SecondTab v-model:value="second" :disabled="disabled" />
        </Tabs.TabPane>
        <Tabs.TabPane key="minute" tab="分">
          <MinuteTab v-model:value="minute" :disabled="disabled" />
        </Tabs.TabPane>
        <Tabs.TabPane key="hour" tab="时">
          <HourTab v-model:value="hour" :disabled="disabled" />
        </Tabs.TabPane>
        <Tabs.TabPane key="day" tab="日">
          <DayTab v-model:value="day" :disabled="disabled" :week="week" />
        </Tabs.TabPane>
        <Tabs.TabPane key="month" tab="月">
          <MonthTab v-model:value="month" :disabled="disabled" />
        </Tabs.TabPane>
        <Tabs.TabPane key="week" tab="周">
          <WeekTab v-model:value="week" :day="day" :disabled="disabled" />
        </Tabs.TabPane>
        <Tabs.TabPane v-if="!hideYear && !hideSecond" key="year" tab="年">
          <YearTab v-model:value="year" :disabled="disabled" />
        </Tabs.TabPane>
      </Tabs>

      <Divider />

      <Row :gutter="8">
        <Col :span="18" style="margin-top: 22px">
          <Row :gutter="8">
            <Col v-if="!hideSecond" :span="8" style="margin-bottom: 12px">
              <Input v-model:value="inputValues.second" @blur="onInputBlur">
                <template #addonBefore>
                  <span class="allow-click" @click="activeKey = 'second'">秒</span>
                </template>
              </Input>
            </Col>
            <Col :span="8" style="margin-bottom: 12px">
              <Input v-model:value="inputValues.minute" @blur="onInputBlur">
                <template #addonBefore>
                  <span class="allow-click" @click="activeKey = 'minute'">分</span>
                </template>
              </Input>
            </Col>
            <Col :span="8" style="margin-bottom: 12px">
              <Input v-model:value="inputValues.hour" @blur="onInputBlur">
                <template #addonBefore>
                  <span class="allow-click" @click="activeKey = 'hour'">时</span>
                </template>
              </Input>
            </Col>
            <Col :span="8" style="margin-bottom: 12px">
              <Input v-model:value="inputValues.day" @blur="onInputBlur">
                <template #addonBefore>
                  <span class="allow-click" @click="activeKey = 'day'">日</span>
                </template>
              </Input>
            </Col>
            <Col :span="8" style="margin-bottom: 12px">
              <Input v-model:value="inputValues.month" @blur="onInputBlur">
                <template #addonBefore>
                  <span class="allow-click" @click="activeKey = 'month'">月</span>
                </template>
              </Input>
            </Col>
            <Col :span="8" style="margin-bottom: 12px">
              <Input v-model:value="inputValues.week" @blur="onInputBlur">
                <template #addonBefore>
                  <span class="allow-click" @click="activeKey = 'week'">周</span>
                </template>
              </Input>
            </Col>
            <Col v-if="!hideYear && !hideSecond" :span="8">
              <Input v-model:value="inputValues.year" @blur="onInputBlur">
                <template #addonBefore>
                  <span class="allow-click" @click="activeKey = 'year'">年</span>
                </template>
              </Input>
            </Col>
            <Col :span="!hideYear && !hideSecond ? 16 : 24">
              <Input v-model:value="inputValues.cron" @blur="onInputCronBlur">
                <template #addonBefore>
                  <Tooltip title="Cron表达式">式</Tooltip>
                </template>
              </Input>
            </Col>
          </Row>
        </Col>
        <Col :span="6">
          <div>近十次执行时间（不含年）</div>
          <Input.TextArea :rows="5" :value="previewText" readonly />
        </Col>
      </Row>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, provide, reactive, ref, watch } from 'vue';

import CronParser from 'cron-parser';
import {
  Col,
  Divider,
  Input,
  Row,
  Tabs,
  Tooltip,
} from 'ant-design-vue';

import DayTab from './DayTab.vue';
import HourTab from './HourTab.vue';
import MinuteTab from './MinuteTab.vue';
import MonthTab from './MonthTab.vue';
import SecondTab from './SecondTab.vue';
import WeekTab from './WeekTab.vue';
import YearTab from './YearTab.vue';

const props = withDefaults(defineProps<{
  disabled?: boolean;
  hideSecond?: boolean;
  hideYear?: boolean;
  remote?: (
    cron: string,
    now: number,
    done: (text: string) => void,
  ) => void;
  value?: string;
}>(), {
  disabled: false,
  hideSecond: false,
  hideYear: false,
  remote: undefined,
  value: '',
});

const emit = defineEmits<{
  change: [string];
  'update:value': [string];
}>();

const activeKey = ref(props.hideSecond ? 'minute' : 'second');
const second = ref('*');
const minute = ref('*');
const hour = ref('*');
const day = ref('*');
const month = ref('*');
const week = ref('?');
const year = ref('*');

const inputValues = reactive({
  cron: '',
  day: '',
  hour: '',
  minute: '',
  month: '',
  second: '',
  week: '',
  year: '',
});

const previewText = ref('执行预览，会忽略年份参数。');

provide('prefixCls', 'guoba-easy-cron-inner');

const cronValueInner = computed(() => {
  const result: string[] = [];
  if (!props.hideSecond) {
    result.push(second.value || '*');
  }
  result.push(minute.value || '*');
  result.push(hour.value || '*');
  result.push(day.value || '*');
  result.push(month.value || '*');
  result.push(week.value || '?');
  if (!props.hideYear && !props.hideSecond) {
    result.push(year.value || '*');
  }
  return result.join(' ');
});

const cronValueNoYear = computed(() => {
  const value = cronValueInner.value;
  if (props.hideYear || props.hideSecond) {
    return value;
  }
  const segments = value.split(' ');
  if (segments.length >= 6) {
    segments[5] = convertWeekToQuartz(segments[5]!);
  }
  return segments.slice(0, -1).join(' ');
});

watch(
  () => props.value,
  (newValue) => {
    if ((newValue ?? '') !== cronValueInner.value) {
      formatFromValue(newValue ?? '');
    }
  },
  { immediate: true },
);

watch(cronValueInner, (newValue) => {
  emitValue(newValue);
  assignInput();
  calculatePreview();
});

function assignInput() {
  inputValues.second = second.value;
  inputValues.minute = minute.value;
  inputValues.hour = hour.value;
  inputValues.day = day.value;
  inputValues.month = month.value;
  inputValues.week = week.value;
  inputValues.year = year.value;
  inputValues.cron = cronValueInner.value;
}

function formatFromValue(value: string) {
  if (!value) return;
  const values = value.split(' ').filter(Boolean);
  if (values.length === 0) return;

  let index = 0;
  if (!props.hideSecond) second.value = values[index++] ?? '*';
  minute.value = values[index++] ?? '*';
  hour.value = values[index++] ?? '*';
  day.value = values[index++] ?? '*';
  month.value = values[index++] ?? '*';
  week.value = values[index++] ?? '?';
  if (!props.hideYear && !props.hideSecond) {
    year.value = values[index] ?? '*';
  }
  assignInput();
  calculatePreview();
}

function emitValue(value: string) {
  emit('change', value);
  emit('update:value', value);
}

function onInputBlur() {
  second.value = inputValues.second || '*';
  minute.value = inputValues.minute || '*';
  hour.value = inputValues.hour || '*';
  day.value = inputValues.day || '*';
  month.value = inputValues.month || '*';
  week.value = inputValues.week || '?';
  year.value = inputValues.year || '*';
}

function onInputCronBlur() {
  formatFromValue(inputValues.cron);
  emitValue(inputValues.cron);
}

function convertWeekToQuartz(weekValue: string) {
  const convert = (v: string) => {
    if (v === '0') return '1';
    if (v === '1') return '0';
    return (Number.parseInt(v, 10) - 1).toString();
  };

  const pattern1 = /^([0-7])([-/])([0-7])$/;
  const pattern2 = /^([0-7])(,[0-7])+$/;

  if (/^[0-7]$/.test(weekValue)) {
    return convert(weekValue);
  }
  if (pattern1.test(weekValue)) {
    return weekValue.replace(pattern1, (_raw, before, separator, after) => {
      if (separator === '/') {
        return `${convert(before)}${separator}${after}`;
      }
      return `${convert(before)}${separator}${convert(after)}`;
    });
  }
  if (pattern2.test(weekValue)) {
    return weekValue
      .split(',')
      .map((v) => convert(v))
      .join(',');
  }
  return weekValue;
}

function formatDate(date: Date) {
  const pad = (num: number) => String(num).padStart(2, '0');
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
}

function calculatePreview() {
  if (props.remote) {
    props.remote(cronValueInner.value, Date.now(), (text) => {
      previewText.value = text;
    });
    return;
  }

  try {
    const iter = CronParser.parseExpression(cronValueNoYear.value, {
      currentDate: new Date(),
    });
    const result: string[] = [];
    for (let i = 0; i < 10; i += 1) {
      result.push(formatDate(iter.next().toDate()));
    }
    previewText.value = result.join('\n');
  } catch {
    previewText.value = 'Cron 表达式无效，无法预览执行时间。';
  }
}
</script>

<style scoped>
.guoba-easy-cron-inner :deep(.ant-checkbox-wrapper + .ant-checkbox-wrapper) {
  margin-left: 0;
}

.guoba-easy-cron-inner :deep(.guoba-easy-cron-inner-config-list) {
  margin: 0 10px 10px;
  text-align: left;
}

.guoba-easy-cron-inner :deep(.guoba-easy-cron-inner-config-list .item) {
  font-size: 14px;
  margin-top: 5px;
}

.guoba-easy-cron-inner :deep(.guoba-easy-cron-inner-config-list .item span) {
  padding: 0 2px;
}

.guoba-easy-cron-inner :deep(.guoba-easy-cron-inner-config-list .choice) {
  padding: 5px 8px;
}

.guoba-easy-cron-inner :deep(.guoba-easy-cron-inner-config-list .w60) {
  min-width: 60px;
  width: 60px;
}

.guoba-easy-cron-inner :deep(.guoba-easy-cron-inner-config-list .w80) {
  min-width: 80px;
  width: 80px;
}

.guoba-easy-cron-inner :deep(.guoba-easy-cron-inner-config-list .list) {
  margin: 0 20px;
}

.guoba-easy-cron-inner :deep(.guoba-easy-cron-inner-config-list .list-check-item) {
  padding: 1px 3px;
  width: 4em;
}

.guoba-easy-cron-inner :deep(.guoba-easy-cron-inner-config-list .list-cn .list-check-item) {
  width: 5em;
}

.guoba-easy-cron-inner :deep(.guoba-easy-cron-inner-config-list .tip-info) {
  color: #999;
}

.allow-click {
  cursor: pointer;
}
</style>
