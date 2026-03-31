<script lang="ts" setup>
import type {
  GuobaPlugin,
  GuobaPluginSchemaGroup,
} from '#/api/guoba';
import type { Recordable } from '@vben/types';

import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import {
  Button,
  Descriptions,
  Divider,
  Empty,
  Form,
  Modal,
  Skeleton,
  Space,
  Tabs,
  Typography,
  message,
} from 'ant-design-vue';

import {
  getPluginConfigApi,
  getPluginReadmeApi,
  installPluginApi,
  savePluginConfigApi,
  uninstallPluginApi,
} from '#/api';
import PluginStatusTags from '#/views/guoba/_components/plugin-status-tags.vue';
import SchemaField from '#/views/guoba/_components/schema-field.vue';

interface SchemaGroupItem {
  key: string;
  schemas: Recordable<any>[];
  title: string;
}

interface Props {
  open: boolean;
  plugin: GuobaPlugin | null;
}

const props = withDefaults(defineProps<Props>(), {
  open: false,
  plugin: null,
});

const emit = defineEmits<{
  'update:open': [boolean];
}>();

const router = useRouter();

const tabKey = ref('desc');

const configLoading = ref(false);
const configSaving = ref(false);
const configLoaded = ref(false);
const configData = ref<Recordable<any>>({});
const configUseFlatKey = ref(false);
const configGroupKey = ref('default');

const readmeLoading = ref(false);
const readmeText = ref('');

const actionLoading = ref('');

const canEditConfig = computed(() => {
  return !!(props.plugin?.installed && props.plugin?.hasConfig);
});

const canShowReadme = computed(() => {
  return !!props.plugin?.link;
});

const modalTitle = computed(() => {
  if (!props.plugin) {
    return '插件详情';
  }
  return props.plugin.title || props.plugin.name || '插件详情';
});

const pluginSchemaGroups = computed<SchemaGroupItem[]>(() => {
  if (!props.plugin) {
    return [];
  }

  const fromSchemaGroups = (props.plugin.schemaGroups ?? []) as GuobaPluginSchemaGroup[];
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

  const schemas = (props.plugin.schemas ?? []) as Recordable<any>[];
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

function parseAuthor(pluginData: GuobaPlugin) {
  const names = Array.isArray(pluginData.author)
    ? pluginData.author
    : [pluginData.author];
  return names.filter(Boolean).join(' ');
}

function closeModal() {
  emit('update:open', false);
}

function resetState() {
  tabKey.value = 'desc';
  configLoaded.value = false;
  configData.value = {};
  configUseFlatKey.value = false;
  readmeText.value = '';
  actionLoading.value = '';
  const firstGroup = pluginSchemaGroups.value[0];
  configGroupKey.value = firstGroup?.key ?? 'default';
}

async function loadPluginConfig() {
  if (!props.plugin) return;
  configLoading.value = true;
  try {
    const result = await getPluginConfigApi(props.plugin.name);
    configData.value = isRecord(result) ? cloneValue(result) : {};
    configUseFlatKey.value = Object.keys(configData.value).some((key) =>
      key.includes('.'),
    );
    configLoaded.value = true;
  } finally {
    configLoading.value = false;
  }
}

async function savePluginConfig() {
  if (!props.plugin) return;
  configSaving.value = true;
  try {
    await savePluginConfigApi(props.plugin.name, cloneValue(configData.value ?? {}));
    message.success('插件配置保存成功');
    await loadPluginConfig();
  } finally {
    configSaving.value = false;
  }
}

async function loadReadme(force = false) {
  if (!props.plugin?.link) return;
  readmeLoading.value = true;
  try {
    readmeText.value = await getPluginReadmeApi(props.plugin.link, force);
  } finally {
    readmeLoading.value = false;
  }
}

function installPlugin() {
  if (!props.plugin?.link) {
    message.warning('该插件没有提供 Git 地址，无法一键安装');
    return;
  }
  Modal.confirm({
    content: `确认安装插件 ${props.plugin.title || props.plugin.name} 吗？安装后会自动安装依赖并重启。`,
    okText: '确认安装',
    title: '安装插件',
    async onOk() {
      actionLoading.value = 'install';
      try {
        const result = await installPluginApi(props.plugin!.link, {
          autoNpmInstall: true,
          autoRestart: true,
        });
        if (result?.status === 'success') {
          message.success(result.message || '安装成功，正在准备重启');
          setTimeout(() => {
            window.location.reload();
          }, 3000);
        } else {
          message.error(result?.message || '安装失败');
        }
      } finally {
        actionLoading.value = '';
      }
    },
  });
}

function uninstallPlugin() {
  if (!props.plugin) return;
  Modal.confirm({
    content: `确认卸载插件 ${props.plugin.title || props.plugin.name} 吗？卸载后将自动重启。`,
    okButtonProps: {
      danger: true,
    },
    okText: '确认卸载',
    title: '卸载插件',
    async onOk() {
      actionLoading.value = 'uninstall';
      try {
        const result = await uninstallPluginApi(props.plugin!.name);
        if (result?.status === 'success') {
          message.success(result.message || '卸载成功，正在准备重启');
          setTimeout(() => {
            window.location.reload();
          }, 3000);
        } else {
          message.error(result?.message || '卸载失败');
        }
      } finally {
        actionLoading.value = '';
      }
    },
  });
}

function onTabChange(nextKey: number | string) {
  const next = String(nextKey);
  if (next === 'config' && props.plugin?.showInMenu) {
    closeModal();
    router.push(`/plugin/@/${encodeURIComponent(props.plugin.name)}`);
    return;
  }

  tabKey.value = next;

  if (next === 'config' && canEditConfig.value && !configLoaded.value) {
    loadPluginConfig();
  }
  if (next === 'readme' && canShowReadme.value && !readmeText.value) {
    loadReadme();
  }
}

watch(
  () => props.open,
  (opened) => {
    if (opened) {
      resetState();
    }
  },
);

watch(
  () => props.plugin,
  () => {
    resetState();
  },
);

watch(pluginSchemaGroups, (groups) => {
  const firstGroup = groups[0];
  if (firstGroup && !groups.find((group) => group.key === configGroupKey.value)) {
    configGroupKey.value = firstGroup.key;
  }
});
</script>

<template>
  <Modal
    :open="open"
    :title="modalTitle"
    :width="900"
    @cancel="closeModal"
  >
    <template #footer>
      <div class="plugin-modal-footer">
        <div>
          <Button
            v-if="tabKey === 'desc' && plugin && !plugin.installed"
            type="primary"
            :loading="actionLoading === 'install'"
            @click="installPlugin"
          >
            立即安装
          </Button>
          <Button
            v-else-if="tabKey === 'desc' && plugin?.installed && plugin.name !== 'miao-plugin'"
            danger
            :loading="actionLoading === 'uninstall'"
            @click="uninstallPlugin"
          >
            卸载
          </Button>
        </div>
        <Space>
          <Button v-if="tabKey !== 'config'" @click="closeModal">关闭</Button>
          <template v-else>
            <Button @click="closeModal">取消</Button>
            <Button
              v-if="!plugin?.showInMenu"
              type="primary"
              :loading="configSaving"
              @click="savePluginConfig"
            >
              保存配置
            </Button>
          </template>
        </Space>
      </div>
    </template>

    <Skeleton v-if="!plugin" active />

    <Tabs v-else :activeKey="tabKey" @change="onTabChange">
      <Tabs.TabPane key="desc" tab="详情">
        <Descriptions :column="1" bordered size="small">
          <Descriptions.Item label="插件标题">
            {{ plugin.title || plugin.name }}
          </Descriptions.Item>
          <Descriptions.Item label="插件名称">
            {{ plugin.name }}
          </Descriptions.Item>
          <Descriptions.Item label="插件作者">
            {{ parseAuthor(plugin) }}
          </Descriptions.Item>
          <Descriptions.Item label="插件链接">
            <a v-if="plugin.link" :href="plugin.link" target="_blank">
              {{ plugin.link }}
            </a>
            <span v-else>无</span>
          </Descriptions.Item>
          <Descriptions.Item label="插件状态">
            <PluginStatusTags :plugin="plugin" />
          </Descriptions.Item>
          <Descriptions.Item label="插件说明">
            {{ plugin.description || '暂无说明' }}
          </Descriptions.Item>
        </Descriptions>
      </Tabs.TabPane>

      <Tabs.TabPane v-if="canEditConfig" key="config" tab="配置">
        <Space class="mb-3">
          <Button :loading="configLoading" @click="loadPluginConfig">
            刷新配置
          </Button>
        </Space>

        <Tabs
          v-if="pluginSchemaGroups.length > 1"
          v-model:activeKey="configGroupKey"
          size="small"
          class="mb-3"
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
      </Tabs.TabPane>

      <Tabs.TabPane v-if="canShowReadme" key="readme" tab="README">
        <Space class="mb-3">
          <Button :loading="readmeLoading" @click="loadReadme(true)">
            刷新 README
          </Button>
        </Space>
        <Skeleton v-if="readmeLoading" active />
        <Empty v-else-if="!readmeText" description="README 为空或读取失败" />
        <Typography>
          <Typography.Paragraph v-if="readmeText" class="readme-content">
            {{ readmeText }}
          </Typography.Paragraph>
        </Typography>
      </Tabs.TabPane>
    </Tabs>
  </Modal>
</template>

<style scoped>
.plugin-modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.readme-content {
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
