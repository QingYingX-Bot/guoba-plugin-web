<script lang="ts" setup>
import type { GuobaConfigCard, GuobaConfigTab, GuobaPluginRule } from '#/api/guoba';
import type { Recordable } from '@vben/types';

import { computed, h, onMounted, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import { Page } from '@vben/common-ui';
import { requestClient } from '#/api/request';

import {
  Button,
  Card,
  Divider,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Skeleton,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  message,
} from 'ant-design-vue';

import {
  getConfigDataApi,
  getConfigTabsApi,
  getPluginRulesApi,
  removeConfigCardItemApi,
  saveConfigDataApi,
} from '#/api';
import SchemaField from '#/views/guoba/_components/schema-field.vue';

interface CardState {
  loaded: boolean;
  loading: boolean;
  saving: boolean;
}

interface KeyFormEntry {
  displayKey: string;
  rawKey: string;
  saving: boolean;
  value: Recordable<any>;
}

interface GroupRulePlugin {
  description: string;
  key: string;
  moduleCount: number;
  name: string;
  ruleCount: number;
  ruleNames: string[];
}

interface GroupSettingSection {
  key: string;
  schemas: Recordable<any>[];
  title: string;
}

interface OicqGroupItem {
  group_id: number | string;
  group_name?: string;
}

interface OicqPageResult<T = Recordable<any>> {
  maxNum?: number;
  pageNum?: number;
  pageSize?: number;
  records?: T[];
  total?: number;
}

type GroupRecordKind = 'discord' | 'official-qq-bot' | 'other' | 'qq';
type GroupPickerFilter = 'all' | GroupRecordKind;

const tabs = ref<GuobaConfigTab[]>([]);
const pageLoading = ref(true);
const route = useRoute();

const cardStates = reactive<Record<string, CardState>>({});
const normalCardValues = reactive<Record<string, Recordable<any>>>({});
const keyFormEntries = reactive<Record<string, KeyFormEntry[]>>({});
const keyFormCollapsed = reactive<Record<string, Record<string, boolean>>>({});
const arrayCardValues = reactive<Record<string, any[]>>({});
const activeKeyFormEntryKeys = reactive<Record<string, string>>({});
const keyFormSearchKeyword = ref('');
const groupRuleSearchKeyword = ref('');
const groupDetailView = ref<'rules' | 'settings'>('settings');
const pluginRules = ref<GuobaPluginRule[]>([]);
const pluginRulesLoaded = ref(false);
const pluginRulesLoading = ref(false);
const groupRuleFields = ['enable', 'disable'] as const;

const routeConfigKey = computed(() => {
  const value = route.params.key;
  const paramKey = Array.isArray(value) ? value[0] : value;
  const pathKey = route.path.startsWith('/config/@/')
    ? route.path.slice('/config/@/'.length)
    : '';
  const key = paramKey || pathKey;

  if (!key) {
    return '';
  }

  try {
    return decodeURIComponent(key);
  } catch {
    return key;
  }
});

const activeKey = computed(() => {
  const key = routeConfigKey.value;
  if (key && tabs.value.some((item) => item.key === key)) {
    return key;
  }
  return tabs.value[0]?.key ?? '';
});

const activeTab = computed(() => {
  return tabs.value.find((item) => item.key === activeKey.value);
});

const activeCards = computed(() => activeTab.value?.cards ?? []);

const groupRulePlugins = computed<GroupRulePlugin[]>(() => {
  const map = new Map<string, GuobaPluginRule[]>();

  pluginRules.value.forEach((rule) => {
    const name = getRuleConfigName(rule);
    if (!name) {
      return;
    }
    const key = getRulePluginKey(rule);
    const rules = map.get(key) ?? [];
    rules.push(rule);
    map.set(key, rules);
  });

  return Array.from(map.entries())
    .map(([key, rules]) => {
      const first = rules[0]!;
      const ruleNames = Array.from(new Set(rules.map((rule) => getRuleConfigName(rule)).filter(Boolean)))
        .sort((a, b) => a.localeCompare(b));

      return {
        key,
        description: first.pluginDescription || '',
        moduleCount: new Set(rules.map((rule) => rule.moduleFile || rule.pluginKey || 'index.js')).size,
        name: getRulePluginName(first),
        ruleCount: ruleNames.length,
        ruleNames,
      };
    })
    .filter((item) => item.ruleCount > 0)
    .sort((a, b) => a.name.localeCompare(b.name));
});

const filteredGroupRulePlugins = computed(() => {
  const keyword = groupRuleSearchKeyword.value.trim().toLowerCase();
  if (!keyword) {
    return groupRulePlugins.value;
  }

  return groupRulePlugins.value.filter((plugin) => {
    const haystack = [
      plugin.name,
      plugin.description,
      ...plugin.ruleNames,
    ].join(' ').toLowerCase();
    return haystack.includes(keyword);
  });
});

const groupRuleSelectOptions = computed(() => {
  const values = new Set<string>();
  pluginRules.value.forEach((rule) => {
    const name = getRuleConfigName(rule);
    if (name) {
      values.add(name);
    }
  });

  return Array.from(values)
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({
      label: value,
      value,
    }));
});

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

function getCardState(cardKey: string): CardState {
  if (!cardStates[cardKey]) {
    cardStates[cardKey] = {
      loaded: false,
      loading: false,
      saving: false,
    };
  }
  return cardStates[cardKey];
}

function getCardTypeLabel(card: GuobaConfigCard) {
  if (card.type === 'arrayFormCard') {
    return '数组表单';
  }
  if (card.type === 'keyFormCard') {
    return '键值分组表单';
  }
  return '普通表单';
}

function hasTemplateSyntax(text: string) {
  return /\{\{[\s\S]+?\}\}/.test(text);
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

function validateValueByRules(value: string, rules: any) {
  const normalizedRules = normalizeRuleItems(rules);
  for (const rule of normalizedRules) {
    if (rule.required && !value) {
      return String(rule.message ?? '请输入内容');
    }

    if (value && rule.pattern) {
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
      if (pattern && !pattern.test(value)) {
        return String(rule.message ?? '输入格式不正确');
      }
    }

    if (value && typeof rule.min === 'number' && value.length < rule.min) {
      return String(rule.message ?? `长度不能小于 ${rule.min}`);
    }
    if (value && typeof rule.max === 'number' && value.length > rule.max) {
      return String(rule.message ?? `长度不能大于 ${rule.max}`);
    }
  }
  return '';
}

function renderTemplateText(
  text: string,
  context: Record<string, any>,
) {
  if (!text) {
    return '';
  }
  if (!hasTemplateSyntax(text)) {
    return text;
  }

  return text.replace(/\{\{([\s\S]+?)\}\}/g, (_full, expression) => {
    try {
      const keys = Object.keys(context);
      const values = Object.values(context);
      const fn = new Function(
        ...keys,
        `"use strict"; return (${String(expression).trim()});`,
      );
      const value = fn(...values);
      return value === undefined || value === null ? '' : String(value);
    } catch {
      return '';
    }
  }).trim();
}

function getCardTitle(card: GuobaConfigCard) {
  const rawTitle = String(card.title ?? '').trim();
  if (!rawTitle) {
    return card.key;
  }

  if (card.type === 'keyFormCard' && hasTemplateSyntax(rawTitle)) {
    return '分组配置';
  }

  const rendered = renderTemplateText(rawTitle, {
    form: {
      key: 'default',
      values: {},
    },
  });
  return rendered || rawTitle;
}

function isSchemaMarker(schema: Recordable<any>) {
  const component = String(schema?.component ?? '');
  return component === 'Divider' || component === 'SOFT_GROUP_BEGIN';
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

function normalizeKeyFormEntries(rawValue: unknown): KeyFormEntry[] {
  if (!isRecord(rawValue)) {
    return [];
  }

  const entries: KeyFormEntry[] = Object.entries(rawValue).map(
    ([rawKey, value]) => ({
      displayKey: rawKey.replace(/^INTEGER__/, ''),
      rawKey,
      saving: false,
      value: isRecord(value) ? cloneValue(value) : {},
    }),
  );

  entries.sort((a, b) => {
    if (a.displayKey === 'default') return -1;
    if (b.displayKey === 'default') return 1;
    return a.displayKey.localeCompare(b.displayKey);
  });

  return entries;
}

function getKeyFormCollapseState(cardKey: string) {
  if (!isRecord(keyFormCollapsed[cardKey])) {
    keyFormCollapsed[cardKey] = {};
  }
  return keyFormCollapsed[cardKey]!;
}

function defaultKeyFormCollapsed(entry: KeyFormEntry) {
  return entry.displayKey !== 'default';
}

function syncKeyFormCollapseState(cardKey: string, entries: KeyFormEntry[]) {
  const current = getKeyFormCollapseState(cardKey);
  const next: Record<string, boolean> = {};

  for (const entry of entries) {
    next[entry.rawKey] = current[entry.rawKey] ?? defaultKeyFormCollapsed(entry);
  }

  keyFormCollapsed[cardKey] = next;
}

function ensureActiveKeyFormEntry(cardKey: string, entries: KeyFormEntry[]) {
  const current = activeKeyFormEntryKeys[cardKey];
  if (current && entries.some((entry) => entry.rawKey === current)) {
    return;
  }

  activeKeyFormEntryKeys[cardKey] = entries.find((entry) => entry.displayKey === 'default')?.rawKey
    ?? entries[0]?.rawKey
    ?? '';
}

function getKeyFormEntries(cardKey: string) {
  return keyFormEntries[cardKey] ?? [];
}

function getActiveKeyFormEntry(card: GuobaConfigCard) {
  const entries = getKeyFormEntries(card.key);
  return entries.find((entry) => entry.rawKey === activeKeyFormEntryKeys[card.key])
    ?? entries[0]
    ?? null;
}

function getActiveKeyFormEntryList(card: GuobaConfigCard) {
  const entry = getActiveKeyFormEntry(card);
  return entry ? [entry] : [];
}

function setActiveKeyFormEntry(cardKey: string, entry: KeyFormEntry) {
  activeKeyFormEntryKeys[cardKey] = entry.rawKey;
}

function getFilteredKeyFormEntries(card: GuobaConfigCard) {
  const entries = getKeyFormEntries(card.key);
  const text = keyFormSearchKeyword.value.trim().toLowerCase();
  if (!text) {
    return entries;
  }

  return entries.filter((entry) => {
    const haystack = [
      entry.displayKey,
      keyFormTitle(card, entry),
      entry.value?.__GROUP_TIP_TEXT__,
      entry.value?.name,
    ].join(' ').toLowerCase();
    return haystack.includes(text);
  });
}

const GROUP_SETTING_SECTIONS = [
  {
    fields: ['groupGlobalCD', 'groupCD', 'singleCD'],
    key: 'cooldown',
    title: '冷却时间',
  },
  {
    fields: ['onlyReplyAt', 'botAlias'],
    key: 'trigger',
    title: '响应入口',
  },
  {
    fields: ['addLimit', 'imgAddLimit', 'addPrivate'],
    key: 'permission',
    title: '添加权限',
  },
  {
    fields: ['addReply', 'addAt', 'addRecall'],
    key: 'reply',
    title: '回复行为',
  },
];

function getGroupSettingSections(card: GuobaConfigCard): GroupSettingSection[] {
  const schemas = card.schemas ?? [];
  const usedFields = new Set<string>();
  const sections = GROUP_SETTING_SECTIONS.map((section) => {
    const sectionSchemas = section.fields
      .map((field) => schemas.find((schema) => String(schema?.field ?? '') === field))
      .filter(Boolean) as Recordable<any>[];

    sectionSchemas.forEach((schema) => usedFields.add(String(schema.field ?? '')));

    return {
      key: section.key,
      schemas: sectionSchemas,
      title: section.title,
    };
  }).filter((section) => section.schemas.length > 0);

  const extraSchemas = schemas.filter((schema) => {
    const field = String(schema?.field ?? '');
    return field
      && !usedFields.has(field)
      && !isSchemaMarker(schema)
      && !isGroupRuleField(schema);
  });

  if (extraSchemas.length > 0) {
    sections.push({
      key: 'other',
      schemas: extraSchemas,
      title: '其他设置',
    });
  }

  return sections;
}

function getSchemaField(schema: Recordable<any>) {
  return String(schema?.field ?? '');
}

function getSchemaComponent(schema: Recordable<any>) {
  return String(schema?.component ?? 'Input').trim();
}

function getSchemaComponentProps(schema: Recordable<any>) {
  return (schema?.componentProps ?? {}) as Recordable<any>;
}

function getSchemaHelp(schema: Recordable<any>) {
  return schema?.bottomHelpMessage || schema?.helpMessage || schema?.help || '';
}

function getSchemaLabel(schema: Recordable<any>) {
  return String(schema?.label || schema?.field || '');
}

function getGroupSettingOptions(schema: Recordable<any>) {
  const options = getSchemaComponentProps(schema).options;
  if (!Array.isArray(options)) {
    return [];
  }
  return options.map((option) => {
    if (option && typeof option === 'object') {
      return {
        label: option.label ?? option.title ?? option.name ?? option.text ?? option.value,
        value: option.value ?? option.key ?? option.id ?? option.label ?? option.title,
      };
    }
    return {
      label: String(option ?? ''),
      value: option,
    };
  });
}

function getGroupSettingValue(entry: KeyFormEntry, schema: Recordable<any>) {
  return getKeyEntryFieldValue(entry, getSchemaField(schema));
}

function setGroupSettingValue(entry: KeyFormEntry, schema: Recordable<any>, value: any) {
  setKeyEntryFieldValue(entry, getSchemaField(schema), value);
}

function getGroupSettingTags(entry: KeyFormEntry, schema: Recordable<any>) {
  return normalizeStringArray(getGroupSettingValue(entry, schema));
}

function getSchemaCheckedValue(schema: Recordable<any>) {
  return getSchemaComponentProps(schema).checkedValue ?? true;
}

function getSchemaUncheckedValue(schema: Recordable<any>) {
  return getSchemaComponentProps(schema).unCheckedValue ?? false;
}

function isGroupSettingSwitchChecked(entry: KeyFormEntry, schema: Recordable<any>) {
  const value = getGroupSettingValue(entry, schema);
  const checkedValue = getSchemaCheckedValue(schema);
  if (value === checkedValue) {
    return true;
  }
  if (checkedValue === true) {
    return value === true || value === 1 || value === '1' || value === 'true';
  }
  return false;
}

function setGroupSettingSwitchValue(
  entry: KeyFormEntry,
  schema: Recordable<any>,
  checked: boolean | number | string,
) {
  setGroupSettingValue(
    entry,
    schema,
    checked ? getSchemaCheckedValue(schema) : getSchemaUncheckedValue(schema),
  );
}

function isGroupConfigCard(card: GuobaConfigCard) {
  return activeKey.value === 'group'
    && card.key === 'system.group'
    && card.type === 'keyFormCard';
}

function isGroupRuleField(schema: Recordable<any>) {
  const field = String(schema?.field ?? '');
  return field === 'enable' || field === 'disable';
}

function getGroupRuleFieldType(schema: Recordable<any> | string) {
  const field = typeof schema === 'string' ? schema : String(schema?.field ?? '');
  return field === 'enable' ? 'enable' : 'disable';
}

function getGroupRuleOppositeField(schema: Recordable<any> | string) {
  return getGroupRuleFieldType(schema) === 'enable' ? 'disable' : 'enable';
}

function getGroupRuleFieldMeta(card: GuobaConfigCard, field: 'disable' | 'enable') {
  const schema = card.schemas?.find((item) => String(item?.field ?? '') === field);
  return {
    help: schema?.bottomHelpMessage || schema?.helpMessage || schema?.help,
    label: schema?.label || (field === 'enable' ? '功能白名单' : '功能黑名单'),
  };
}

function getRuleConfigName(rule: GuobaPluginRule) {
  return String(rule.instanceName || rule.name || rule.functionName || '').trim();
}

function getRulePluginName(rule: GuobaPluginRule) {
  return String(rule.pluginPackageName || rule.pluginName || rule.pluginFolder || 'unknown').trim();
}

function getRulePluginKey(rule: GuobaPluginRule) {
  return String(rule.pluginPackageName || rule.pluginName || rule.pluginFolder || rule.pluginMenuName || 'unknown').trim();
}

function normalizeStringArray(value: any) {
  const rawValues = Array.isArray(value)
    ? value
    : value === null || value === undefined || value === ''
      ? []
      : [value];

  return Array.from(new Set(
    rawValues
      .map((item) => String(item ?? '').trim())
      .filter(Boolean),
  ));
}

function getGroupRuleFieldValue(entry: KeyFormEntry, schema: Recordable<any> | string) {
  const field = typeof schema === 'string' ? schema : String(schema.field ?? '');
  return normalizeStringArray(getKeyEntryFieldValue(entry, field));
}

function setGroupRuleFieldValues(
  entry: KeyFormEntry,
  schema: Recordable<any> | string,
  values: any,
) {
  const field = typeof schema === 'string' ? schema : String(schema.field ?? '');
  setKeyEntryFieldValue(entry, field, normalizeStringArray(values));
}

function addPluginRulesToGroupField(
  entry: KeyFormEntry,
  schema: Recordable<any> | string,
  plugin: GroupRulePlugin,
) {
  const field = getGroupRuleFieldType(schema);
  const oppositeField = getGroupRuleOppositeField(schema);
  const currentValues = normalizeStringArray(getKeyEntryFieldValue(entry, field));
  const oppositeValues = normalizeStringArray(getKeyEntryFieldValue(entry, oppositeField));
  const nextValues = Array.from(new Set([...currentValues, ...plugin.ruleNames]));
  const addedCount = nextValues.length - currentValues.length;
  const nextOppositeValues = oppositeValues.filter((value) => !plugin.ruleNames.includes(value));

  setKeyEntryFieldValue(entry, field, nextValues);
  setKeyEntryFieldValue(entry, oppositeField, nextOppositeValues);

  if (addedCount > 0) {
    message.success(`已加入 ${plugin.name} 的 ${addedCount} 个功能`);
  } else {
    message.info(`${plugin.name} 的功能已在当前名单中`);
  }
}

function removePluginRulesFromGroupField(
  entry: KeyFormEntry,
  schema: Recordable<any> | string,
  plugin: GroupRulePlugin,
) {
  const field = getGroupRuleFieldType(schema);
  const currentValues = normalizeStringArray(getKeyEntryFieldValue(entry, field));
  const nextValues = currentValues.filter((value) => !plugin.ruleNames.includes(value));
  const removedCount = currentValues.length - nextValues.length;

  setKeyEntryFieldValue(entry, field, nextValues);

  if (removedCount > 0) {
    message.success(`已移出 ${plugin.name} 的 ${removedCount} 个功能`);
  } else {
    message.info(`${plugin.name} 在当前名单中没有可移出的功能`);
  }
}

function getGroupRulePluginActiveCount(
  entry: KeyFormEntry,
  schema: Recordable<any> | string,
  plugin: GroupRulePlugin,
) {
  const values = new Set(getGroupRuleFieldValue(entry, schema));
  return plugin.ruleNames.filter((name) => values.has(name)).length;
}

function isGroupRulePluginFullyActive(
  entry: KeyFormEntry,
  schema: Recordable<any> | string,
  plugin: GroupRulePlugin,
) {
  return plugin.ruleCount > 0
    && getGroupRulePluginActiveCount(entry, schema, plugin) >= plugin.ruleCount;
}

function getGroupRulePluginActionText(
  entry: KeyFormEntry,
  schema: 'disable' | 'enable',
  plugin: GroupRulePlugin,
) {
  const targetCount = getGroupRulePluginActiveCount(entry, schema, plugin);
  const oppositeCount = getGroupRulePluginActiveCount(entry, getGroupRuleOppositeField(schema), plugin);
  const targetName = schema === 'enable' ? '白名单' : '黑名单';

  if (targetCount >= plugin.ruleCount && plugin.ruleCount > 0) {
    return `已在${targetName}`;
  }
  if (targetCount > 0) {
    return `补全${targetName}`;
  }
  if (oppositeCount > 0) {
    return `移入${targetName}`;
  }
  return `加入${targetName}`;
}

function getGroupRulePluginRemoveText(schema: 'disable' | 'enable') {
  return schema === 'enable' ? '移出白名单' : '移出黑名单';
}

function isDefaultKeyFormEntry(entry: KeyFormEntry) {
  return entry.displayKey === 'default';
}

function getGroupEntrySubtitle(entry: KeyFormEntry) {
  if (isDefaultKeyFormEntry(entry)) {
    return '所有群聊的默认配置';
  }

  const groupText = entry.value?.__GROUP_TIP_TEXT__;
  return groupText ? `群 ${groupText}` : `群号 ${entry.displayKey}`;
}

function getGroupEntryCompactMeta(entry: KeyFormEntry) {
  if (isDefaultKeyFormEntry(entry)) {
    return '默认';
  }
  return entry.displayKey;
}

function getGroupEntryTitle(entry: KeyFormEntry) {
  if (isDefaultKeyFormEntry(entry)) {
    return '默认配置';
  }
  return entry.value?.__GROUP_TIP_TEXT__ || `群 ${entry.displayKey}`;
}

function normalizeOicqGroupRecords(result: OicqPageResult<OicqGroupItem> | undefined) {
  if (!Array.isArray(result?.records)) {
    return [];
  }

  return result.records.filter((item) => {
    const groupId = String(item?.group_id ?? '').trim();
    const groupName = String(item?.group_name ?? '').trim().toLowerCase();
    return groupId !== 'stdin' && groupName !== '标准输入';
  });
}

function getGroupRecordId(record: OicqGroupItem) {
  return String(record.group_id ?? '').trim();
}

function getGroupRecordName(record: OicqGroupItem) {
  return String(record.group_name ?? '').trim();
}

function getGroupRecordKind(record: OicqGroupItem): GroupRecordKind {
  const groupId = getGroupRecordId(record);
  if (/^\d{5,12}$/.test(groupId)) {
    return 'qq';
  }
  if (/^\d+:[0-9A-Fa-f]+$/.test(groupId)) {
    return 'official-qq-bot';
  }
  if (groupId.startsWith('dc_')) {
    return 'discord';
  }
  return 'other';
}

function getDiscordRecordParts(record: OicqGroupItem) {
  const name = getGroupRecordName(record);
  const index = name.indexOf('-');
  if (index < 0) {
    return {
      channel: name || getGroupRecordId(record),
      server: 'Discord',
    };
  }
  return {
    channel: name.slice(index + 1).trim() || name,
    server: name.slice(0, index).trim() || 'Discord',
  };
}

function getGroupRecordKindText(kind: GroupRecordKind) {
  if (kind === 'qq') {
    return 'QQ 群';
  }
  if (kind === 'official-qq-bot') {
    return '官方 QQ 机器人';
  }
  if (kind === 'discord') {
    return 'Discord';
  }
  return '其他';
}

function getGroupRecordKindColor(kind: GroupRecordKind) {
  if (kind === 'qq') {
    return 'green';
  }
  if (kind === 'official-qq-bot') {
    return 'blue';
  }
  if (kind === 'discord') {
    return 'purple';
  }
  return 'default';
}

function getGroupRecordDisplayName(record: OicqGroupItem) {
  const kind = getGroupRecordKind(record);
  if (kind === 'discord') {
    return getDiscordRecordParts(record).channel;
  }
  if (kind === 'official-qq-bot') {
    return getGroupRecordName(record) || '官方 QQ 机器人';
  }
  return getGroupRecordName(record) || getGroupRecordId(record);
}

function getGroupRecordDisplayMeta(record: OicqGroupItem) {
  const kind = getGroupRecordKind(record);
  if (kind === 'discord') {
    return getDiscordRecordParts(record).server;
  }
  return getGroupRecordKindText(kind);
}

function isGroupRecordMatched(record: OicqGroupItem, keyword: string) {
  const text = keyword.trim().toLowerCase();
  if (!text) {
    return true;
  }

  return [
    record.group_id,
    record.group_name,
    getGroupRecordKindText(getGroupRecordKind(record)),
    getGroupRecordDisplayName(record),
    getGroupRecordDisplayMeta(record),
  ].some((value) => String(value ?? '').toLowerCase().includes(text));
}

function getGroupPickerFilterText(filter: GroupPickerFilter) {
  if (filter !== 'all') {
    return getGroupRecordKindText(filter);
  }
  return '全部';
}

async function searchOicqGroups(keyword = '') {
  const text = keyword.trim();
  const pageSize = 200;
  const records: OicqGroupItem[] = [];

  async function fetchPage(pageNo: number) {
    const params: Recordable<any> = {
      pageNo,
      pageSize,
    };

    return requestClient.get<OicqPageResult<OicqGroupItem>>('/oicq/group/list', {
      params,
    });
  }

  let pageNo = 1;
  let maxNum = 1;

  do {
    const result = await fetchPage(pageNo);
    records.push(...normalizeOicqGroupRecords(result));
    maxNum = Math.max(1, Number(result?.maxNum ?? 1));
    pageNo += 1;
  } while (pageNo <= maxNum);

  const uniqueMap = new Map<string, OicqGroupItem>();
  records.forEach((item) => {
    uniqueMap.set(String(item.group_id), item);
  });
  return Array.from(uniqueMap.values()).filter((item) => isGroupRecordMatched(item, text));
}

function isKeyFormEntryCollapsed(cardKey: string, entry: KeyFormEntry) {
  return Boolean(getKeyFormCollapseState(cardKey)[entry.rawKey]);
}

function toggleKeyFormEntry(cardKey: string, entry: KeyFormEntry) {
  const state = getKeyFormCollapseState(cardKey);
  state[entry.rawKey] = !Boolean(state[entry.rawKey]);
}

function keyFormTitle(card: GuobaConfigCard, entry: KeyFormEntry) {
  const rawTitle = String(card.title ?? '').trim();
  const rendered = renderTemplateText(rawTitle, {
    form: {
      key: entry.displayKey,
      values: entry.value ?? {},
    },
  });
  if (rendered) {
    return rendered;
  }

  if (entry.displayKey === 'default') {
    return '默认配置';
  }
  const groupText = entry.value?.__GROUP_TIP_TEXT__;
  return `群：${groupText || entry.displayKey}`;
}

function getNormalFieldValue(cardKey: string, fieldPath: string) {
  return getByPath(normalCardValues[cardKey] ?? {}, fieldPath);
}

function setNormalFieldValue(cardKey: string, fieldPath: string, value: any) {
  if (!isRecord(normalCardValues[cardKey])) {
    normalCardValues[cardKey] = {};
  }
  setByPath(normalCardValues[cardKey], fieldPath, value);
}

function getKeyEntryFieldValue(entry: KeyFormEntry, fieldPath: string) {
  return getByPath(entry.value ?? {}, fieldPath);
}

function setKeyEntryFieldValue(
  entry: KeyFormEntry,
  fieldPath: string,
  value: any,
) {
  if (!isRecord(entry.value)) {
    entry.value = {};
  }
  setByPath(entry.value, fieldPath, value);
}

function getArrayItems(cardKey: string) {
  return Array.isArray(arrayCardValues[cardKey]) ? arrayCardValues[cardKey] : [];
}

function updateArrayItem(cardKey: string, index: number, value?: string) {
  if (!Array.isArray(arrayCardValues[cardKey])) {
    arrayCardValues[cardKey] = [];
  }
  arrayCardValues[cardKey][index] = value ?? '';
}

function addArrayItem(card: GuobaConfigCard) {
  if (!card.allowAdd) {
    return;
  }
  const cardKey = card.key;
  if (!Array.isArray(arrayCardValues[cardKey])) {
    arrayCardValues[cardKey] = [];
  }
  if (
    typeof card.lengthMax === 'number'
    && arrayCardValues[cardKey].length >= card.lengthMax
  ) {
    message.warning(`最多只能添加 ${card.lengthMax} 项`);
    return;
  }
  arrayCardValues[cardKey].push('');
}

function removeArrayItem(card: GuobaConfigCard, index: number) {
  if (!card.allowDel) {
    return;
  }
  const cardKey = card.key;
  if (!Array.isArray(arrayCardValues[cardKey])) {
    return;
  }
  if (
    typeof card.lengthMin === 'number'
    && arrayCardValues[cardKey].length <= card.lengthMin
  ) {
    message.warning(`至少保留 ${card.lengthMin} 项`);
    return;
  }
  arrayCardValues[cardKey].splice(index, 1);
}

async function loadTabs() {
  pageLoading.value = true;
  try {
    const result = await getConfigTabsApi();
    tabs.value = result ?? [];
  } finally {
    pageLoading.value = false;
  }
}

async function loadPluginRules(force = false) {
  if (!force && (pluginRulesLoading.value || pluginRulesLoaded.value)) {
    return;
  }

  pluginRulesLoading.value = true;
  try {
    pluginRules.value = await getPluginRulesApi();
    pluginRulesLoaded.value = true;
  } finally {
    pluginRulesLoading.value = false;
  }
}

async function loadCardData(card: GuobaConfigCard, force = false) {
  const state = getCardState(card.key);
  if (!force && (state.loading || state.loaded)) {
    return;
  }

  state.loading = true;
  try {
    const result = await getConfigDataApi(card.key);

    if (card.type === 'keyFormCard') {
      const entries = normalizeKeyFormEntries(result);
      keyFormEntries[card.key] = entries;
      syncKeyFormCollapseState(card.key, entries);
      ensureActiveKeyFormEntry(card.key, entries);
      return;
    }

    if (card.type === 'arrayFormCard') {
      arrayCardValues[card.key] = Array.isArray(result) ? cloneValue(result) : [];
      return;
    }

    normalCardValues[card.key] = isRecord(result) ? cloneValue(result) : {};
  } finally {
    state.loading = false;
    state.loaded = true;
  }
}

async function loadActiveCards(force = false) {
  const cards = activeCards.value;
  if (cards.length === 0) {
    return;
  }
  await Promise.all(cards.map((card) => loadCardData(card, force)));
}

async function saveCardData(card: GuobaConfigCard) {
  const state = getCardState(card.key);
  state.saving = true;
  try {
    if (card.type === 'arrayFormCard') {
      await saveConfigDataApi(card.key, cloneValue(getArrayItems(card.key)));
    } else if (card.type === 'keyFormCard') {
      message.warning('键值分组请在每个配置卡片中单独保存');
      return;
    } else {
      await saveConfigDataApi(card.key, cloneValue(normalCardValues[card.key] ?? {}));
    }

    message.success(`${card.title} 保存成功`);
    await loadCardData(card, true);
  } finally {
    state.saving = false;
  }
}

async function saveKeyFormEntry(card: GuobaConfigCard, entry: KeyFormEntry) {
  entry.saving = true;
  try {
    await saveConfigDataApi(card.key, {
      [entry.rawKey]: cloneValue(entry.value ?? {}),
    });
    message.success(`${entry.displayKey} 保存成功`);
    await loadCardData(card, true);
  } finally {
    entry.saving = false;
  }
}

function addKeyFormEntry(card: GuobaConfigCard) {
  const groupKeyword = ref('');
  const groupRecords = ref<OicqGroupItem[]>([]);
  const groupPickerFilter = ref<GroupPickerFilter>('all');
  const groupLoading = ref(false);
  const selectedGroupId = ref('');
  const selectedGroupName = ref('');
  const filteredGroupRecords = computed(() => {
    if (groupPickerFilter.value !== 'all') {
      return groupRecords.value.filter((record) => getGroupRecordKind(record) === groupPickerFilter.value);
    }
    return groupRecords.value;
  });
  const promptProps = isRecord(card.promptProps) ? card.promptProps : {};
  const title = String(card.addBtnText ?? promptProps.title ?? '新增分组配置');
  const okText = String(promptProps.okText ?? '新增');

  async function loadGroups(keyword = '') {
    groupLoading.value = true;
    try {
      groupRecords.value = await searchOicqGroups(keyword);
    } finally {
      groupLoading.value = false;
    }
  }

  loadGroups();

  Modal.confirm({
    centered: true,
    icon: null,
    width: 920,
    title,
    okText,
    content: () =>
      h('div', { class: 'group-picker-modal' }, [
        h(Input.Search, {
          allowClear: true,
          placeholder: '搜索名称或 ID，找不到可直接输入群号',
          value: groupKeyword.value,
          onChange: (event: Event) => {
            const value = String((event.target as HTMLInputElement | null)?.value ?? '');
            groupKeyword.value = value;
            if (/^\d+$/.test(value.trim())) {
              selectedGroupId.value = value.trim();
              selectedGroupName.value = '';
            }
            loadGroups(value);
          },
          onSearch: (value: string) => {
            groupKeyword.value = String(value ?? '');
            if (/^\d+$/.test(groupKeyword.value.trim())) {
              selectedGroupId.value = groupKeyword.value.trim();
              selectedGroupName.value = '';
            }
            loadGroups(groupKeyword.value);
          },
        }),
        h(Radio.Group, {
          buttonStyle: 'solid',
          class: 'group-picker-filter',
          optionType: 'button',
          options: [
            { label: '全部', value: 'all' },
            { label: 'QQ 群', value: 'qq' },
            { label: '官方 QQ', value: 'official-qq-bot' },
            { label: 'Discord', value: 'discord' },
            { label: '其他', value: 'other' },
          ],
          size: 'small',
          value: groupPickerFilter.value,
          onChange: (event: any) => {
            groupPickerFilter.value = (event?.target?.value ?? 'all') as GroupPickerFilter;
          },
        }),
        h(Table, {
          class: 'group-picker-table',
          columns: [
            {
              ellipsis: true,
              title: '名称',
              customRender: ({ record }: { record: OicqGroupItem }) => h('div', { class: 'group-picker-name' }, [
                h('strong', getGroupRecordDisplayName(record)),
                h('small', getGroupRecordDisplayMeta(record)),
              ]),
            },
            {
              title: '类型',
              width: 150,
              customRender: ({ record }: { record: OicqGroupItem }) => {
                const kind = getGroupRecordKind(record);
                return h(Tag, { color: getGroupRecordKindColor(kind) }, () => getGroupRecordKindText(kind));
              },
            },
            {
              dataIndex: 'group_id',
              title: 'ID',
              width: 360,
            },
          ],
          customRow: (record: OicqGroupItem) => ({
            onClick: () => {
              selectedGroupId.value = String(record.group_id ?? '').trim();
              selectedGroupName.value = String(record.group_name ?? '').trim();
              groupKeyword.value = record.group_name
                ? `${record.group_name} (${selectedGroupId.value})`
                : selectedGroupId.value;
            },
          }),
          dataSource: filteredGroupRecords.value,
          loading: groupLoading.value,
          pagination: false,
          rowClassName: (record: OicqGroupItem) => String(record.group_id) === selectedGroupId.value ? 'is-selected' : '',
          rowKey: 'group_id',
          scroll: { y: 460 },
          size: 'small',
        }),
        h('div', { class: 'group-picker-footer' }, [
          h('span', `${getGroupPickerFilterText(groupPickerFilter.value)} ${filteredGroupRecords.value.length} / ${groupRecords.value.length}`),
        ]),
      ]),
    async onOk() {
      const newKey = selectedGroupId.value.trim();
      if (!newKey) {
        message.warning('请输入分组标识');
        throw new Error('missing key');
      }

      const ruleError = validateValueByRules(newKey, promptProps.rules);
      if (ruleError) {
        message.warning(ruleError);
        throw new Error('invalid key');
      }

      const existed = (keyFormEntries[card.key] ?? []).some(
        (entry) => entry.displayKey === newKey,
      );
      if (existed) {
        message.warning('该分组已存在');
        throw new Error('duplicated key');
      }

      const rawKey = newKey === 'default' ? 'default' : `INTEGER__${newKey}`;

      await saveConfigDataApi(card.key, {
        [rawKey]: {},
      });
      message.success('新增成功');
      await loadCardData(card, true);
    },
  });
}

async function deleteKeyFormEntry(card: GuobaConfigCard, entry: KeyFormEntry) {
  if (!card.allowDel || entry.displayKey === 'default') {
    return;
  }

  Modal.confirm({
    title: '删除分组配置',
    content: `确认删除分组「${entry.displayKey}」吗？`,
    okButtonProps: { danger: true },
    okText: '确认删除',
    async onOk() {
      await removeConfigCardItemApi(entry.rawKey, card.key);
      message.success('删除成功');
      await loadCardData(card, true);
    },
  });
}

watch(activeKey, () => {
  loadActiveCards();
  if (activeKey.value === 'group') {
    loadPluginRules();
  }
});

onMounted(async () => {
  await loadTabs();
  await loadActiveCards();
  if (activeKey.value === 'group') {
    await loadPluginRules();
  }
});
</script>

<template>
  <Page
    auto-content-height
    :content-class="activeKey === 'group' ? 'config-page-content group-page-content' : 'config-page-content'"
    :description="activeTab?.title ? '配置管理' : '配置管理（可视化）'"
    :title="activeTab?.title || '配置管理'"
  >
    <Skeleton v-if="pageLoading" active />

    <template v-else>
      <template v-if="activeCards.length > 0">
        <Card
          v-for="card in activeCards"
          :key="card.key"
          class="mb-4"
          :class="{ 'group-config-card-wrapper': isGroupConfigCard(card) }"
          :title="getCardTitle(card)"
        >
          <template #extra>
            <Space v-if="!isGroupConfigCard(card)">
              <Button
                :loading="getCardState(card.key).loading"
                size="small"
                @click="loadCardData(card, true)"
              >
                刷新
              </Button>
              <Button
                v-if="card.type === 'keyFormCard' && card.allowAdd"
                size="small"
                @click="addKeyFormEntry(card)"
              >
                {{ card.addBtnText || '新增' }}
              </Button>
              <Button
                v-if="card.type !== 'keyFormCard'"
                type="primary"
                size="small"
                :loading="getCardState(card.key).saving"
                @click="saveCardData(card)"
              >
                保存
              </Button>
            </Space>
          </template>

          <div v-if="!isGroupConfigCard(card)" class="mb-3">
            <Space wrap>
              <Tag color="blue">{{ card.key }}</Tag>
              <Tag>{{ getCardTypeLabel(card) }}</Tag>
              <Tag v-if="card.allowAdd">可新增</Tag>
              <Tag v-if="card.allowDel">可删除</Tag>
            </Space>
            <p class="card-desc">{{ card.desc || '暂无说明' }}</p>
          </div>

          <template v-if="isGroupConfigCard(card)">
            <div class="group-config-workbench">
              <aside class="group-config-sidebar">
                <div class="group-config-tools">
                  <Input
                    v-model:value="keyFormSearchKeyword"
                    allow-clear
                    placeholder="搜索群配置"
                  />
                  <Button
                    v-if="card.allowAdd"
                    block
                    type="primary"
                    @click="addKeyFormEntry(card)"
                  >
                    新增群聊
                  </Button>
                </div>

                <Empty
                  v-if="getFilteredKeyFormEntries(card).length === 0"
                  description="没有匹配的群配置"
                />

                <div v-else class="group-config-list">
                  <button
                    v-for="entry in getFilteredKeyFormEntries(card)"
                    :key="entry.rawKey"
                    class="group-config-item"
                    :class="{ 'is-active': getActiveKeyFormEntry(card)?.rawKey === entry.rawKey }"
                    type="button"
                    @click="setActiveKeyFormEntry(card.key, entry)"
                  >
                    <span class="group-config-item-main">
                      <strong>{{ getGroupEntryTitle(entry) }}</strong>
                      <small>{{ getGroupEntryCompactMeta(entry) }}</small>
                    </span>
                  </button>
                </div>
              </aside>

              <main class="group-config-editor">
                <template
                  v-for="entry in getActiveKeyFormEntryList(card)"
                  :key="entry.rawKey"
                >
                  <div class="group-config-editor-head">
                    <div>
                      <h3>{{ keyFormTitle(card, entry) }}</h3>
                      <p>{{ getGroupEntrySubtitle(entry) }}</p>
                    </div>
                    <Space>
                      <Button
                        :loading="getCardState(card.key).loading"
                        @click="loadCardData(card, true)"
                      >
                        刷新
                      </Button>
                      <Button
                        v-if="card.allowDel && !isDefaultKeyFormEntry(entry)"
                        danger
                        @click="deleteKeyFormEntry(card, entry)"
                      >
                        删除
                      </Button>
                      <Button
                        type="primary"
                        :loading="entry.saving"
                        @click="saveKeyFormEntry(card, entry)"
                      >
                        保存
                      </Button>
                    </Space>
                  </div>

                  <div class="group-config-editor-body">
                    <Form layout="vertical">
                      <div class="group-config-board">
                        <section class="group-rule-library">
                          <div class="group-panel-head">
                            <div>
                              <strong>功能规则库</strong>
                              <small>按插件批量加入白名单或黑名单</small>
                            </div>
                            <Button
                              :loading="pluginRulesLoading"
                              @click="loadPluginRules(true)"
                            >
                              刷新
                            </Button>
                          </div>

                          <Input
                            v-model:value="groupRuleSearchKeyword"
                            allow-clear
                            placeholder="搜索插件、功能名"
                          />

                          <div class="group-rule-library-list">
                            <Empty
                              v-if="!pluginRulesLoading && filteredGroupRulePlugins.length === 0"
                              description="暂无可用功能规则"
                            />
                            <div
                              v-for="plugin in filteredGroupRulePlugins"
                              :key="plugin.key"
                              class="group-rule-plugin"
                            >
                              <div class="group-rule-plugin-main">
                                <strong>{{ plugin.name }}</strong>
                                <small>
                                  {{ plugin.ruleCount }} 个功能 / {{ plugin.moduleCount }} 个文件
                                  <template v-if="getGroupRulePluginActiveCount(entry, 'enable', plugin) > 0">
                                    · 白 {{ getGroupRulePluginActiveCount(entry, 'enable', plugin) }}
                                  </template>
                                  <template v-if="getGroupRulePluginActiveCount(entry, 'disable', plugin) > 0">
                                    · 黑 {{ getGroupRulePluginActiveCount(entry, 'disable', plugin) }}
                                  </template>
                                </small>
                              </div>
                              <Space>
                                <Button
                                  v-if="!isGroupRulePluginFullyActive(entry, 'enable', plugin)"
                                  size="small"
                                  @click="addPluginRulesToGroupField(entry, 'enable', plugin)"
                                >
                                  {{ getGroupRulePluginActionText(entry, 'enable', plugin) }}
                                </Button>
                                <Button
                                  v-else
                                  size="small"
                                  @click="removePluginRulesFromGroupField(entry, 'enable', plugin)"
                                >
                                  {{ getGroupRulePluginRemoveText('enable') }}
                                </Button>
                                <Button
                                  v-if="!isGroupRulePluginFullyActive(entry, 'disable', plugin)"
                                  danger
                                  size="small"
                                  @click="addPluginRulesToGroupField(entry, 'disable', plugin)"
                                >
                                  {{ getGroupRulePluginActionText(entry, 'disable', plugin) }}
                                </Button>
                                <Button
                                  v-else
                                  danger
                                  size="small"
                                  @click="removePluginRulesFromGroupField(entry, 'disable', plugin)"
                                >
                                  {{ getGroupRulePluginRemoveText('disable') }}
                                </Button>
                              </Space>
                            </div>
                          </div>
                        </section>

                        <aside class="group-config-detail">
                          <section class="group-detail-panel">
                            <div class="group-detail-tabs">
                              <button
                                class="group-detail-tab"
                                :class="{ 'is-active': groupDetailView === 'settings' }"
                                type="button"
                                @click="groupDetailView = 'settings'"
                              >
                                基础设置
                              </button>
                              <button
                                class="group-detail-tab"
                                :class="{ 'is-active': groupDetailView === 'rules' }"
                                type="button"
                                @click="groupDetailView = 'rules'"
                              >
                                功能名单
                                <span>{{ getGroupRuleFieldValue(entry, 'enable').length + getGroupRuleFieldValue(entry, 'disable').length }}</span>
                              </button>
                            </div>

                            <div v-if="groupDetailView === 'settings'" class="group-setting-view">
                              <div class="group-setting-sections">
                                <section
                                  v-for="section in getGroupSettingSections(card)"
                                  :key="section.key"
                                  class="group-setting-section"
                                >
                                  <div class="group-setting-section-head">
                                    <strong>{{ section.title }}</strong>
                                  </div>

                                  <div class="group-setting-fields">
                                    <div
                                      v-for="schema in section.schemas"
                                      :key="`${entry.rawKey}-${schema.field || schema.label}`"
                                      class="group-setting-field"
                                    >
                                      <div class="group-setting-field-text">
                                        <strong>{{ getSchemaLabel(schema) }}</strong>
                                        <span
                                          v-if="getSchemaHelp(schema)"
                                          class="group-setting-field-help"
                                        >
                                          {{ getSchemaHelp(schema) }}
                                        </span>
                                      </div>

                                      <div class="group-setting-control">
                                        <InputNumber
                                          v-if="getSchemaComponent(schema) === 'InputNumber'"
                                          style="width: 100%"
                                          v-bind="getSchemaComponentProps(schema)"
                                          :value="getGroupSettingValue(entry, schema)"
                                          @update:value="setGroupSettingValue(entry, schema, $event)"
                                        />
                                        <Switch
                                          v-else-if="getSchemaComponent(schema) === 'Switch'"
                                          :checked="isGroupSettingSwitchChecked(entry, schema)"
                                          @update:checked="setGroupSettingSwitchValue(entry, schema, $event)"
                                        />
                                        <Radio.Group
                                          v-else-if="getSchemaComponent(schema) === 'RadioGroup'"
                                          :value="getGroupSettingValue(entry, schema)"
                                          @update:value="setGroupSettingValue(entry, schema, $event)"
                                        >
                                          <Radio
                                            v-for="option in getGroupSettingOptions(schema)"
                                            :key="String(option.value)"
                                            :value="option.value"
                                          >
                                            {{ option.label }}
                                          </Radio>
                                        </Radio.Group>
                                        <Select
                                          v-else-if="getSchemaComponent(schema) === 'GTags'"
                                          mode="tags"
                                          :value="getGroupSettingTags(entry, schema)"
                                          allow-clear
                                          placeholder="输入后回车添加"
                                          @update:value="setGroupSettingValue(entry, schema, normalizeStringArray($event))"
                                        />
                                        <SchemaField
                                          v-else
                                          :model="entry.value"
                                          :schema="schema"
                                          :value="getKeyEntryFieldValue(entry, String(schema.field ?? ''))"
                                          @update:value="setKeyEntryFieldValue(entry, String(schema.field ?? ''), $event)"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </section>
                              </div>
                            </div>

                            <div v-else class="group-rule-view">
                              <div class="group-selected-list">
                                <section
                                  v-for="field in groupRuleFields"
                                  :key="field"
                                  class="group-selected-panel"
                                  :class="`is-${field}`"
                                >
                                  <div class="group-selected-panel-head">
                                    <div>
                                      <strong>{{ getGroupRuleFieldMeta(card, field).label }}</strong>
                                      <small>{{ getGroupRuleFieldMeta(card, field).help }}</small>
                                    </div>
                                    <Tag :color="field === 'enable' ? 'green' : 'red'">
                                      {{ getGroupRuleFieldValue(entry, field).length }}
                                    </Tag>
                                  </div>

                                  <Select
                                    mode="tags"
                                    :value="getGroupRuleFieldValue(entry, field)"
                                    :options="groupRuleSelectOptions"
                                    :loading="pluginRulesLoading"
                                    allow-clear
                                    show-search
                                    placeholder="输入功能名后回车"
                                    @update:value="setGroupRuleFieldValues(entry, field, $event)"
                                  />
                                </section>
                              </div>
                            </div>
                          </section>
                        </aside>
                      </div>
                    </Form>
                  </div>
                </template>

                <Empty
                  v-if="getActiveKeyFormEntryList(card).length === 0"
                  class="group-config-empty"
                  description="请选择或新增一个群配置"
                />
              </main>
            </div>
          </template>

          <template v-else-if="card.type === 'keyFormCard'">
            <Empty
              v-if="(keyFormEntries[card.key] ?? []).length === 0"
              description="暂无分组配置"
            />

            <div v-else class="key-form-list">
              <Card
                v-for="entry in keyFormEntries[card.key] ?? []"
                :key="entry.rawKey"
                class="key-form-card"
                :class="{ 'is-collapsed': isKeyFormEntryCollapsed(card.key, entry) }"
                size="small"
                :title="keyFormTitle(card, entry)"
              >
                <template #extra>
                  <Space>
                    <Button
                      size="small"
                      @click="toggleKeyFormEntry(card.key, entry)"
                    >
                      {{ isKeyFormEntryCollapsed(card.key, entry) ? '展开' : '收起' }}
                    </Button>
                    <Button
                      size="small"
                      type="primary"
                      :loading="entry.saving"
                      @click="saveKeyFormEntry(card, entry)"
                    >
                      保存
                    </Button>
                    <Button
                      v-if="card.allowDel && entry.displayKey !== 'default'"
                      danger
                      size="small"
                      @click="deleteKeyFormEntry(card, entry)"
                    >
                      删除
                    </Button>
                  </Space>
                </template>

                <Form
                  v-show="!isKeyFormEntryCollapsed(card.key, entry)"
                  layout="vertical"
                >
                  <template
                    v-for="schema in card.schemas ?? []"
                    :key="`${entry.rawKey}-${schema.field || schema.label}`"
                  >
                    <Divider v-if="isSchemaMarker(schema)">
                      {{ schema.label || schema.field || '分组' }}
                    </Divider>
                    <SchemaField
                      v-else
                      :model="entry.value"
                      :schema="schema"
                      :value="getKeyEntryFieldValue(entry, String(schema.field ?? ''))"
                      @update:value="setKeyEntryFieldValue(entry, String(schema.field ?? ''), $event)"
                    />
                  </template>
                </Form>
              </Card>
            </div>
          </template>

          <template v-else-if="card.type === 'arrayFormCard'">
            <div class="array-list">
              <Space direction="vertical" style="width: 100%">
                <div
                  v-for="(item, index) in getArrayItems(card.key)"
                  :key="`${card.key}-${index}`"
                  class="array-row"
                >
                  <Input
                    :value="item === null || item === undefined ? '' : String(item)"
                    placeholder="请输入值"
                    @update:value="updateArrayItem(card.key, index, $event)"
                  />
                  <Button
                    v-if="card.allowDel"
                    danger
                    @click="removeArrayItem(card, index)"
                  >
                    删除
                  </Button>
                </div>
              </Space>

              <Button
                v-if="card.allowAdd"
                class="mt-3"
                block
                type="dashed"
                @click="addArrayItem(card)"
              >
                {{ card.addBtnText || '新增一项' }}
              </Button>
            </div>
          </template>

          <template v-else>
            <Form layout="vertical">
              <template
                v-for="schema in card.schemas ?? []"
                :key="`${card.key}-${schema.field || schema.label}`"
              >
                <Divider v-if="isSchemaMarker(schema)">
                  {{ schema.label || schema.field || '分组' }}
                </Divider>
                <SchemaField
                  v-else
                  :model="normalCardValues[card.key]"
                  :schema="schema"
                  :value="getNormalFieldValue(card.key, String(schema.field ?? ''))"
                  @update:value="setNormalFieldValue(card.key, String(schema.field ?? ''), $event)"
                />
              </template>
            </Form>
          </template>
        </Card>
      </template>

      <Empty v-else description="当前标签页没有可配置项" />
    </template>
  </Page>
</template>

<style scoped>
:deep(.config-page-content) {
  box-sizing: border-box;
  min-height: 0;
}

:deep(.group-page-content) {
  overflow: hidden !important;
}

:global(.group-picker-modal) {
  display: grid;
  gap: 10px;
  max-height: calc(100vh - 168px);
  padding-top: 2px;
}

:global(.group-picker-filter) {
  display: flex;
  justify-content: center;
}

:global(.group-picker-filter .ant-radio-button-wrapper) {
  min-width: 72px;
  text-align: center;
}

:global(.group-picker-table .ant-table) {
  border: 1px solid rgb(226 232 240);
  border-radius: 8px;
  overflow: hidden;
}

:global(.group-picker-table .ant-table-cell) {
  vertical-align: middle;
}

:global(.group-picker-table .ant-table-tbody > tr > td) {
  height: 44px;
}

:global(.group-picker-table .ant-table-tbody > tr > td:first-child) {
  font-weight: 500;
}

:global(.group-picker-name) {
  display: grid;
  gap: 2px;
  min-width: 0;
  line-height: 1.25;
}

:global(.group-picker-name strong),
:global(.group-picker-name small) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:global(.group-picker-name small) {
  color: rgb(100 116 139);
  font-size: 12px;
  font-weight: 400;
}

:global(.group-picker-table .ant-table-tbody > tr > td:nth-child(3)) {
  color: rgb(71 85 105);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
  word-break: break-all;
}

:global(.group-picker-table .ant-table-tbody > tr) {
  cursor: pointer;
}

:global(.group-picker-table .ant-table-tbody > tr.is-selected > td) {
  background: rgb(240 253 244) !important;
  color: rgb(22 101 52);
}

:global(.group-picker-table .ant-table-tbody > tr:hover > td) {
  background: rgb(248 250 252);
}

:global(.group-picker-footer) {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  min-height: 28px;
  color: rgb(100 116 139);
  font-size: 13px;
}

.card-desc {
  margin: 10px 0 0;
  color: rgb(100 116 139);
}

:deep(.ant-skeleton),
:deep(.ant-empty) {
  max-width: 1440px;
  margin-right: auto;
  margin-left: auto;
}

.mb-4 {
  max-width: 1440px;
  margin-right: auto;
  margin-left: auto;
  margin-bottom: 24px;
}

.mb-4:last-child {
  margin-bottom: 0;
}

.group-config-card-wrapper {
  height: 100%;
  max-width: none;
}

.group-config-card-wrapper :deep(.ant-card-head) {
  display: none;
}

.group-config-card-wrapper :deep(.ant-card-body) {
  height: 100%;
  padding: 0;
}

.group-config-workbench {
  display: grid;
  grid-template-columns: 250px minmax(0, 1fr);
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: rgb(246 248 251);
}

.group-config-sidebar {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 10px;
  min-width: 0;
  padding: 14px;
  overflow: hidden;
  border-right: 1px solid hsl(var(--border));
  background: rgb(255 255 255);
}

.group-config-tools {
  display: grid;
  gap: 8px;
}

.group-config-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 0;
  overflow: auto;
  padding-right: 2px;
}

.group-config-item {
  display: grid;
  width: 100%;
  padding: 10px 11px;
  color: hsl(var(--foreground));
  text-align: left;
  cursor: pointer;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 7px;
  transition: border-color 0.16s ease, box-shadow 0.16s ease;
}

.group-config-item:hover {
  border-color: rgb(14 165 233 / 55%);
  box-shadow: 0 6px 16px rgb(15 23 42 / 6%);
}

.group-config-item.is-active {
  border-color: rgb(14 165 233);
  background: rgb(240 249 255);
}

.group-config-item-main {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  min-width: 0;
}

.group-config-item-main strong,
.group-config-item-main small,
.group-config-item-meta {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.group-config-item-main small {
  flex: none;
  color: hsl(var(--muted-foreground));
  font-size: 12px;
}

.group-config-editor {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  min-width: 0;
  overflow: hidden;
  background: transparent;
}

.group-config-editor-head {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid hsl(var(--border));
  background: rgb(255 255 255);
}

.group-config-editor-head h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 650;
  line-height: 1.35;
}

.group-config-editor-head p {
  margin: 4px 0 0;
  color: hsl(var(--muted-foreground));
}

.group-config-editor-body {
  min-height: 0;
  padding: 14px;
  overflow: hidden;
}

.group-config-editor-body :deep(.ant-form) {
  height: 100%;
  min-height: 0;
}

.group-config-editor-body :deep(.ant-divider) {
  grid-column: 1 / -1;
  margin: 10px 0 16px;
}

.group-config-editor-body :deep(.ant-form-item) {
  min-width: 0;
}

.group-config-board {
  display: grid;
  grid-template-columns: minmax(620px, 1fr) minmax(360px, 0.78fr);
  gap: 14px;
  height: 100%;
  min-height: 0;
}

.group-rule-library,
.group-detail-panel {
  display: grid;
  min-width: 0;
  min-height: 0;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  background: rgb(255 255 255);
}

.group-rule-library {
  order: 2;
  grid-template-rows: auto auto minmax(0, 1fr);
  gap: 10px;
  padding: 14px;
  overflow: hidden;
}

.group-config-detail {
  display: grid;
  order: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.group-detail-panel {
  grid-template-rows: auto minmax(0, 1fr);
  overflow: hidden;
}

.group-detail-tabs {
  display: flex;
  gap: 18px;
  align-items: center;
  min-height: 48px;
  padding: 0 18px;
  border-bottom: 1px solid hsl(var(--border));
  background: rgb(255 255 255);
}

.group-detail-tab {
  position: relative;
  display: inline-flex;
  gap: 8px;
  align-items: center;
  height: 48px;
  padding: 0 2px;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  background: transparent;
  border: 0;
  transition: color 0.16s ease;
}

.group-detail-tab:hover {
  color: hsl(var(--foreground));
}

.group-detail-tab.is-active {
  color: hsl(var(--foreground));
}

.group-detail-tab.is-active::after {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 2px;
  content: '';
  background: rgb(14 165 233);
  border-radius: 999px 999px 0 0;
}

.group-detail-tab span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  color: rgb(71 85 105);
  font-size: 12px;
  line-height: 20px;
  background: rgb(241 245 249);
  border-radius: 999px;
}

.group-detail-tab {
  font-size: 14px;
  font-weight: 650;
}

.group-setting-view,
.group-rule-view {
  height: 100%;
  min-height: 0;
  padding: 0;
  overflow: auto;
}

.group-rule-view {
  display: grid;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.group-setting-view {
  background: rgb(246 248 251);
}

.group-panel-head,
.group-selected-panel-head {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
  min-width: 0;
}

.group-panel-head > div,
.group-selected-panel-head > div {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.group-panel-head strong,
.group-panel-head small,
.group-selected-panel-head strong,
.group-selected-panel-head small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.group-panel-head strong,
.group-selected-panel-head strong {
  font-size: 14px;
  font-weight: 650;
}

.group-panel-head small,
.group-selected-panel-head small {
  color: hsl(var(--muted-foreground));
  font-size: 12px;
}

.group-rule-library-list {
  display: grid;
  align-content: start;
  gap: 8px;
  min-height: 0;
  overflow: auto;
  padding-right: 2px;
}

.group-rule-plugin {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  padding: 10px 11px;
  border: 1px solid rgb(226 232 240);
  border-radius: 7px;
  background: rgb(248 250 252);
}

.group-rule-plugin-main {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.group-rule-plugin-main strong,
.group-rule-plugin-main small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.group-rule-plugin-main small {
  color: hsl(var(--muted-foreground));
  font-size: 12px;
}

.group-setting-sections {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
  min-height: 100%;
  padding: 14px;
  box-sizing: border-box;
}

.group-setting-section {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0;
  align-items: flex-start;
  min-width: 0;
  padding: 0;
  overflow: hidden;
  border: 1px solid rgb(226 232 240);
  border-radius: 8px;
  background: rgb(255 255 255);
}

.group-setting-section:last-child {
  border-bottom: 1px solid rgb(226 232 240);
}

.group-setting-section-head {
  display: grid;
  gap: 3px;
  min-width: 0;
  padding: 13px 16px 12px;
  line-height: 1.4;
  background: rgb(248 250 252);
  border-bottom: 1px solid rgb(226 232 240);
}

.group-setting-section-head strong {
  color: hsl(var(--foreground));
  font-size: 15px;
  font-weight: 700;
}

.group-setting-fields {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0;
  align-items: center;
  padding: 0 16px;
}

.group-setting-field {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 420px);
  gap: 24px;
  align-items: center;
  min-width: 0;
  min-height: 58px;
  padding: 12px 0;
  border-bottom: 1px solid rgb(241 245 249);
}

.group-setting-field:first-child {
  padding-top: 12px;
}

.group-setting-field:last-child {
  padding-bottom: 12px;
  border-bottom: 0;
}

.group-setting-field-text {
  display: grid;
  gap: 3px;
  min-width: 0;
  line-height: 1.45;
}

.group-setting-field-text strong {
  color: hsl(var(--foreground));
  font-size: 14px;
  font-weight: 650;
}

.group-setting-field-help {
  max-width: 560px;
  overflow: hidden;
  color: rgb(100 116 139);
  font-size: 12px;
  line-height: 1.45;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.group-setting-control {
  display: flex;
  justify-content: flex-end;
  min-width: 0;
}

.group-setting-control > :deep(*) {
  max-width: 420px;
}

.group-setting-control :deep(.ant-input-number),
.group-setting-control :deep(.ant-select-selector) {
  border-radius: 8px;
}

.group-setting-control :deep(.ant-radio-group) {
  display: flex;
  flex-wrap: nowrap;
  gap: 0 14px;
  align-items: center;
  justify-content: flex-end;
  white-space: nowrap;
}

.group-setting-control :deep(.ant-radio-wrapper) {
  margin-inline-end: 0;
}

.group-setting-control :deep(.ant-select),
.group-setting-control :deep(.ant-input-number) {
  width: 100%;
}

.group-selected-list {
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: minmax(0, 1fr) minmax(0, 1fr);
  gap: 14px;
  height: 100%;
  min-height: 0;
  padding: 14px;
  box-sizing: border-box;
}

.group-selected-panel {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 10px;
  min-width: 0;
  min-height: 0;
  padding: 13px 16px 16px;
  overflow: hidden;
  border: 1px solid rgb(229 234 242);
  border-radius: 8px;
  background: linear-gradient(180deg, rgb(255 255 255) 0%, rgb(249 250 252) 100%);
}

.group-selected-panel :deep(.ant-select) {
  height: 100%;
  min-height: 0;
}

.group-selected-panel :deep(.ant-select-selector) {
  align-content: start;
  height: 100% !important;
  max-height: none;
  padding: 12px 12px 8px !important;
  overflow-y: auto !important;
  background: rgb(255 255 255) !important;
  border-color: rgb(226 232 240) !important;
  border-radius: 8px !important;
  box-shadow: inset 0 1px 2px rgb(15 23 42 / 3%) !important;
  transition: border-color 0.16s ease, box-shadow 0.16s ease;
}

.group-selected-panel :deep(.ant-select-focused .ant-select-selector),
.group-selected-panel :deep(.ant-select-selector:focus),
.group-selected-panel :deep(.ant-select-selector:active) {
  border-color: rgb(148 163 184) !important;
  box-shadow: inset 0 1px 2px rgb(15 23 42 / 3%) !important;
}

.group-selected-panel :deep(.ant-select-selection-overflow) {
  align-content: flex-start;
  align-items: flex-start;
  gap: 6px 4px;
  min-height: 100%;
}

.group-selected-panel :deep(.ant-select-selection-placeholder) {
  top: 12px;
  inset-inline-start: 12px;
  transform: none;
  color: rgb(148 163 184);
}

.group-selected-panel :deep(.ant-select-selection-overflow:has(.ant-select-selection-search:first-child:last-child)) {
  align-content: flex-start;
}

.group-selected-panel :deep(.ant-select-selection-search) {
  min-width: 160px;
}

.group-selected-panel :deep(.ant-select-selection-search-input) {
  height: 24px !important;
}

.group-selected-panel :deep(.ant-select-selection-item) {
  height: 24px;
  margin: 0;
  color: rgb(51 65 85);
  line-height: 22px;
  background: rgb(248 250 252);
  border-color: rgb(203 213 225);
  border-radius: 6px;
}

.group-selected-panel.is-enable :deep(.ant-select-selector) {
  background: linear-gradient(180deg, rgb(255 255 255) 0%, rgb(248 253 250) 100%) !important;
}

.group-selected-panel.is-disable :deep(.ant-select-selector) {
  background: linear-gradient(180deg, rgb(255 255 255) 0%, rgb(255 250 250) 100%) !important;
}

.group-config-empty {
  align-self: center;
}

.key-form-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.key-form-card {
  overflow: hidden;
  border: 1px solid rgb(148 163 184 / 70%);
  border-radius: 12px;
  background: linear-gradient(180deg, rgb(255 255 255) 0%, rgb(248 250 252 / 85%) 100%);
  box-shadow: 0 1px 3px rgb(15 23 42 / 6%);
}

.key-form-card :deep(.ant-card-head) {
  background: rgb(248 250 252 / 90%);
  border-bottom-color: rgb(226 232 240);
}

.key-form-card.is-collapsed :deep(.ant-card-body) {
  padding-bottom: 12px;
}

.array-list {
  width: 100%;
}

.array-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

@media (max-width: 1100px) {
  .group-config-workbench {
    grid-template-columns: 1fr;
    height: auto;
    min-height: auto;
  }

  .group-config-sidebar {
    max-height: 360px;
    border-right: 0;
    border-bottom: 1px solid hsl(var(--border));
  }

  .group-config-editor {
    min-height: 560px;
  }

  .group-config-editor-body :deep(.ant-form) {
    grid-template-columns: 1fr;
  }

  .group-config-board,
  .group-setting-sections,
  .group-setting-section,
  .group-setting-fields {
    grid-template-columns: 1fr;
  }

  .group-selected-list {
    grid-template-columns: 1fr;
  }
}
</style>
