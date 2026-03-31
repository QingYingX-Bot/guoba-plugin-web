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
const readmeHtml = computed(() => {
  return renderMarkdown(readmeText.value);
});

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

function escapeAttribute(text: string) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeHtml(text: string) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function isSafeImageSize(size?: string) {
  return !!(size && /^\d+(\.\d+)?(%|px)$/.test(size.trim()));
}

function sanitizeUrl(url: string) {
  const trimmed = String(url ?? '').trim();
  if (!trimmed) {
    return '';
  }
  if (/^(https?:\/\/|\/|#)/i.test(trimmed)) {
    return trimmed;
  }
  if (/^data:image\/(png|jpe?g|gif|webp|bmp|svg\+xml);base64,/i.test(trimmed)) {
    return trimmed;
  }
  return '';
}

function buildImageHtml(options: {
  align?: string;
  alt?: string;
  src: string;
  title?: string;
  width?: string;
}) {
  const src = sanitizeUrl(options.src);
  if (!src) {
    return '';
  }

  const attrs = [
    `alt="${escapeAttribute(String(options.alt ?? ''))}"`,
    'loading="lazy"',
    `src="${escapeAttribute(src)}"`,
  ];

  const title = String(options.title ?? '').trim();
  if (title) {
    attrs.push(`title="${escapeAttribute(title)}"`);
  }

  const style: string[] = ['max-width:100%;'];
  const width = String(options.width ?? '').trim();
  if (isSafeImageSize(width)) {
    style.push(`width:${width};`);
  }

  const align = String(options.align ?? '').trim().toLowerCase();
  if (align === 'center') {
    style.push('display:block;');
    style.push('margin:0 auto;');
  } else if (align === 'left') {
    style.push('float:left;');
    style.push('margin:0 12px 12px 0;');
  } else if (align === 'right') {
    style.push('float:right;');
    style.push('margin:0 0 12px 12px;');
  }

  attrs.push(`style="${escapeAttribute(style.join(''))}"`);
  return `<img ${attrs.join(' ')} />`;
}

function parseHtmlImageTag(tag: string) {
  const src = tag.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1];
  if (!src) {
    return '';
  }
  const alt = tag.match(/\balt\s*=\s*["']([^"']*)["']/i)?.[1];
  const width = tag.match(/\bwidth\s*=\s*["']([^"']+)["']/i)?.[1];
  const align = tag.match(/\balign\s*=\s*["']([^"']+)["']/i)?.[1];
  const title = tag.match(/\btitle\s*=\s*["']([^"']+)["']/i)?.[1];
  return buildImageHtml({
    align,
    alt,
    src,
    title,
    width,
  });
}

function renderInlineMarkdown(line: string) {
  if (!line) {
    return '';
  }

  const tokenStore: string[] = [];
  const pushToken = (html: string) => {
    const token = `@@README_TOKEN_${tokenStore.length}@@`;
    tokenStore.push(html);
    return token;
  };

  let content = line;

  content = content.replace(/<img\s+[^>]*src\s*=\s*["'][^"']+["'][^>]*>/gi, (tag) => {
    const html = parseHtmlImageTag(tag);
    return html ? pushToken(html) : '';
  });

  content = content.replace(/`([^`\n]+)`/g, (_match, code: string) => {
    return pushToken(`<code>${escapeHtml(code)}</code>`);
  });

  content = content.replace(
    /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g,
    (_match, alt: string, rawUrl: string, title?: string) => {
      const html = buildImageHtml({
        alt,
        src: rawUrl,
        title,
      });
      return html ? pushToken(html) : '';
    },
  );

  content = content.replace(
    /\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g,
    (_match, text: string, rawUrl: string, title?: string) => {
      const safeUrl = sanitizeUrl(rawUrl);
      if (!safeUrl) {
        return escapeHtml(text);
      }

      const attrs = [
        `href="${escapeAttribute(safeUrl)}"`,
        'target="_blank"',
        'rel="noopener noreferrer"',
      ];

      const titleText = String(title ?? '').trim();
      if (titleText) {
        attrs.push(`title="${escapeAttribute(titleText)}"`);
      }

      return pushToken(`<a ${attrs.join(' ')}>${escapeHtml(text)}</a>`);
    },
  );

  content = escapeHtml(content);
  content = content
    .replace(/~~([^~]+)~~/g, '<del>$1</del>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>');

  for (let index = 0; index < tokenStore.length; index += 1) {
    content = content.replaceAll(`@@README_TOKEN_${index}@@`, tokenStore[index] ?? '');
  }

  return content;
}

function renderMarkdown(markdown: string) {
  const source = String(markdown ?? '').replace(/\r\n?/g, '\n').trim();
  if (!source) {
    return '';
  }

  const lines = source.split('\n');
  const html: string[] = [];
  let paragraph: string[] = [];
  let listType: 'ol' | 'ul' | null = null;
  let listItems: string[] = [];
  let inCodeBlock = false;
  let codeLang = '';
  let codeLines: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) {
      return;
    }
    html.push(`<p>${renderInlineMarkdown(paragraph.join(' '))}</p>`);
    paragraph = [];
  };

  const flushList = () => {
    if (!listType || listItems.length === 0) {
      return;
    }
    html.push(`<${listType}>${listItems.join('')}</${listType}>`);
    listType = null;
    listItems = [];
  };

  const flushCode = () => {
    if (!inCodeBlock) {
      return;
    }
    const className = codeLang ? ` class="language-${escapeAttribute(codeLang)}"` : '';
    html.push(`<pre><code${className}>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
    inCodeBlock = false;
    codeLang = '';
    codeLines = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (inCodeBlock) {
      if (/^```/.test(trimmed)) {
        flushCode();
      } else {
        codeLines.push(line);
      }
      continue;
    }

    const codeStart = trimmed.match(/^```([\w+-]*)\s*$/);
    if (codeStart) {
      flushParagraph();
      flushList();
      inCodeBlock = true;
      codeLang = codeStart[1] ?? '';
      codeLines = [];
      continue;
    }

    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      const level = Math.min(6, heading[1]?.length ?? 1);
      html.push(`<h${level}>${renderInlineMarkdown(heading[2] ?? '')}</h${level}>`);
      continue;
    }

    if (/^(\*{3,}|-{3,}|_{3,})$/.test(trimmed)) {
      flushParagraph();
      flushList();
      html.push('<hr />');
      continue;
    }

    const blockquote = trimmed.match(/^>\s?(.*)$/);
    if (blockquote) {
      flushParagraph();
      flushList();
      html.push(`<blockquote><p>${renderInlineMarkdown(blockquote[1] ?? '')}</p></blockquote>`);
      continue;
    }

    const htmlImgLine = trimmed.match(/^<img\s+[^>]*src\s*=\s*["'][^"']+["'][^>]*>$/i);
    if (htmlImgLine) {
      flushParagraph();
      flushList();
      const imageHtml = parseHtmlImageTag(trimmed);
      if (imageHtml) {
        html.push(`<p>${imageHtml}</p>`);
      }
      continue;
    }

    const ulMatch = trimmed.match(/^[-*+]\s+(.+)$/);
    if (ulMatch) {
      flushParagraph();
      if (listType && listType !== 'ul') {
        flushList();
      }
      listType = 'ul';
      listItems.push(`<li>${renderInlineMarkdown(ulMatch[1] ?? '')}</li>`);
      continue;
    }

    const olMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (olMatch) {
      flushParagraph();
      if (listType && listType !== 'ol') {
        flushList();
      }
      listType = 'ol';
      listItems.push(`<li>${renderInlineMarkdown(olMatch[1] ?? '')}</li>`);
      continue;
    }

    paragraph.push(trimmed);
  }

  flushParagraph();
  flushList();
  flushCode();

  return html.join('\n');
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
        <Empty v-else-if="!readmeHtml" description="README 为空或读取失败" />
        <div v-else class="readme-content" v-html="readmeHtml"></div>
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
  max-height: 62vh;
  overflow: auto;
  padding-right: 6px;
  line-height: 1.75;
  word-break: break-word;
}

.readme-content :deep(h1),
.readme-content :deep(h2),
.readme-content :deep(h3),
.readme-content :deep(h4),
.readme-content :deep(h5),
.readme-content :deep(h6) {
  margin: 1em 0 0.5em;
  font-weight: 600;
  line-height: 1.4;
}

.readme-content :deep(h1) {
  font-size: 1.5rem;
}

.readme-content :deep(h2) {
  font-size: 1.3rem;
}

.readme-content :deep(h3) {
  font-size: 1.15rem;
}

.readme-content :deep(p) {
  margin: 0.6em 0;
}

.readme-content :deep(ul),
.readme-content :deep(ol) {
  margin: 0.6em 0;
  padding-left: 1.6em;
}

.readme-content :deep(li + li) {
  margin-top: 0.3em;
}

.readme-content :deep(a) {
  color: #1677ff;
  text-decoration: underline;
}

.readme-content :deep(img) {
  border-radius: 6px;
  max-width: 100%;
  height: auto;
}

.readme-content :deep(pre) {
  margin: 0.8em 0;
  padding: 0.8em;
  border-radius: 8px;
  overflow: auto;
  background: #0f172a;
  color: #e2e8f0;
}

.readme-content :deep(code) {
  padding: 0.1em 0.35em;
  border-radius: 4px;
  background: rgba(15, 23, 42, 0.08);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.readme-content :deep(pre code) {
  padding: 0;
  background: transparent;
  color: inherit;
}

.readme-content :deep(blockquote) {
  margin: 0.8em 0;
  padding: 0.2em 0.8em;
  border-left: 4px solid #d0d7de;
  background: #f6f8fa;
}

.readme-content :deep(hr) {
  margin: 1em 0;
  border: 0;
  border-top: 1px solid #e5e7eb;
}
</style>
