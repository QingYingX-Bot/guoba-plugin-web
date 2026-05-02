<script lang="ts" setup>
import type { GuobaPlugin } from '#/api/guoba';
import type { TableColumnsType } from 'ant-design-vue';

import { computed, h, onMounted, reactive, ref, watch } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  Checkbox,
  Empty,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tabs,
  message,
} from 'ant-design-vue';

import { installPluginApi, uninstallPluginApi } from '#/api';
import { useGuobaStore } from '#/store';
import PluginDetailModal from '#/views/guoba/_components/plugin-detail-modal.vue';
import PluginStatusTags from '#/views/guoba/_components/plugin-status-tags.vue';

const guobaStore = useGuobaStore();

const loading = ref(true);
const plugins = ref<GuobaPlugin[]>([]);
const statusKey = ref<'installed' | 'uninstalled'>('installed');
const keyword = ref('');
const selectedAuthors = ref<string[]>([]);
const selectedRowKeys = ref<string[]>([]);
const customInstallLink = ref('');
const actionLoading = ref('');
const installAutoNpm = ref(true);
const installAutoRestart = ref(true);
const installPackageManager = ref('pnpm');
const detailOpen = ref(false);
const detailPlugin = ref<GuobaPlugin | null>(null);
const pagination = reactive({
  current: 1,
  pageSize: 10,
  showQuickJumper: true,
  showSizeChanger: true,
  pageSizeOptions: ['10', '50', '80', '100'],
  showTotal: (total: number) => `共 ${total} 条`,
});

const columns: TableColumnsType<GuobaPlugin> = [
  {
    dataIndex: 'title',
    ellipsis: true,
    key: 'title',
    title: '插件标题',
    width: 220,
  },
  {
    dataIndex: 'name',
    key: 'name',
    title: '插件名称',
    width: 220,
  },
  {
    dataIndex: 'author',
    key: 'author',
    title: '插件作者',
    width: 220,
  },
  {
    dataIndex: 'description',
    ellipsis: true,
    key: 'description',
    title: '插件说明',
  },
  {
    dataIndex: 'installed',
    key: 'status',
    title: '状态',
    width: 220,
  },
  {
    key: 'action',
    title: '操作',
    width: 180,
  },
];

const packageManagerOptions = [
  { label: '自动', value: 'auto' },
  { label: 'pnpm', value: 'pnpm' },
  { label: 'npm', value: 'npm' },
  { label: 'yarn', value: 'yarn' },
  { label: 'bun', value: 'bun' },
  { label: '跳过', value: 'none' },
];

const authorOptions = computed(() => {
  const map = new Set<string>();
  plugins.value.forEach((item) => {
    const authors = Array.isArray(item.author) ? item.author : [item.author];
    authors.forEach((author) => {
      if (author) {
        map.add(author);
      }
    });
  });
  return Array.from(map).map((item) => ({
    label: item.replace(/^@/, ''),
    value: item,
  }));
});

const filteredPlugins = computed(() => {
  let data = plugins.value.filter((item) => {
    return statusKey.value === 'installed' ? item.installed : !item.installed;
  });

  const text = keyword.value.trim().toLowerCase();
  if (text) {
    data = data.filter((item) => {
      const haystack = `${item.title} ${item.name} ${item.description}`.toLowerCase();
      return haystack.includes(text);
    });
  }

  if (selectedAuthors.value.length > 0) {
    data = data.filter((item) => {
      const authors = Array.isArray(item.author) ? item.author : [item.author];
      return authors.some((author) => selectedAuthors.value.includes(author));
    });
  }

  return data;
});

const rowSelection = computed(() => {
  if (statusKey.value !== 'installed') {
    return undefined;
  }

  return {
    onChange: (keys: (number | string)[]) => {
      selectedRowKeys.value = keys.map((item) => String(item));
    },
    selectedRowKeys: selectedRowKeys.value,
  };
});

function getAuthors(plugin: Record<string, any>) {
  const names = Array.isArray(plugin.author) ? plugin.author : [plugin.author];
  const links = Array.isArray(plugin.authorLink)
    ? plugin.authorLink
    : plugin.authorLink
      ? [plugin.authorLink]
      : [];
  return names.map((name, index) => ({
    link: links[index] ?? '',
    name,
  }));
}

function openPluginDetail(plugin: GuobaPlugin) {
  detailPlugin.value = plugin;
  detailOpen.value = true;
}

async function loadPlugins(force = false) {
  loading.value = true;
  try {
    plugins.value = await guobaStore.getPlugins(force);
  } finally {
    loading.value = false;
  }
}

async function installByLink(link: string) {
  const installLink = link.trim();
  if (!installLink) {
    message.warning('请输入插件 Git 地址');
    return;
  }

  actionLoading.value = `install:${installLink}`;
  try {
    const result = await installPluginApi(installLink, {
      autoNpmInstall: installAutoNpm.value,
      autoRestart: installAutoRestart.value,
      packageManager: installPackageManager.value,
    });
    showInstallLogs(result?.logs);
    if (result?.status === 'success') {
      message.success(result.message || '安装成功，正在准备重启');
      if (installAutoRestart.value) {
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      } else {
        await loadPlugins(true);
      }
    } else {
      message.error(result?.message || '安装失败');
    }
  } finally {
    actionLoading.value = '';
  }
}

function showInstallLogs(logs?: string[]) {
  if (!logs?.length) {
    return;
  }
  Modal.info({
    content: () => h('pre', { class: 'install-log-output' }, logs.join('\n\n')),
    okText: '关闭',
    title: '安装日志',
    width: 760,
  });
}

function installPlugin(plugin: Record<string, any>) {
  if (!plugin.link) {
    message.warning('该插件没有提供 Git 地址，无法一键安装');
    return;
  }
  Modal.confirm({
    content: `确认安装插件 ${plugin.title || plugin.name} 吗？`,
    okText: '确认安装',
    title: '安装插件',
    onOk: () => installByLink(plugin.link),
  });
}

async function uninstallByNames(names: string[]) {
  if (names.length === 0) {
    return;
  }
  actionLoading.value = `uninstall:${names.join(',')}`;
  try {
    const result = await uninstallPluginApi(names.join(','));
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
}

function uninstallPlugin(plugin: Record<string, any>) {
  Modal.confirm({
    content: `确认卸载插件 ${plugin.title || plugin.name} 吗？卸载后将自动重启。`,
    okButtonProps: {
      danger: true,
    },
    okText: '确认卸载',
    title: '卸载插件',
    onOk: () => uninstallByNames([plugin.name]),
  });
}

function uninstallBatch() {
  if (selectedRowKeys.value.length === 0) {
    message.warning('请先选择要卸载的插件');
    return;
  }
  Modal.confirm({
    content: `确认批量卸载这 ${selectedRowKeys.value.length} 个插件吗？卸载后将自动重启。`,
    okButtonProps: {
      danger: true,
    },
    okText: '确认卸载',
    title: '批量卸载插件',
    onOk: () => uninstallByNames([...selectedRowKeys.value]),
  });
}

function installCustomPlugin() {
  const link = customInstallLink.value.trim();
  if (!link) {
    message.warning('请输入插件 Git 地址');
    return;
  }
  try {
    new URL(link);
  } catch {
    message.warning('请输入合法的 Git 地址（URL）');
    return;
  }

  Modal.confirm({
    content: `确认安装自定义插件：${link} ？`,
    okText: '确认安装',
    title: '安装自定义插件',
    async onOk() {
      await installByLink(link);
      customInstallLink.value = '';
    },
  });
}

function onTabChange() {
  selectedRowKeys.value = [];
  pagination.current = 1;
}

function onTableChange(nextPagination: any) {
  const current = Number(nextPagination?.current ?? 1);
  const pageSize = Number(nextPagination?.pageSize ?? pagination.pageSize);

  if (pageSize !== pagination.pageSize) {
    pagination.pageSize = pageSize;
    pagination.current = 1;
    return;
  }

  pagination.current = current;
}

onMounted(() => {
  loadPlugins(true);
});

watch(
  [keyword, selectedAuthors, statusKey],
  () => {
    pagination.current = 1;
  },
  { deep: true },
);
</script>

<template>
  <Page title="插件管理">
    <template #description>
      插件列表来源：
      <a
        href="https://gitee.com/yhArcadia/Yunzai-Bot-plugins-index"
        target="_blank"
      >
        Yunzai-Bot 插件索引
      </a>
    </template>

    <Card>
      <Space class="mb-4" direction="vertical" style="width: 100%">
        <Space style="width: 100%" wrap>
          <Input
            v-model:value="keyword"
            allow-clear
            placeholder="过滤正则：匹配标题/名称/说明"
            style="width: 280px"
          />
          <Select
            v-model:value="selectedAuthors"
            allow-clear
            mode="multiple"
            placeholder="选择插件作者"
            style="width: 300px"
            :options="authorOptions"
          />
          <Button :loading="loading" @click="loadPlugins(true)">刷新</Button>
        </Space>

        <Tabs v-model:activeKey="statusKey" @change="onTabChange">
          <Tabs.TabPane key="installed" tab="已安装" />
          <Tabs.TabPane key="uninstalled" tab="未安装" />
        </Tabs>

        <Space wrap>
          <Input
            v-model:value="customInstallLink"
            allow-clear
            placeholder="输入插件 Git 地址进行安装"
            style="width: 400px"
          />
          <Button type="primary" @click="installCustomPlugin">
            安装自定义插件
          </Button>
          <Select
            v-model:value="installPackageManager"
            :disabled="!installAutoNpm"
            :options="packageManagerOptions"
            style="width: 120px"
          />
          <Checkbox v-model:checked="installAutoNpm">
            安装依赖
          </Checkbox>
          <Checkbox v-model:checked="installAutoRestart">
            自动重启
          </Checkbox>
          <Button
            v-if="statusKey === 'installed'"
            danger
            @click="uninstallBatch"
          >
            批量卸载（{{ selectedRowKeys.length }}）
          </Button>
        </Space>
      </Space>

      <Table
        :columns="columns"
        :data-source="filteredPlugins"
        :loading="loading"
        :pagination="pagination"
        row-key="name"
        :row-selection="rowSelection"
        @change="onTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'title'">
            <a @click="openPluginDetail(record as GuobaPlugin)">
              {{ record.title || record.name }}
            </a>
          </template>

          <template v-else-if="column.key === 'name'">
            <a v-if="record.link" :href="record.link" target="_blank">
              {{ record.name }}
            </a>
            <span v-else>{{ record.name }}</span>
          </template>

          <template v-else-if="column.key === 'author'">
            <Space wrap>
              <template
                v-for="author in getAuthors(record)"
                :key="`${record.name}-${author.name}-${author.link}`"
              >
                <a v-if="author.link" :href="author.link" target="_blank">
                  {{ author.name }}
                </a>
                <span v-else>{{ author.name }}</span>
              </template>
            </Space>
          </template>

          <template v-else-if="column.key === 'status'">
            <PluginStatusTags :plugin="record as GuobaPlugin" />
          </template>

          <template v-else-if="column.key === 'action'">
            <Space>
              <Button size="small" @click="openPluginDetail(record as GuobaPlugin)">
                详情
              </Button>
              <Button
                v-if="!record.installed"
                size="small"
                type="primary"
                :loading="actionLoading.startsWith('install:')"
                @click="installPlugin(record)"
              >
                安装
              </Button>
              <Button
                v-else-if="record.name !== 'miao-plugin'"
                danger
                size="small"
                :loading="actionLoading.startsWith('uninstall:')"
                @click="uninstallPlugin(record)"
              >
                卸载
              </Button>
            </Space>
          </template>
        </template>

        <template #emptyText>
          <Empty description="暂无插件数据" />
        </template>
      </Table>
    </Card>

    <PluginDetailModal
      v-model:open="detailOpen"
      :plugin="detailPlugin"
    />
  </Page>
</template>

<style scoped>
.install-log-output {
  max-height: 460px;
  margin: 0;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
