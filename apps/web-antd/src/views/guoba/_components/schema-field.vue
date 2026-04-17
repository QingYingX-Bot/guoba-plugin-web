<script lang="ts" setup>
import type { Recordable } from '@vben/types';

import { computed, h, nextTick, reactive, ref, watch } from 'vue';

import { globalShareState } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';
import {
  Alert,
  Avatar,
  Button,
  Card,
  Checkbox,
  Divider,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  message,
} from 'ant-design-vue';

import { doPluginActionResultApi } from '#/api/guoba/plugin';
import { requestClient } from '#/api/request';
import EasyCronVisual from '#/views/guoba/_components/easy-cron/EasyCronVisual.vue';

const props = defineProps<{
  pluginName?: string;
  model?: Recordable<any>;
  schema: Recordable<any>;
  value: any;
}>();

const emit = defineEmits<{
  'update:value': [value: any];
}>();

interface OicqPageResult<T = Recordable<any>> {
  maxNum?: number;
  pageNum?: number;
  pageSize?: number;
  records?: T[];
  total?: number;
}

const LEGACY_COMPONENT_ALIASES: Record<string, string> = {
  'Input.TextArea': 'InputTextArea',
  InputCountDown: 'Input',
  InputGroup: 'Input',
  InputSearch: 'Input',
  Textarea: 'InputTextArea',
};

const SPECIAL_COMPONENTS = new Set([
  'Alert',
  'ApiTransfer',
  'Checkbox',
  'EasyCron',
  'GButtons',
  'GColorPicker',
  'GSelectFriend',
  'GSelectGroup',
  'GSubForm',
  'GTags',
  'InputPassword',
  'InputTextArea',
  'RadioButtonGroup',
  'Render',
  'StrengthMeter',
  'Switch',
]);

const rawComponent = computed(() => String(props.schema?.component ?? 'Input').trim());

function normalizeLegacyComponent(componentName: string) {
  const current = componentName.trim();
  return LEGACY_COMPONENT_ALIASES[current] || current || 'Input';
}

const component = computed(() => normalizeLegacyComponent(rawComponent.value));
const componentProps = computed<Recordable<any>>(() => {
  return (props.schema?.componentProps as Recordable<any>) ?? {};
});
const adapterComponents = globalShareState.getComponents();

const adapterComponentName = computed(() => {
  switch (component.value) {
    case 'ApiTree': {
      return 'ApiTreeSelect';
    }
    case 'MonthPicker':
    case 'WeekPicker': {
      return 'DatePicker';
    }
    default: {
      return component.value;
    }
  }
});

const dynamicComponent = computed(() => {
  if (SPECIAL_COMPONENTS.has(component.value)) {
    return null;
  }
  return adapterComponents[adapterComponentName.value] ?? null;
});

const helpText = computed(() => {
  return (
    props.schema?.bottomHelpMessage ?? props.schema?.helpMessage ?? props.schema?.help
  );
});

const selectOptions = computed(() => {
  return normalizeOptions(componentProps.value.options);
});

const checkedValue = computed(() => {
  return componentProps.value.checkedValue ?? true;
});

const unCheckedValue = computed(() => {
  return componentProps.value.unCheckedValue ?? false;
});

const switchChecked = computed(() => {
  if (props.value === checkedValue.value) {
    return true;
  }
  if (checkedValue.value === true) {
    return toTrueFlag(props.value);
  }
  return false;
});

const isEasyCron = computed(() => component.value === 'EasyCron');
const isTagComponent = computed(() => component.value === 'GTags');
const isButtonGroup = computed(() => component.value === 'GButtons');
const isCheckboxComponent = computed(() => component.value === 'Checkbox');
const isColorPickerComponent = computed(() => component.value === 'GColorPicker');
const isCompatTransfer = computed(() => component.value === 'ApiTransfer');
const isRenderComponent = computed(() => component.value === 'Render');
const isStrengthMeter = computed(() => rawComponent.value === 'StrengthMeter');
const isRadioButtonGroup = computed(() => component.value === 'RadioButtonGroup');
const isSelectFriend = computed(() => component.value === 'GSelectFriend');
const isSelectGroup = computed(() => component.value === 'GSelectGroup');
const isSelectBiz = computed(() => isSelectFriend.value || isSelectGroup.value);
const isSubForm = computed(() => component.value === 'GSubForm');
const isTextareaComponent = computed(() => component.value === 'InputTextArea');

function toTrueFlag(value: any) {
  return value === true || value === 1 || value === '1' || value === 'true';
}

function isRecord(value: any): value is Recordable<any> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function cloneValue<T>(value: T): T {
  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch {
    return value;
  }
}

function normalizeOptionItem(option: any): Recordable<any> {
  if (!isRecord(option)) {
    return {
      label: String(option ?? ''),
      value: option,
    };
  }

  const next: Recordable<any> = { ...option };
  const label = option.label ?? option.title ?? option.name ?? option.text ?? option.value;
  const value = option.value ?? option.key ?? option.id ?? option.label ?? option.title;

  if (next.label === undefined) {
    next.label = label;
  }
  if (next.value === undefined) {
    next.value = value;
  }

  if (Array.isArray(option.children)) {
    next.children = normalizeOptions(option.children);
  } else if (Array.isArray(option.options)) {
    next.children = normalizeOptions(option.options);
  }

  return next;
}

function normalizeOptions(options: any) {
  if (!Array.isArray(options)) {
    return [];
  }
  return options.map((item) => normalizeOptionItem(item));
}

function getByPath(source: Recordable<any>, path: string) {
  if (!path) {
    return source;
  }
  return path.split('.').reduce<any>((acc, key) => {
    if (acc === null || acc === undefined) {
      return undefined;
    }
    return acc[key];
  }, source);
}

function setByPath(target: Recordable<any>, path: string, value: any) {
  if (!path) {
    return;
  }
  const keys = path.split('.').filter(Boolean);
  if (keys.length === 0) {
    return;
  }

  let current: Recordable<any> = target;
  for (let i = 0; i < keys.length - 1; i += 1) {
    const key = keys[i]!;
    if (!isRecord(current[key])) {
      current[key] = {};
    }
    current = current[key] as Recordable<any>;
  }

  const lastKey = keys[keys.length - 1]!;
  current[lastKey] = value;
}

function getModelFieldValue(path: string) {
  const currentModel = isRecord(props.model) ? props.model : {};
  if (!path) {
    return undefined;
  }
  if (Object.prototype.hasOwnProperty.call(currentModel, path)) {
    return currentModel[path];
  }
  return getByPath(currentModel, path);
}

function stringifyTemplateValue(value: any) {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function resolveTemplateValue(input: any): any {
  if (typeof input === 'string') {
    const exactMatch = input.trim().match(/^#\{([^}]+)\}$/);
    if (exactMatch) {
      return getModelFieldValue(exactMatch[1]!.trim());
    }

    return input.replace(/#\{([^}]+)\}/g, (_full, expression) => {
      const value = getModelFieldValue(String(expression ?? '').trim());
      return stringifyTemplateValue(value);
    });
  }

  if (Array.isArray(input)) {
    return input.map((item) => resolveTemplateValue(item));
  }

  if (isRecord(input)) {
    const output: Recordable<any> = {};
    for (const [key, value] of Object.entries(input)) {
      output[key] = resolveTemplateValue(value);
    }
    return output;
  }

  return input;
}

function isSchemaMarker(schema: Recordable<any>) {
  const current = String(schema?.component ?? '');
  return current === 'Divider' || current === 'SOFT_GROUP_BEGIN';
}

function isEmptyValue(value: any) {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === 'string') {
    return value.trim() === '';
  }
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  return false;
}

function normalizeRuleItems(rules: any): Recordable<any>[] {
  if (!Array.isArray(rules)) {
    return [];
  }
  const result: Recordable<any>[] = [];
  const pushRule = (item: any) => {
    if (!item) {
      return;
    }
    if (Array.isArray(item)) {
      item.forEach(pushRule);
      return;
    }
    if (isRecord(item)) {
      result.push(item);
    }
  };
  rules.forEach(pushRule);
  return result;
}

function validateValueByRules(
  value: any,
  label: string,
  required: boolean,
  rules?: any,
) {
  if (required && isEmptyValue(value)) {
    return `${label}不能为空`;
  }

  const normalizedRules = normalizeRuleItems(rules);
  for (const rule of normalizedRules) {
    if (rule.required && isEmptyValue(value)) {
      return String(rule.message ?? `${label}不能为空`);
    }

    if (
      !isEmptyValue(value)
      && rule.pattern
    ) {
      let pattern: RegExp | null = null;
      if (rule.pattern instanceof RegExp) {
        pattern = rule.pattern;
      } else if (typeof rule.pattern === 'string') {
        try {
          pattern = new RegExp(rule.pattern);
        } catch {
          pattern = null;
        }
      }

      if (pattern && !pattern.test(String(value))) {
        return String(rule.message ?? `${label}格式不正确`);
      }
    }

    if (!isEmptyValue(value) && typeof rule.min === 'number') {
      if (typeof value === 'number') {
        if (value < rule.min) {
          return String(rule.message ?? `${label}不能小于 ${rule.min}`);
        }
      } else if (String(value).length < rule.min) {
        return String(rule.message ?? `${label}长度不能小于 ${rule.min}`);
      }
    }

    if (!isEmptyValue(value) && typeof rule.max === 'number') {
      if (typeof value === 'number') {
        if (value > rule.max) {
          return String(rule.message ?? `${label}不能大于 ${rule.max}`);
        }
      } else if (String(value).length > rule.max) {
        return String(rule.message ?? `${label}长度不能大于 ${rule.max}`);
      }
    }
  }

  return '';
}

function stringifyDisplayValue(value: any, mask = false) {
  if (mask && !isEmptyValue(value)) {
    return '******';
  }

  if (value === null || value === undefined || value === '') {
    return '-';
  }

  if (Array.isArray(value)) {
    return value.length === 0 ? '-' : value.join(', ');
  }

  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  return String(value);
}

function getSchemaCompatValue(...keys: string[]) {
  for (const key of keys) {
    const fromComponentProps = componentProps.value?.[key];
    if (fromComponentProps !== undefined) {
      return fromComponentProps;
    }

    const fromSchema = props.schema?.[key];
    if (fromSchema !== undefined) {
      return fromSchema;
    }
  }
  return undefined;
}

function omitComponentProps(...keys: string[]) {
  const next = { ...componentProps.value };
  keys.forEach((key) => {
    delete next[key];
  });
  return next;
}

const dynamicComponentProps = computed<Recordable<any>>(() => {
  const next = { ...componentProps.value };

  if (component.value === 'DatePicker') {
    const picker = String(next.picker ?? '').trim();
    if (!next.valueFormat) {
      if (picker === 'month') {
        next.valueFormat = 'YYYY-MM';
      } else if (picker === 'quarter') {
        next.valueFormat = 'YYYY-[Q]Q';
      } else if (picker === 'week') {
        next.valueFormat = 'YYYY-wo';
      } else if (picker === 'year') {
        next.valueFormat = 'YYYY';
      } else {
        next.valueFormat = next.showTime ? 'YYYY-MM-DD HH:mm:ss' : 'YYYY-MM-DD';
      }
    }
  }

  if (component.value === 'MonthPicker') {
    next.format = next.format ?? 'YYYY-MM';
    next.picker = 'month';
    next.valueFormat = next.valueFormat ?? next.format;
  }

  if (component.value === 'WeekPicker') {
    next.format = next.format ?? 'YYYY-wo';
    next.picker = 'week';
    next.valueFormat = next.valueFormat ?? next.format;
  }

  if (component.value === 'RangePicker') {
    next.valueFormat =
      next.valueFormat ?? (next.showTime ? 'YYYY-MM-DD HH:mm:ss' : 'YYYY-MM-DD');
  }

  if (component.value === 'TimePicker') {
    next.format = next.format ?? 'HH:mm:ss';
    next.valueFormat = next.valueFormat ?? next.format;
  }

  if (component.value === 'TreeSelect' && next.treeData === undefined) {
    next.treeData = normalizeOptions(next.options);
  }

  return next;
});

const dynamicModelPropName = computed(() => {
  if (adapterComponentName.value === 'Upload') {
    return 'fileList';
  }
  return 'value';
});

const dynamicBindProps = computed<Recordable<any>>(() => {
  return {
    ...dynamicComponentProps.value,
    [dynamicModelPropName.value]: props.value,
  };
});

const dynamicBindEvents = computed<Recordable<any>>(() => {
  return {
    [`update:${dynamicModelPropName.value}`]: update,
  };
});

// -------------------- GButtons / Compat Renderers --------------------
const buttonActionLoadingKey = ref('');
const compatApiLoading = ref(false);
const compatApiOptions = ref<Recordable<any>[]>([]);

const buttonList = computed<Recordable<any>[]>(() => {
  return Array.isArray(componentProps.value.buttons)
    ? componentProps.value.buttons.filter((item) => isRecord(item))
    : [];
});

const buttonSpaceSize = computed(() => {
  const rawValue = Number(componentProps.value.spaceSize ?? 8);
  return Number.isFinite(rawValue) && rawValue > 0 ? rawValue : 8;
});

const compatTransferOptions = computed<Recordable<any>[]>(() => {
  const source = compatApiOptions.value.length > 0
    ? compatApiOptions.value
    : normalizeOptions(componentProps.value.dataSource ?? componentProps.value.options);

  return source.map((item) => {
    const value = item.value ?? item.key ?? item.id ?? item.label;
    const title = item.title ?? item.label ?? item.name ?? value;
    return {
      ...item,
      key: String(item.key ?? value ?? ''),
      title: String(title ?? ''),
      value,
    };
  });
});

const compatTransferSelectOptions = computed<Recordable<any>[]>(() => {
  return compatTransferOptions.value.map((item) => ({
    disabled: item.disabled,
    label: item.title,
    value: item.value,
  }));
});

const colorPickerTextValue = computed(() => {
  return typeof props.value === 'string' ? props.value : '';
});

const colorPickerNativeValue = computed(() => {
  const current = colorPickerTextValue.value.trim();
  return /^#([\da-f]{3}|[\da-f]{6})$/i.test(current) ? current : '#1677ff';
});

const renderPreviewValue = computed(() => {
  const renderValue =
    componentProps.value.render
    ?? props.schema?.render
    ?? componentProps.value.content
    ?? componentProps.value.text
    ?? helpText.value
    ?? '';

  if (typeof renderValue === 'function') {
    try {
      return renderValue({
        model: props.model ?? {},
        schema: props.schema,
        update,
        value: props.value,
      });
    } catch (error) {
      return `Render 执行失败：${(error as Error)?.message ?? error}`;
    }
  }

  return resolveTemplateValue(renderValue);
});

const strengthScore = computed(() => {
  const value = String(props.value ?? '');
  if (!value) {
    return 0;
  }

  let score = 0;
  if (value.length >= 8) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;
  return Math.min(score, 4);
});

const strengthPercent = computed(() => strengthScore.value * 25);
const strengthLabel = computed(() => {
  switch (strengthScore.value) {
    case 4:
      return '很强';
    case 3:
      return '较强';
    case 2:
      return '中等';
    case 1:
      return '较弱';
    default:
      return '未填写';
  }
});

const strengthColor = computed(() => {
  if (strengthScore.value >= 4) {
    return '#16a34a';
  }
  if (strengthScore.value >= 3) {
    return '#22c55e';
  }
  if (strengthScore.value >= 2) {
    return '#f59e0b';
  }
  if (strengthScore.value >= 1) {
    return '#ef4444';
  }
  return '#cbd5e1';
});

async function loadCompatApiOptions() {
  if (!isCompatTransfer.value) {
    compatApiOptions.value = [];
    return;
  }

  const api = componentProps.value.api;
  if (typeof api !== 'function') {
    compatApiOptions.value = [];
    return;
  }

  compatApiLoading.value = true;
  try {
    const params = isRecord(componentProps.value.params)
      ? cloneValue(componentProps.value.params)
      : {};
    const beforeFetch = componentProps.value.beforeFetch;
    const shouldFetch = componentProps.value.shouldFetch;
    const afterFetch = componentProps.value.afterFetch;
    const resultField = String(componentProps.value.resultField ?? '').trim();

    let finalParams = params;
    if (typeof beforeFetch === 'function') {
      finalParams = (await beforeFetch(finalParams)) ?? finalParams;
    }
    if (typeof shouldFetch === 'function') {
      const canFetch = await shouldFetch(finalParams);
      if (!canFetch) {
        compatApiOptions.value = [];
        return;
      }
    }

    let result = await api(finalParams);
    if (typeof afterFetch === 'function') {
      result = (await afterFetch(result)) ?? result;
    }

    let rawOptions: any = [];
    if (Array.isArray(result)) {
      rawOptions = result;
    } else if (resultField && isRecord(result)) {
      rawOptions = getByPath(result, resultField);
    } else if (Array.isArray(result?.result)) {
      rawOptions = result.result;
    }

    compatApiOptions.value = normalizeOptions(rawOptions);
  } catch {
    compatApiOptions.value = [];
  } finally {
    compatApiLoading.value = false;
  }
}

function getButtonActionKey(button: Recordable<any>, index: number) {
  return `${String(button.action ?? button.label ?? 'button')}-${index}`;
}

function getButtonIcon(button: Recordable<any>) {
  const icon = String(button.icon ?? '').trim();
  if (!icon) {
    return undefined;
  }
  return h(IconifyIcon, { icon });
}

function getButtonTooltip(button: Recordable<any>) {
  if (!isRecord(button.tooltip)) {
    return null;
  }
  const title = resolveTemplateValue(button.tooltip.title ?? button.tooltip.content ?? '');
  if (!title) {
    return null;
  }
  return {
    placement: button.tooltip.placement,
    title: String(title),
  };
}

async function executeButtonAction(button: Recordable<any>, index: number) {
  const pluginName = String(props.pluginName ?? '').trim();
  if (!pluginName) {
    message.warning('当前页面没有插件上下文，暂时无法执行该按钮动作');
    return;
  }

  const action = String(button.action ?? '').trim();
  if (!action) {
    message.warning('该按钮没有配置 action');
    return;
  }

  const buttonKey = getButtonActionKey(button, index);
  buttonActionLoadingKey.value = buttonKey;
  try {
    const response = await doPluginActionResultApi(
      pluginName,
      action,
      resolveTemplateValue(button.args ?? []),
    );
    message.success(String(response.message ?? '执行成功'));
  } finally {
    buttonActionLoadingKey.value = '';
  }
}

async function onClickButtonAction(button: Recordable<any>, index: number) {
  if (!isRecord(button.confirm)) {
    await executeButtonAction(button, index);
    return;
  }

  Modal.confirm({
    cancelText: String(resolveTemplateValue(button.confirm.cancelText ?? '取消')),
    content: String(resolveTemplateValue(button.confirm.content ?? '确定继续执行吗？')),
    okText: String(resolveTemplateValue(button.confirm.okText ?? '确定')),
    title: String(resolveTemplateValue(button.confirm.title ?? '提示')),
    onOk: () => executeButtonAction(button, index),
  });
}

function updateCheckbox(checked: boolean) {
  emit('update:value', checked ? checkedValue.value : unCheckedValue.value);
}

function updateColorValue(value?: string) {
  emit('update:value', String(value ?? '').trim());
}

function updateNativeColor(event: Event) {
  const value = (event.target as HTMLInputElement | null)?.value ?? '';
  updateColorValue(value);
}

watch(
  () => [component.value, componentProps.value],
  () => {
    loadCompatApiOptions();
  },
  { deep: true, immediate: true },
);

// -------------------- EasyCron --------------------
const cronMultiple = computed(() => {
  return toTrueFlag(componentProps.value.multiple);
});

const cronAllowAdd = computed(() => {
  const raw = componentProps.value.allowAdd;
  if (raw === undefined || raw === null) {
    return cronMultiple.value;
  }
  return toTrueFlag(raw);
});

const cronInputProps = computed<Recordable<any>>(() => {
  const next = { ...componentProps.value };
  if (typeof next.disabled !== 'boolean') {
    delete next.disabled;
  }
  delete next.allowAdd;
  delete next.multiple;
  delete next.hideSecond;
  delete next.hideYear;
  delete next.remote;
  return next;
});

const cronPickerOpen = ref(false);
const cronPickerRowIndex = ref(0);
const cronPickerValue = ref('');

const cronDisabled = computed(() => {
  return componentProps.value.disabled === true;
});
const cronHideSecond = computed(() => toTrueFlag(componentProps.value.hideSecond));
const cronHideYear = computed(() => toTrueFlag(componentProps.value.hideYear));
const cronRemote = computed(() => {
  const remote = componentProps.value.remote;
  return typeof remote === 'function' ? remote : undefined;
});

const cronRows = computed(() => {
  const values = Array.isArray(props.value)
    ? props.value.map((item) => String(item ?? ''))
    : props.value === null || props.value === undefined || props.value === ''
      ? []
      : [String(props.value)];

  if (!cronMultiple.value) {
    return [values[0] ?? ''];
  }
  return values.length > 0 ? values : [''];
});

function updateCronRows(values: string[]) {
  if (cronMultiple.value) {
    emit('update:value', values);
    return;
  }
  emit('update:value', values[0] ?? '');
}

function updateCronRow(index: number, value?: string) {
  const next = [...cronRows.value];
  next[index] = value ?? '';
  updateCronRows(next);
}

function addCronRow() {
  if (!cronAllowAdd.value) {
    return;
  }
  updateCronRows([...cronRows.value, '']);
}

function removeCronRow(index: number) {
  if (!cronAllowAdd.value) {
    return;
  }
  const next = [...cronRows.value];
  next.splice(index, 1);
  updateCronRows(next.length > 0 ? next : ['']);
}

function openCronPicker(index: number) {
  cronPickerRowIndex.value = index;
  cronPickerValue.value = cronRows.value[index] ?? '';
  cronPickerOpen.value = true;
}

function applyCronPicker() {
  const next = [...cronRows.value];
  next[cronPickerRowIndex.value] = cronPickerValue.value ?? '';
  updateCronRows(next);
  cronPickerOpen.value = false;
}

// -------------------- GTags --------------------
const tagInputVisible = ref(false);
const tagInputValue = ref('');
const tagInputRef = ref<any>(null);

const tagValues = computed<string[]>(() => {
  if (Array.isArray(props.value)) {
    return props.value.map((item) => String(item ?? ''));
  }
  if (props.value === null || props.value === undefined || props.value === '') {
    return [];
  }
  return [String(props.value)];
});

const tagAllowAdd = computed(() => {
  const raw = componentProps.value.allowAdd;
  if (raw === undefined || raw === null) {
    return true;
  }
  return toTrueFlag(raw);
});
const tagAllowDel = computed(() => {
  const raw = componentProps.value.allowDel;
  if (raw === undefined || raw === null) {
    return true;
  }
  return toTrueFlag(raw);
});
const tagShowPrompt = computed(() => toTrueFlag(componentProps.value.showPrompt));
const tagPromptProps = computed<Recordable<any>>(() => {
  return isRecord(componentProps.value.promptProps) ? componentProps.value.promptProps : {};
});

function formatTagValue(rawValue: any) {
  let value = String(rawValue ?? '').trim();
  if (!value) {
    return '';
  }

  const formatter = componentProps.value.valueFormatter;
  if (!formatter) {
    return value;
  }

  try {
    if (typeof formatter === 'function') {
      const next = formatter(value);
      value = next === undefined || next === null ? '' : String(next).trim();
    } else if (typeof formatter === 'string') {
      let formatterFn: ((val: any) => any) | null = null;
      try {
        formatterFn = new Function(`return (${formatter});`)() as (val: any) => any;
      } catch {
        formatterFn = null;
      }
      if (typeof formatterFn === 'function') {
        const next = formatterFn(value);
        value = next === undefined || next === null ? '' : String(next).trim();
      } else {
        const next = new Function('value', `return (${formatter});`)(value);
        value = next === undefined || next === null ? '' : String(next).trim();
      }
    }
  } catch {
    return String(rawValue ?? '').trim();
  }

  return value;
}

function emitTagValues(values: string[]) {
  emit('update:value', values);
}

function addTagValue(rawValue: any) {
  if (!tagAllowAdd.value) {
    return;
  }

  const value = formatTagValue(rawValue);
  if (!value) {
    return;
  }

  const rules = normalizeRuleItems(tagPromptProps.value.rules);
  if (rules.length > 0) {
    const error = validateValueByRules(
      value,
      String(props.schema?.label ?? props.schema?.field ?? '输入项'),
      false,
      rules,
    );
    if (error) {
      message.warning(error);
      return;
    }
  }

  if (tagValues.value.includes(value)) {
    return;
  }

  emitTagValues([...tagValues.value, value]);
}

function removeTagValue(removedTag: string) {
  if (!tagAllowDel.value) {
    return;
  }
  emitTagValues(tagValues.value.filter((tag) => tag !== removedTag));
}

function showTagInput() {
  if (!tagAllowAdd.value) {
    return;
  }

  if (tagShowPrompt.value) {
    let currentValue = '';
    const promptTitle = String(
      tagPromptProps.value.title
      ?? tagPromptProps.value.content
      ?? '添加',
    );
    const promptPlaceholder = String(
      tagPromptProps.value.placeholder
      ?? componentProps.value.placeholder
      ?? '请输入内容',
    );

    Modal.confirm({
      title: promptTitle,
      content: h(Input, {
        autofocus: true,
        placeholder: promptPlaceholder,
        'onUpdate:value': (value: string) => {
          currentValue = String(value ?? '');
        },
        onPressEnter: () => {
          addTagValue(currentValue);
        },
      }),
      okText: String(tagPromptProps.value.okText ?? '添加'),
      async onOk() {
        const value = currentValue.trim();
        if (!value) {
          message.warning('请输入内容');
          return Promise.reject(new Error('missing value'));
        }

        const error = validateValueByRules(
          value,
          String(props.schema?.label ?? props.schema?.field ?? '输入项'),
          false,
          tagPromptProps.value.rules,
        );
        if (error) {
          message.warning(error);
          return Promise.reject(new Error(error));
        }

        addTagValue(value);
      },
    });
    return;
  }

  tagInputVisible.value = true;
  nextTick(() => {
    tagInputRef.value?.focus?.();
  });
}

function confirmTagInput() {
  addTagValue(tagInputValue.value);
  tagInputValue.value = '';
  tagInputVisible.value = false;
}

// -------------------- GSelectFriend / GSelectGroup --------------------
const selectBizOpen = ref(false);
const selectBizTableLoading = ref(false);
const selectBizRecords = ref<Recordable<any>[]>([]);
const selectBizTotal = ref(0);

const selectBizPage = reactive({
  current: 1,
  pageSize: 10,
});

const selectBizFilters = reactive({
  id: '',
  name: '',
});

const selectBizSelectedRowKeys = ref<Array<number | string>>([]);
const selectBizSelectedRows = ref<Recordable<any>[]>([]);
const selectBizOptionMap = ref<Record<string, { label: string; value: number | string }>>({});

const selectBizRowKey = computed(() => {
  if (componentProps.value.rowKey) {
    return String(componentProps.value.rowKey);
  }
  return isSelectGroup.value ? 'group_id' : 'user_id';
});

const selectBizLabelKey = computed(() => {
  if (componentProps.value.labelKey) {
    return String(componentProps.value.labelKey);
  }
  return isSelectGroup.value ? 'group_name' : 'nickname';
});

const selectBizEndpoint = computed(() => {
  return isSelectGroup.value ? '/oicq/group/list' : '/oicq/friend/list';
});

const selectBizIdQueryField = computed(() => {
  return isSelectGroup.value ? 'query_group_id' : 'query_qq';
});

const selectBizIdFilterField = computed(() => {
  return isSelectGroup.value ? 'group_id' : 'user_id';
});

const selectBizModalTitle = computed(() => {
  return isSelectGroup.value ? '选择群聊' : '选择好友';
});

const selectBizSelectOptions = computed(() => {
  return Object.values(selectBizOptionMap.value);
});

const selectBizPagination = computed(() => {
  return {
    current: selectBizPage.current,
    pageSize: selectBizPage.pageSize,
    showQuickJumper: true,
    showSizeChanger: true,
    pageSizeOptions: ['10', '50', '80', '100'],
    showTotal: (total: number) => `共 ${total} 条`,
    total: selectBizTotal.value,
  };
});

const selectBizColumns = computed(() => {
  if (isSelectGroup.value) {
    return [
      { key: 'avatar', title: '头像', width: 72 },
      { dataIndex: 'group_id', key: 'group_id', title: '群号', width: 150 },
      { dataIndex: 'group_name', key: 'group_name', title: '群名' },
    ];
  }

  return [
    { key: 'avatar', title: '头像', width: 72 },
    { dataIndex: 'user_id', key: 'user_id', title: 'QQ号', width: 150 },
    { dataIndex: 'nickname', key: 'nickname', title: '昵称' },
  ];
});

const selectBizRowSelection = computed(() => {
  return {
    preserveSelectedRowKeys: true,
    selectedRowKeys: selectBizSelectedRowKeys.value,
    onChange: (keys: (number | string)[]) => {
      onSelectBizChange(keys);
    },
  };
});

function toKeyString(value: any) {
  return String(value ?? '');
}

function normalizeSelectBizValues(value: any): Array<number | string> {
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== null && item !== undefined && item !== '')
      .map((item) => (typeof item === 'number' ? item : String(item)));
  }
  if (value === null || value === undefined || value === '') {
    return [];
  }
  return [typeof value === 'number' ? value : String(value)];
}

function buildBizOptionFromRecord(record: Recordable<any>) {
  const id = record?.[selectBizRowKey.value];
  const label = record?.[selectBizLabelKey.value];
  return {
    label: String(label ?? id ?? ''),
    value: id as number | string,
  };
}

function getSelectBizRecordKey(record: Recordable<any>) {
  return record?.[selectBizRowKey.value];
}

function getSelectBizAvatar(record: Recordable<any>) {
  const id = record?.[selectBizRowKey.value];
  if (!id && id !== 0) {
    return '';
  }
  if (isSelectGroup.value) {
    return `https://p.qlogo.cn/gh/${id}/${id}/100`;
  }
  return `https://q1.qlogo.cn/g?b=qq&s=100&nk=${id}`;
}

function syncSelectBizOptionMap(values: Array<number | string>) {
  const next: Record<string, { label: string; value: number | string }> = {
    ...selectBizOptionMap.value,
  };

  values.forEach((item) => {
    const key = toKeyString(item);
    if (!next[key]) {
      next[key] = {
        label: key,
        value: item,
      };
    }
  });

  selectBizSelectedRows.value.forEach((row) => {
    const option = buildBizOptionFromRecord(row);
    const key = toKeyString(option.value);
    next[key] = option;
  });

  selectBizOptionMap.value = next;
}

function mergeRowsByKeys(keys: Array<number | string>) {
  const existedMap = new Map<string, Recordable<any>>();
  selectBizSelectedRows.value.forEach((row) => {
    existedMap.set(toKeyString(getSelectBizRecordKey(row)), row);
  });
  selectBizRecords.value.forEach((row) => {
    existedMap.set(toKeyString(getSelectBizRecordKey(row)), row);
  });

  const nextRows = keys.map((key) => {
    const row = existedMap.get(toKeyString(key));
    if (row) {
      return row;
    }
    return {
      [selectBizRowKey.value]: key,
      [selectBizLabelKey.value]: key,
    };
  });

  selectBizSelectedRows.value = nextRows;
  syncSelectBizOptionMap(keys);
}

async function fetchSelectBizList(params: Recordable<any> = {}) {
  return requestClient.get<OicqPageResult>(selectBizEndpoint.value, {
    params,
  });
}

async function loadSelectBizTableData() {
  if (!isSelectBiz.value) {
    return;
  }

  selectBizTableLoading.value = true;
  try {
    const params: Recordable<any> = {
      pageNo: selectBizPage.current,
      pageSize: selectBizPage.pageSize,
    };

    if (selectBizFilters.id.trim()) {
      params[selectBizIdQueryField.value] = selectBizFilters.id.trim();
    }
    if (selectBizFilters.name.trim()) {
      params.query_name = selectBizFilters.name.trim();
    }

    const result = await fetchSelectBizList(params);
    selectBizRecords.value = Array.isArray(result?.records) ? result.records : [];
    selectBizTotal.value = Number(result?.total ?? 0);

    mergeRowsByKeys(selectBizSelectedRowKeys.value);
  } catch {
    selectBizRecords.value = [];
    selectBizTotal.value = 0;
  } finally {
    selectBizTableLoading.value = false;
  }
}

async function loadSelectBizEcho(values: Array<number | string>) {
  if (!isSelectBiz.value || values.length === 0) {
    return;
  }

  try {
    const params: Recordable<any> = {
      pageNo: 1,
      pageSize: values.length,
    };
    params[selectBizIdFilterField.value] = values.join(',');

    const result = await fetchSelectBizList(params);
    const records = Array.isArray(result?.records) ? result.records : [];

    selectBizSelectedRows.value = values.map((key) => {
      return records.find((item) => {
        return toKeyString(item?.[selectBizRowKey.value]) === toKeyString(key);
      }) ?? {
        [selectBizRowKey.value]: key,
        [selectBizLabelKey.value]: key,
      };
    });

    syncSelectBizOptionMap(values);
  } catch {
    syncSelectBizOptionMap(values);
  }
}

function openSelectBizModal() {
  selectBizOpen.value = true;
  loadSelectBizTableData();
}

function onSelectBizSearch() {
  selectBizPage.current = 1;
  loadSelectBizTableData();
}

function onSelectBizResetSearch() {
  selectBizFilters.id = '';
  selectBizFilters.name = '';
  selectBizPage.current = 1;
  loadSelectBizTableData();
}

function onSelectBizTableChange(pagination: Recordable<any>) {
  const current = Number(pagination?.current ?? 1);
  const pageSize = Number(pagination?.pageSize ?? selectBizPage.pageSize);
  if (current !== selectBizPage.current) {
    selectBizPage.current = current;
  }
  if (pageSize !== selectBizPage.pageSize) {
    selectBizPage.pageSize = pageSize;
    selectBizPage.current = 1;
  }
  loadSelectBizTableData();
}

function onSelectBizChange(keys: (number | string)[]) {
  selectBizSelectedRowKeys.value = keys.map((item) => {
    return typeof item === 'number' ? item : String(item);
  });
  mergeRowsByKeys(selectBizSelectedRowKeys.value);
}

function applySelectBizSelection() {
  emit('update:value', [...selectBizSelectedRowKeys.value]);
  selectBizOpen.value = false;
}

function updateSelectBizValue(value?: any) {
  const rawValues = Array.isArray(value)
    ? value
    : value === null || value === undefined || value === ''
      ? []
      : [value];
  const next = rawValues.map((item) => {
    return typeof item === 'number' ? item : String(item);
  });
  selectBizSelectedRowKeys.value = next;
  mergeRowsByKeys(next);
  emit('update:value', next);
}

watch(
  () => props.value,
  (value) => {
    if (!isSelectBiz.value) {
      return;
    }

    const values = normalizeSelectBizValues(value);
    selectBizSelectedRowKeys.value = values;

    if (values.length === 0) {
      selectBizSelectedRows.value = [];
      selectBizOptionMap.value = {};
      return;
    }

    syncSelectBizOptionMap(values);
    loadSelectBizEcho(values);
  },
  { deep: true, immediate: true },
);

// -------------------- GSubForm --------------------
const subFormListOpen = ref(false);
const subFormEditorOpen = ref(false);
const subFormEditorIndex = ref(-1);
const subFormListDraft = ref<Recordable<any>[]>([]);
const subFormEditorModel = ref<Recordable<any>>({});

const subFormMultiple = computed(() => {
  const raw = getSchemaCompatValue('multiple');
  if (raw === 'multiple') {
    return true;
  }
  return toTrueFlag(raw);
});
const subFormAlwaysArray = computed(() => {
  return toTrueFlag(getSchemaCompatValue('alwaysArray')) || subFormMultiple.value;
});
const subFormSchemas = computed<Recordable<any>[]>(() => {
  const schemas = getSchemaCompatValue('schemas');
  if (Array.isArray(schemas)) {
    return schemas;
  }

  const schema = getSchemaCompatValue('schema');
  if (Array.isArray(schema)) {
    return schema;
  }

  return [];
});

const subFormModalProps = computed<Recordable<any>>(() => {
  const modalProps = getSchemaCompatValue('modalProps');
  return isRecord(modalProps)
    ? modalProps
    : {};
});

const subFormListModalProps = computed<Recordable<any>>(() => {
  const listModalProps = getSchemaCompatValue('listModalProps');
  return isRecord(listModalProps)
    ? listModalProps
    : {};
});

const subFormNormalizedList = computed(() => {
  const value = props.value;

  if (Array.isArray(value)) {
    return value.map((item) => {
      return isRecord(item) ? cloneValue(item) : {};
    });
  }

  if (isRecord(value)) {
    return [cloneValue(value)];
  }

  if (subFormAlwaysArray.value) {
    return [];
  }

  return [{}];
});

const subFormSingleValue = computed(() => {
  return subFormNormalizedList.value[0] ?? {};
});

const subFormDisplayText = computed(() => {
  if (!subFormMultiple.value) {
    return '';
  }
  return `已配置 ${subFormNormalizedList.value.length} 项`;
});

const subFormListTitle = computed(() => {
  return String(
    subFormListModalProps.value.title
    ?? subFormModalProps.value.title
    ?? '填写列表',
  );
});

const subFormEditorTitle = computed(() => {
  if (subFormEditorIndex.value >= 0) {
    return String(subFormModalProps.value.title ?? `编辑第 ${subFormEditorIndex.value + 1} 项`);
  }
  return String(subFormModalProps.value.title ?? '新增配置');
});

function getSubFormFieldValue(fieldPath: string) {
  return getByPath(subFormEditorModel.value ?? {}, fieldPath);
}

function setSubFormFieldValue(fieldPath: string, value: any) {
  if (!isRecord(subFormEditorModel.value)) {
    subFormEditorModel.value = {};
  }
  setByPath(subFormEditorModel.value, fieldPath, value);
}

function validateSubFormModel(values: Recordable<any>) {
  for (const schema of subFormSchemas.value) {
    if (isSchemaMarker(schema)) {
      continue;
    }

    const fieldPath = String(schema.field ?? '').trim();
    if (!fieldPath) {
      continue;
    }

    const label = String(schema.label ?? fieldPath);
    const fieldValue = getByPath(values, fieldPath);
    const error = validateValueByRules(
      fieldValue,
      label,
      Boolean(schema.required),
      schema.rules,
    );

    if (error) {
      message.warning(error);
      return false;
    }
  }

  return true;
}

function emitSubFormList(list: Recordable<any>[]) {
  if (subFormAlwaysArray.value) {
    emit('update:value', list);
    return;
  }
  emit('update:value', list[0] ?? {});
}

function openSubFormList() {
  subFormListDraft.value = cloneValue(subFormNormalizedList.value);
  subFormListOpen.value = true;
}

function openSubFormSingleEditor() {
  subFormEditorIndex.value = 0;
  subFormEditorModel.value = cloneValue(subFormSingleValue.value);
  subFormEditorOpen.value = true;
}

function openSubFormEditor(index: number) {
  subFormEditorIndex.value = index;
  subFormEditorModel.value =
    index >= 0
      ? cloneValue(subFormListDraft.value[index] ?? {})
      : {};
  subFormEditorOpen.value = true;
}

function removeSubFormItem(index: number) {
  subFormListDraft.value.splice(index, 1);
}

function confirmSubFormEditor() {
  const values = cloneValue(subFormEditorModel.value ?? {});
  if (!validateSubFormModel(values)) {
    return Promise.reject(new Error('sub form invalid'));
  }

  if (subFormMultiple.value) {
    if (subFormEditorIndex.value >= 0) {
      subFormListDraft.value[subFormEditorIndex.value] = values;
    } else {
      subFormListDraft.value.push(values);
    }
  } else {
    const outputList = [values];
    emitSubFormList(outputList);
  }

  subFormEditorOpen.value = false;
  return Promise.resolve();
}

function applySubFormList() {
  emitSubFormList(cloneValue(subFormListDraft.value));
  subFormListOpen.value = false;
}

function getSubFormSummaryRows(models: Recordable<any>) {
  return subFormSchemas.value
    .filter((schema) => !isSchemaMarker(schema))
    .map((schema) => {
      const fieldPath = String(schema.field ?? '').trim();
      const label = String(schema.label ?? fieldPath);
      const value = fieldPath ? getByPath(models, fieldPath) : '';
      return {
        component: String(schema.component ?? ''),
        label,
        value,
      };
    })
    .slice(0, 6);
}

// -------------------- Common --------------------
const inputLikeValue = computed(() => {
  if (props.value === null || props.value === undefined) {
    return '';
  }
  if (typeof props.value === 'object') {
    try {
      return JSON.stringify(props.value);
    } catch {
      return String(props.value);
    }
  }
  return String(props.value);
});

function update(value: any) {
  emit('update:value', value);
}

function updateSwitch(checked: boolean | number | string) {
  const isChecked = Boolean(checked);
  emit('update:value', isChecked ? checkedValue.value : unCheckedValue.value);
}

function updateInput(value?: string) {
  emit('update:value', value ?? '');
}

function updateInputNumber(value?: null | number | string) {
  if (value === undefined || value === null || value === '') {
    emit('update:value', null);
    return;
  }
  emit('update:value', Number(value));
}
</script>

<template>
  <Form.Item
    :label="schema?.label || schema?.field"
    :required="Boolean(schema?.required)"
  >
    <Switch
      v-if="component === 'Switch'"
      :checked="switchChecked"
      @update:checked="updateSwitch"
    />

    <div v-else-if="isEasyCron" class="easy-cron-list">
      <div
        v-for="(item, index) in cronRows"
        :key="`cron-${index}`"
        class="easy-cron-row"
      >
        <Input
          class="easy-cron-input"
          v-bind="cronInputProps"
          :value="item"
          :placeholder="componentProps.placeholder ?? '请输入 cron 表达式'"
          @update:value="updateCronRow(index, $event)"
        />
        <Button @click="openCronPicker(index)">可视化</Button>
        <Button
          v-if="cronMultiple && cronAllowAdd && cronRows.length > 1"
          danger
          @click="removeCronRow(index)"
        >
          删除
        </Button>
      </div>

      <Button
        v-if="cronMultiple && cronAllowAdd"
        type="dashed"
        @click="addCronRow"
      >
        新增 cron
      </Button>

      <Modal
        v-model:open="cronPickerOpen"
        title="可视化配置 Cron"
        :width="980"
        @ok="applyCronPicker"
      >
        <EasyCronVisual
          v-model:value="cronPickerValue"
          :disabled="cronDisabled"
          :hideSecond="cronHideSecond"
          :hideYear="cronHideYear"
          :remote="cronRemote"
        />
      </Modal>
    </div>

    <div v-else-if="isTagComponent" class="tag-editor">
      <template v-for="tag in tagValues" :key="`tag-${tag}`">
        <Tag
          :closable="tagAllowDel"
          @close.prevent="removeTagValue(tag)"
        >
          {{ tag }}
        </Tag>
      </template>

      <Input
        v-if="tagInputVisible"
        ref="tagInputRef"
        v-model:value="tagInputValue"
        class="tag-editor-input"
        size="small"
        @blur="confirmTagInput"
        @pressEnter="confirmTagInput"
      />

      <Tag
        v-if="tagAllowAdd && !tagInputVisible"
        class="tag-add-trigger"
        @click="showTagInput"
      >
        + 新增
      </Tag>
    </div>

    <div v-else-if="isSelectBiz" class="select-biz-wrap">
      <Space.Compact block>
        <Select
          style="width: 100%"
          :placeholder="componentProps.placeholder ?? '请选择'"
          mode="multiple"
          :open="false"
          :value="selectBizSelectedRowKeys"
          :options="selectBizSelectOptions"
          @click="openSelectBizModal"
          @update:value="updateSelectBizValue"
        />
        <Button @click="openSelectBizModal">选择</Button>
      </Space.Compact>

      <Modal
        v-model:open="selectBizOpen"
        :title="selectBizModalTitle"
        :width="980"
        wrap-class-name="select-biz-modal"
        @ok="applySelectBizSelection"
      >
        <div class="select-biz-toolbar">
          <Input
            v-model:value="selectBizFilters.id"
            class="select-biz-filter"
            :placeholder="isSelectGroup ? '按群号筛选' : '按QQ号筛选'"
            @pressEnter="onSelectBizSearch"
          />
          <Input
            v-model:value="selectBizFilters.name"
            class="select-biz-filter"
            :placeholder="isSelectGroup ? '按群名筛选' : '按昵称筛选'"
            @pressEnter="onSelectBizSearch"
          />
          <Space class="select-biz-toolbar-actions" wrap>
            <Button type="primary" @click="onSelectBizSearch">查询</Button>
            <Button @click="onSelectBizResetSearch">重置</Button>
          </Space>
        </div>

        <Table
          class="select-biz-table"
          size="small"
          :loading="selectBizTableLoading"
          :columns="selectBizColumns"
          :data-source="selectBizRecords"
          :pagination="selectBizPagination"
          :row-selection="selectBizRowSelection"
          :row-key="getSelectBizRecordKey"
          @change="onSelectBizTableChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'avatar'">
              <Avatar :size="30" :src="getSelectBizAvatar(record)" />
            </template>
          </template>

          <template #emptyText>
            <Empty description="暂无数据" />
          </template>
        </Table>
      </Modal>
    </div>

    <div v-else-if="isSubForm" class="sub-form-wrap">
      <div
        v-if="subFormMultiple"
        class="sub-form-multiple-trigger"
        @click="openSubFormList"
      >
        <Input :value="subFormDisplayText" readonly />
      </div>

      <div
        v-else
        class="sub-form-single-trigger"
        @click="openSubFormSingleEditor"
      >
        <Card size="small">
          <template v-if="getSubFormSummaryRows(subFormSingleValue).length > 0">
            <div
              v-for="item in getSubFormSummaryRows(subFormSingleValue)"
              :key="`single-${item.label}`"
              class="sub-form-summary-item"
            >
              <span class="sub-form-summary-label">{{ item.label }}：</span>
              <span class="sub-form-summary-value">
                {{ stringifyDisplayValue(item.value, item.component === 'InputPassword') }}
              </span>
            </div>
          </template>
          <span v-else class="sub-form-empty">点击填写子表单</span>
        </Card>
      </div>

      <Modal
        v-model:open="subFormListOpen"
        :title="subFormListTitle"
        :width="Number(subFormListModalProps.width ?? 860)"
        @ok="applySubFormList"
      >
        <Space direction="vertical" style="width: 100%">
          <Empty
            v-if="subFormListDraft.length === 0"
            description="暂无数据，请点击新增"
          />

          <Card
            v-for="(item, index) in subFormListDraft"
            :key="`sub-list-${index}`"
            size="small"
          >
            <div class="sub-form-card-header">
              <span>第 {{ index + 1 }} 项</span>
              <Space>
                <Button size="small" @click="openSubFormEditor(index)">编辑</Button>
                <Button danger size="small" @click="removeSubFormItem(index)">删除</Button>
              </Space>
            </div>
            <div
              v-for="summary in getSubFormSummaryRows(item)"
              :key="`summary-${index}-${summary.label}`"
              class="sub-form-summary-item"
            >
              <span class="sub-form-summary-label">{{ summary.label }}：</span>
              <span class="sub-form-summary-value">
                {{ stringifyDisplayValue(summary.value, summary.component === 'InputPassword') }}
              </span>
            </div>
          </Card>

          <Button type="dashed" block @click="openSubFormEditor(-1)">新增</Button>
        </Space>
      </Modal>

      <Modal
        v-model:open="subFormEditorOpen"
        :title="subFormEditorTitle"
        :width="Number(subFormModalProps.width ?? 760)"
        @ok="confirmSubFormEditor"
      >
        <Form layout="vertical">
          <template
            v-for="schemaItem in subFormSchemas"
            :key="`sub-schema-${schemaItem.field || schemaItem.label}`"
          >
            <Divider v-if="isSchemaMarker(schemaItem)">
              {{ schemaItem.label || schemaItem.field || '分组' }}
            </Divider>
            <SchemaField
              v-else
              :model="subFormEditorModel"
              :pluginName="props.pluginName"
              :schema="schemaItem"
              :value="getSubFormFieldValue(String(schemaItem.field ?? ''))"
              @update:value="setSubFormFieldValue(String(schemaItem.field ?? ''), $event)"
            />
          </template>
        </Form>
      </Modal>
    </div>

    <InputNumber
      v-else-if="component === 'InputNumber'"
      style="width: 100%"
      v-bind="componentProps"
      :value="value"
      @update:value="updateInputNumber"
    />

    <Alert
      v-else-if="component === 'Alert'"
      v-bind="componentProps"
      :message="componentProps.message ?? schema?.label ?? schema?.field ?? ''"
    />

    <Checkbox
      v-else-if="isCheckboxComponent"
      v-bind="omitComponentProps('checkedValue', 'unCheckedValue')"
      :checked="switchChecked"
      @update:checked="updateCheckbox"
    />

    <Radio.Group
      v-else-if="component === 'RadioGroup'"
      v-bind="componentProps"
      :value="value"
      @update:value="update"
    >
      <Radio
        v-for="option in selectOptions"
        :key="String(option?.value)"
        :value="option?.value"
      >
        {{ option?.label ?? option?.value }}
      </Radio>
    </Radio.Group>

    <Radio.Group
      v-else-if="isRadioButtonGroup"
      v-bind="componentProps"
      :value="value"
      @update:value="update"
    >
      <Radio.Button
        v-for="option in selectOptions"
        :key="String(option?.value)"
        :value="option?.value"
      >
        {{ option?.label ?? option?.value }}
      </Radio.Button>
    </Radio.Group>

    <Select
      v-else-if="component === 'Select'"
      style="width: 100%"
      v-bind="componentProps"
      :value="value"
      :options="selectOptions"
      @update:value="update"
    />

    <Select
      v-else-if="isCompatTransfer"
      style="width: 100%"
      mode="multiple"
      v-bind="
        omitComponentProps(
          'afterFetch',
          'api',
          'beforeFetch',
          'dataSource',
          'options',
          'params',
          'resultField',
          'shouldFetch',
        )
      "
      :loading="compatApiLoading"
      :options="compatTransferSelectOptions"
      :value="Array.isArray(value) ? value : []"
      @update:value="update"
    />

    <div v-else-if="isButtonGroup" class="schema-button-group">
      <Space :size="buttonSpaceSize" wrap>
        <template v-for="(button, index) in buttonList" :key="getButtonActionKey(button, index)">
          <Tooltip
            v-if="getButtonTooltip(button)"
            v-bind="getButtonTooltip(button) ?? {}"
          >
            <Button
              :block="button.block"
              :danger="button.danger"
              :disabled="button.disabled"
              :ghost="button.ghost"
              :icon="getButtonIcon(button)"
              :loading="buttonActionLoadingKey === getButtonActionKey(button, index)"
              :size="button.size"
              :type="button.type ?? 'default'"
              @click="onClickButtonAction(button, index)"
            >
              {{ resolveTemplateValue(button.label ?? button.text ?? `按钮${index + 1}`) }}
            </Button>
          </Tooltip>

          <Button
            v-else
            :block="button.block"
            :danger="button.danger"
            :disabled="button.disabled"
            :ghost="button.ghost"
            :icon="getButtonIcon(button)"
            :loading="buttonActionLoadingKey === getButtonActionKey(button, index)"
            :size="button.size"
            :type="button.type ?? 'default'"
            @click="onClickButtonAction(button, index)"
          >
            {{ resolveTemplateValue(button.label ?? button.text ?? `按钮${index + 1}`) }}
          </Button>
        </template>
      </Space>
    </div>

    <div v-else-if="isColorPickerComponent" class="color-picker-wrap">
      <input
        class="color-picker-native"
        type="color"
        :value="colorPickerNativeValue"
        @input="updateNativeColor"
      />
      <Input
        v-bind="omitComponentProps()"
        :placeholder="componentProps.placeholder ?? '#1677ff'"
        :value="colorPickerTextValue"
        @update:value="updateColorValue"
      />
    </div>

    <div v-else-if="isRenderComponent" class="schema-render-block">
      {{ stringifyDisplayValue(renderPreviewValue) }}
    </div>

    <component
      :is="dynamicComponent"
      v-else-if="dynamicComponent"
      style="width: 100%"
      v-bind="dynamicBindProps"
      v-on="dynamicBindEvents"
    />

    <div v-else-if="component === 'InputPassword' || isStrengthMeter" class="strength-meter-wrap">
      <Input.Password
        v-bind="componentProps"
        :value="inputLikeValue"
        @update:value="updateInput"
      />
      <div v-if="isStrengthMeter" class="strength-meter-panel">
        <div class="strength-meter-track">
          <div
            class="strength-meter-bar"
            :style="{ backgroundColor: strengthColor, width: `${strengthPercent}%` }"
          />
        </div>
        <span class="strength-meter-label">{{ strengthLabel }}</span>
      </div>
    </div>

    <Input.TextArea
      v-else-if="isTextareaComponent"
      v-bind="componentProps"
      :value="inputLikeValue"
      @update:value="updateInput"
    />

    <Input
      v-else
      v-bind="componentProps"
      :value="inputLikeValue"
      @update:value="updateInput"
    />

    <div v-if="helpText" class="schema-help">
      {{ helpText }}
    </div>
  </Form.Item>
</template>

<style scoped>
.schema-help {
  margin-top: 6px;
  color: rgb(100 116 139);
  font-size: 12px;
  line-height: 1.5;
}

.easy-cron-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.easy-cron-row {
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 860px;
}

.easy-cron-input {
  flex: 1;
  min-width: 0;
}

.tag-editor {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.tag-add-trigger {
  cursor: pointer;
  border-style: dashed;
}

.tag-editor-input {
  width: 120px;
}

.select-biz-wrap {
  width: 100%;
}

.select-biz-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
}

.select-biz-filter {
  min-width: 0;
}

.select-biz-toolbar-actions {
  justify-self: end;
}

:deep(.select-biz-modal .ant-modal-body) {
  padding-top: 20px;
}

:deep(.select-biz-modal .ant-table-wrapper) {
  overflow: hidden;
}

:deep(.select-biz-modal .ant-table-pagination.ant-pagination) {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  row-gap: 12px;
  column-gap: 16px;
  margin-top: 16px;
}

:deep(.select-biz-modal .ant-pagination-total-text) {
  margin-inline-end: auto;
  color: rgb(100 116 139);
}

:deep(.select-biz-modal .ant-pagination-options) {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 12px;
  margin-inline-start: auto;
}

:deep(.select-biz-modal .ant-pagination-options-size-changer) {
  min-width: 112px;
  margin: 0;
}

:deep(.select-biz-modal .ant-pagination-options-quick-jumper) {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 6px;
  margin: 0;
  white-space: nowrap;
}

:deep(.select-biz-modal .ant-pagination-options-quick-jumper input) {
  width: 56px;
  min-width: 56px;
  margin: 0;
}

@media (max-width: 960px) {
  .select-biz-toolbar {
    grid-template-columns: 1fr;
  }

  .select-biz-toolbar-actions {
    justify-self: start;
  }

  :deep(.select-biz-modal .ant-table-pagination.ant-pagination) {
    justify-content: flex-start;
  }

  :deep(.select-biz-modal .ant-pagination-options) {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-inline-start: 0;
    width: 100%;
  }
}

.sub-form-wrap {
  width: 100%;
}

.sub-form-multiple-trigger {
  cursor: pointer;
}

.sub-form-single-trigger {
  cursor: pointer;
}

.sub-form-card-header {
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sub-form-summary-item {
  display: flex;
  margin-bottom: 6px;
  font-size: 13px;
}

.sub-form-summary-label {
  width: 120px;
  color: rgb(71 85 105);
  flex-shrink: 0;
}

.sub-form-summary-value {
  color: rgb(15 23 42);
  flex: 1;
  min-width: 0;
  word-break: break-all;
}

.sub-form-empty {
  color: rgb(100 116 139);
}

.schema-button-group {
  width: 100%;
}

.color-picker-wrap {
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
}

.color-picker-native {
  width: 64px;
  height: 40px;
  padding: 4px;
  border: 1px solid rgb(203 213 225);
  border-radius: 10px;
  background: white;
  cursor: pointer;
}

.schema-render-block {
  min-height: 40px;
  padding: 12px 14px;
  border: 1px dashed rgb(203 213 225);
  border-radius: 10px;
  background: rgb(248 250 252);
  color: rgb(71 85 105);
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.strength-meter-wrap {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.strength-meter-panel {
  display: flex;
  align-items: center;
  gap: 12px;
}

.strength-meter-track {
  height: 8px;
  flex: 1;
  overflow: hidden;
  border-radius: 999px;
  background: rgb(226 232 240);
}

.strength-meter-bar {
  height: 100%;
  border-radius: inherit;
  transition: width 0.2s ease;
}

.strength-meter-label {
  min-width: 48px;
  color: rgb(71 85 105);
  font-size: 12px;
  text-align: right;
}
</style>
