<script lang="ts" setup>
import type { GuobaConfigCard, GuobaConfigTab } from '#/api/guoba';
import type { Recordable } from '@vben/types';

import { computed, h, onMounted, reactive, ref, watch } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  Divider,
  Empty,
  Form,
  Input,
  Modal,
  Skeleton,
  Space,
  Tabs,
  Tag,
  message,
} from 'ant-design-vue';

import {
  getConfigDataApi,
  getConfigTabsApi,
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

const tabs = ref<GuobaConfigTab[]>([]);
const activeKey = ref('');
const pageLoading = ref(true);

const cardStates = reactive<Record<string, CardState>>({});
const normalCardValues = reactive<Record<string, Recordable<any>>>({});
const keyFormEntries = reactive<Record<string, KeyFormEntry[]>>({});
const keyFormCollapsed = reactive<Record<string, Record<string, boolean>>>({});
const arrayCardValues = reactive<Record<string, any[]>>({});

const activeTab = computed(() => {
  return tabs.value.find((item) => item.key === activeKey.value);
});

const activeCards = computed(() => activeTab.value?.cards ?? []);

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
    activeKey.value = tabs.value[0]?.key ?? '';
  } finally {
    pageLoading.value = false;
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
  let newKey = '';
  const promptProps = isRecord(card.promptProps) ? card.promptProps : {};
  const title = String(card.addBtnText ?? promptProps.title ?? '新增分组配置');
  const placeholder = String(promptProps.placeholder ?? '请输入分组标识（例如群号）');
  const contentText = String(promptProps.content ?? '').trim();
  const okText = String(promptProps.okText ?? '新增');

  Modal.confirm({
    title,
    okText,
    content: () =>
      h('div', [
        contentText
          ? h('div', { style: { marginBottom: '8px' } }, contentText)
          : null,
        h(Input, {
          placeholder,
          'onUpdate:value': (value) => {
            newKey = String(value ?? '').trim();
          },
        }),
      ]),
    async onOk() {
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
});

onMounted(async () => {
  await loadTabs();
  await loadActiveCards();
});
</script>

<template>
  <Page description="配置管理（可视化）" title="配置管理">
    <Skeleton v-if="pageLoading" active />

    <template v-else>
      <Tabs v-model:activeKey="activeKey">
        <Tabs.TabPane
          v-for="tab in tabs"
          :key="tab.key"
          :tab="tab.title"
        />
      </Tabs>

      <template v-if="activeCards.length > 0">
        <Card
          v-for="card in activeCards"
          :key="card.key"
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
.card-desc {
  margin: 10px 0 0;
  color: rgb(100 116 139);
}

:deep(.ant-skeleton),
:deep(.ant-tabs),
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
