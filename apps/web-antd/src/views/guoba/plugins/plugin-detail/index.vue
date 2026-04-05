<script lang="ts" setup>
import type {
  GuobaPlugin,
  GuobaPluginSchemaGroup,
} from '#/api/guoba';
import type { Recordable } from '@vben/types';

import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  Alert,
  Button,
  Card,
  Divider,
  Empty,
  Form,
  Result,
  Skeleton,
  Space,
  Tabs,
  message,
} from 'ant-design-vue';

import {
  getPluginConfigApi,
  savePluginConfigApi,
} from '#/api';
import { useGuobaStore } from '#/store';
import SchemaField from '#/views/guoba/_components/schema-field.vue';
import PluginStatusTags from '#/views/guoba/_components/plugin-status-tags.vue';

interface SchemaGroupItem {
  key: string;
  schemas: Recordable<any>[];
  title: string;
}

const route = useRoute();
const router = useRouter();
const guobaStore = useGuobaStore();

const loading = ref(true);
const plugin = ref<GuobaPlugin | null>(null);
const notFoundMessage = ref('');

const configLoading = ref(false);
const configSaving = ref(false);
const configData = ref<Recordable<any>>({});
const configUseFlatKey = ref(false);
const configGroupKey = ref('default');

const pluginName = computed(() => {
  const fromParam = String(route.params?.name ?? '').trim();
  if (fromParam) {
    return decodeURIComponent(fromParam);
  }

  const fromMeta = (route.meta as Recordable<any>)?.guobaMeta?.plugin?.name;
  if (fromMeta) {
    return String(fromMeta).trim();
  }

  const pathSegments = String(route.path).split('/').filter(Boolean);
  const pluginAtIndex = pathSegments.findIndex((segment) => segment === '@');
  if (pluginAtIndex !== -1) {
    const pluginSegment = pathSegments[pluginAtIndex + 1];
    if (pluginSegment && !pluginSegment.startsWith(':')) {
      return decodeURIComponent(pluginSegment).trim();
    }
  }

  const fromPath = decodeURIComponent(pathSegments.at(-1) ?? '').trim();

  return fromPath === '@' ? '' : fromPath;
});

const canEditConfig = computed(() => {
  return !!(plugin.value?.installed && plugin.value?.hasConfig);
});

const pageTitle = computed(() => {
  const name = plugin.value?.title || pluginName.value || '插件配置';
  return `${name} 配置`;
});

const pluginSchemaGroups = computed<SchemaGroupItem[]>(() => {
  if (!plugin.value) {
    return [];
  }

  const fromSchemaGroups = (plugin.value.schemaGroups ?? []) as GuobaPluginSchemaGroup[];
  if (fromSchemaGroups.length > 0) {
    return fromSchemaGroups
      .map((group, index) => ({
        key: String(group.name || `group-${index + 1}`),
        schemas: ((group.schemas ?? []) as Recordable<any>[]).filter(
          (schema) => !isSoftGroupBegin(schema),
        ),
        title: String(group.title || group.name || `分组${index + 1}`),
      }))
      .filter((group) => group.schemas.length > 0);
  }

  const schemas = (plugin.value.schemas ?? []) as Recordable<any>[];
  if (schemas.length === 0) {
    return [];
  }

  const groups: SchemaGroupItem[] = [];
  let groupIndex = 1;
  let currentGroup: SchemaGroupItem | null = null;

  for (const schema of schemas) {
    if (isSoftGroupBegin(schema)) {
      const title = String(schema.label ?? schema.field ?? '').trim();
      currentGroup = {
        key: `group-${groupIndex}`,
        schemas: [],
        title: title || `分组${groupIndex}`,
      };
      groupIndex += 1;
      groups.push(currentGroup);
      continue;
    }

    if (!currentGroup) {
      currentGroup = {
        key: 'default',
        schemas: [],
        title: '默认',
      };
      groups.push(currentGroup);
    }
    currentGroup.schemas.push(schema);
  }

  return groups.filter((group) => group.schemas.length > 0);
});

const activeConfigGroup = computed(() => {
  const groups = pluginSchemaGroups.value;
  if (groups.length === 0) {
    return null;
  }
  return groups.find((group) => group.key === configGroupKey.value) ?? groups[0];
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

function isSchemaMarker(schema: Recordable<any>) {
  const component = String(schema?.component ?? '');
  return component === 'Divider';
}

function isSoftGroupBegin(schema: Recordable<any>) {
  return String(schema?.component ?? '') === 'SOFT_GROUP_BEGIN';
}

function getByPath(source: Recordable<any>, path: string) {
  if (!path) {
    return source;
  }
  if (Object.prototype.hasOwnProperty.call(source, path)) {
    return source[path];
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

function getConfigFieldValue(fieldPath: string) {
  return getByPath(configData.value ?? {}, fieldPath);
}

function setConfigFieldValue(fieldPath: string, value: any) {
  if (!isRecord(configData.value)) {
    configData.value = {};
  }
  if (
    configUseFlatKey.value
    && fieldPath.includes('.')
    && !Object.prototype.hasOwnProperty.call(configData.value, fieldPath)
  ) {
    configData.value[fieldPath] = value;
    return;
  }
  if (Object.prototype.hasOwnProperty.call(configData.value, fieldPath)) {
    configData.value[fieldPath] = value;
    return;
  }
  setByPath(configData.value, fieldPath, value);
}

function goPluginsPage() {
  router.push('/plugins');
}

async function loadPlugin() {
  loading.value = true;
  notFoundMessage.value = '';
  plugin.value = null;
  configData.value = {};
  configUseFlatKey.value = false;

  try {
    if (!pluginName.value) {
      notFoundMessage.value = '无效的插件名，请从插件列表重新进入';
      return;
    }
    const pluginList = await guobaStore.getPlugins(true);
    const found = pluginList.find(
      (item) => item.name.toLowerCase() === pluginName.value.toLowerCase(),
    );
    if (!found) {
      notFoundMessage.value = '未找到该插件，可能已被删除或名称错误';
      return;
    }
    plugin.value = found;

    const firstGroup = pluginSchemaGroups.value[0];
    configGroupKey.value = firstGroup?.key ?? 'default';

    if (canEditConfig.value) {
      await loadPluginConfig();
    }
  } finally {
    loading.value = false;
  }
}

async function loadPluginConfig() {
  if (!plugin.value) return;
  configLoading.value = true;
  try {
    const result = await getPluginConfigApi(plugin.value.name);
    configData.value = isRecord(result) ? cloneValue(result) : {};
    configUseFlatKey.value = Object.keys(configData.value).some((key) =>
      key.includes('.'),
    );
  } finally {
    configLoading.value = false;
  }
}

async function savePluginConfig() {
  if (!plugin.value) return;

  configSaving.value = true;
  try {
    await savePluginConfigApi(plugin.value.name, cloneValue(configData.value ?? {}));
    message.success('插件配置保存成功');
    await loadPluginConfig();
  } finally {
    configSaving.value = false;
  }
}

watch(pluginName, () => {
  loadPlugin();
});

watch(pluginSchemaGroups, (groups) => {
  const firstGroup = groups[0];
  if (firstGroup && !groups.find((group) => group.key === configGroupKey.value)) {
    configGroupKey.value = firstGroup.key;
  }
});

onMounted(() => {
  loadPlugin();
});
</script>

<template>
  <Page>
    <Skeleton v-if="loading" active />

    <Result
      v-else-if="notFoundMessage"
      status="404"
      title="插件不存在"
      :sub-title="notFoundMessage"
    >
      <template #extra>
        <Button type="primary" @click="goPluginsPage">返回插件管理</Button>
      </template>
    </Result>

    <template v-else-if="plugin">
      <Card class="plugin-summary-card">
        <div class="plugin-header">
          <div>
            <h2 class="plugin-title">{{ pageTitle }}</h2>
            <p class="plugin-desc">{{ plugin.description || '暂无说明' }}</p>
            <PluginStatusTags :plugin="plugin" />
          </div>
          <div class="plugin-header-actions">
            <Space
              v-if="canEditConfig"
              wrap
              class="plugin-header-group"
            >
              <Button :loading="configLoading" @click="loadPluginConfig">
                刷新配置
              </Button>
              <Button
                type="primary"
                :loading="configSaving"
                @click="savePluginConfig"
              >
                保存配置
              </Button>
            </Space>
          </div>
        </div>
      </Card>

      <Card>
        <Alert
          v-if="!canEditConfig"
          show-icon
          type="warning"
          :message="
            plugin.installed
              ? '该插件未提供可视化 schema，暂时无法编辑配置'
              : '插件未安装，无法编辑配置'
          "
        />

        <template v-else>
          <Tabs
            v-if="pluginSchemaGroups.length > 1"
            v-model:activeKey="configGroupKey"
            size="small"
            class="config-group-tabs"
          >
            <Tabs.TabPane
              v-for="group in pluginSchemaGroups"
              :key="group.key"
              :tab="group.title"
            />
          </Tabs>

          <Form
            v-if="activeConfigGroup"
            layout="vertical"
          >
            <template
              v-for="(schema, schemaIndex) in activeConfigGroup.schemas"
              :key="`${activeConfigGroup.key}-${schema.field || schema.label || schemaIndex}`"
            >
              <Divider v-if="isSchemaMarker(schema)">
                {{ schema.label || schema.field || '分组' }}
              </Divider>
              <SchemaField
                v-else
                :schema="schema"
                :value="getConfigFieldValue(String(schema.field ?? ''))"
                @update:value="setConfigFieldValue(String(schema.field ?? ''), $event)"
              />
            </template>
          </Form>

          <Empty
            v-else
            description="该插件未提供可视化 schema，暂时无法编辑"
          />
        </template>
      </Card>
    </template>
  </Page>
</template>

<style scoped>
:deep(.ant-skeleton),
:deep(.ant-result),
:deep(.ant-card) {
  width: 100%;
  max-width: 1440px;
  margin-right: auto;
  margin-left: auto;
}

.plugin-summary-card {
  margin-bottom: 16px;
}

.config-group-tabs {
  margin-bottom: 12px;
}

.plugin-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  flex-wrap: wrap;
}

.plugin-header-actions {
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  flex-wrap: wrap;
}

.plugin-header-group {
  margin: 0;
}

.plugin-title {
  margin: 0 0 8px;
  font-size: 20px;
  font-weight: 600;
}

.plugin-desc {
  margin: 0 0 12px;
  color: rgb(100 116 139);
}
</style>
