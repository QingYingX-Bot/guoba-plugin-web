<script lang="ts" setup>
import type { GuobaConfigCard, GuobaConfigTab, GuobaPluginRule } from '#/api/guoba';
import type { Recordable } from '@vben/types';

import type {
  CardState,
  GroupEntryTools,
  GroupPickerFilter,
  GroupRecordKind,
  GroupRuleField,
  GroupRulePlugin,
  GroupRuleTools,
  GroupSchemaTools,
  GroupSettingSection,
  KeyFormEntry,
  OicqGroupItem,
  OicqPageResult,
} from './types';

import { computed, h, onMounted, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import { requestClient } from '#/api/request';

import {
  Button,
  Card,
  Divider,
  Empty,
  Form,
  Input,
  Modal,
  Radio,
  Skeleton,
  Space,
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
import GroupConfigPanel from './components/GroupConfigPanel.vue';

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
const groupRuleFields: readonly GroupRuleField[] = ['enable', 'disable'];

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

function setActiveKeyFormEntry(cardKey: string, entry: KeyFormEntry) {
  activeKeyFormEntryKeys[cardKey] = entry.rawKey;
}

function setActiveKeyFormEntryByKey(cardKey: string, rawKey: string) {
  const entry = getKeyFormEntries(cardKey).find((item) => item.rawKey === rawKey);
  if (entry) {
    setActiveKeyFormEntry(cardKey, entry);
  }
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

const groupEntryTools: GroupEntryTools = {
  getSubtitle: getGroupEntrySubtitle,
  getTitle: keyFormTitle,
  isDefault: isDefaultKeyFormEntry,
};

const groupSchemaTools: GroupSchemaTools = {
  getComponent: getSchemaComponent,
  getComponentProps: getSchemaComponentProps,
  getHelp: getSchemaHelp,
  getKeyEntryFieldValue,
  getLabel: getSchemaLabel,
  getOptions: getGroupSettingOptions,
  getSettingTags: getGroupSettingTags,
  getSettingValue: getGroupSettingValue,
  isSwitchChecked: isGroupSettingSwitchChecked,
  normalizeStringArray,
  setKeyEntryFieldValue,
  setSettingValue: setGroupSettingValue,
  setSwitchValue: setGroupSettingSwitchValue,
};

const groupRuleTools: GroupRuleTools = {
  addPluginToField: addPluginRulesToGroupField,
  getFieldMeta: getGroupRuleFieldMeta,
  getFieldValue: getGroupRuleFieldValue,
  getPluginActionText: getGroupRulePluginActionText,
  getPluginActiveCount: getGroupRulePluginActiveCount,
  getPluginRemoveText: getGroupRulePluginRemoveText,
  isPluginFullyActive: isGroupRulePluginFullyActive,
  removePluginFromField: removePluginRulesFromGroupField,
  setFieldValues: setGroupRuleFieldValues,
};

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
  <div
    :class="activeKey === 'group' ? 'config-page-content group-page-content' : 'config-page-content'"
  >
    <Skeleton v-if="pageLoading" active />

    <template v-else>
      <template v-if="activeCards.length > 0">
        <template
          v-for="card in activeCards"
          :key="card.key"
        >
          <GroupConfigPanel
            v-if="isGroupConfigCard(card)"
            :active-entry="getActiveKeyFormEntry(card)"
            :card="card"
            :detail-view="groupDetailView"
            :entries="getKeyFormEntries(card.key)"
            :entry-tools="groupEntryTools"
            :filtered-entries="getFilteredKeyFormEntries(card)"
            :filtered-rule-plugins="filteredGroupRulePlugins"
            :loading="getCardState(card.key).loading"
            :plugin-rules-loading="pluginRulesLoading"
            :rule-fields="groupRuleFields"
            :rule-search-keyword="groupRuleSearchKeyword"
            :rule-select-options="groupRuleSelectOptions"
            :rule-tools="groupRuleTools"
            :schema-tools="groupSchemaTools"
            :search-keyword="keyFormSearchKeyword"
            :setting-sections="getGroupSettingSections(card)"
            @add-entry="addKeyFormEntry(card)"
            @delete-entry="deleteKeyFormEntry(card, $event)"
            @refresh="loadCardData(card, true)"
            @refresh-rules="loadPluginRules(true)"
            @save-entry="saveKeyFormEntry(card, $event)"
            @select-entry="setActiveKeyFormEntryByKey(card.key, $event)"
            @update:detail-view="groupDetailView = $event"
            @update:rule-search-keyword="groupRuleSearchKeyword = $event"
            @update:search-keyword="keyFormSearchKeyword = $event"
          />

          <Card
            v-else
            class="mb-4"
            :title="getCardTitle(card)"
          >
            <template #extra>
              <Space>
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

            <div class="mb-3">
              <Space wrap>
                <Tag color="blue">{{ card.key }}</Tag>
                <Tag>{{ getCardTypeLabel(card) }}</Tag>
                <Tag v-if="card.allowAdd">可新增</Tag>
                <Tag v-if="card.allowDel">可删除</Tag>
              </Space>
              <p class="card-desc">{{ card.desc || '暂无说明' }}</p>
            </div>

            <template v-if="card.type === 'keyFormCard'">
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
      </template>

      <Empty v-else description="当前标签页没有可配置项" />
    </template>
  </div>
</template>

<style scoped>
:global(main.bg-background-deep:has(.group-page-content)) {
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

:global(main.bg-background-deep:has(.group-page-content) > .relative.flex.min-h-full.flex-col) {
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.config-page-content {
  box-sizing: border-box;
  width: 100%;
  min-height: 0;
  overflow-x: hidden;
  background: transparent;
}

.group-page-content {
  flex: 1 1 auto;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden !important;
  background: #fff;
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

.config-page-content > :deep(.ant-skeleton),
.config-page-content > :deep(.ant-empty) {
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
</style>
