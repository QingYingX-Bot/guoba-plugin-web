<script lang="ts" setup>
import type { GuobaDashboardData, GuobaPlugin } from '#/api';
import type { TableColumnsType } from 'ant-design-vue';

import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';

import {
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  Descriptions,
  Progress,
  Row,
  Skeleton,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'ant-design-vue';

import { getDashboardDataApi } from '#/api';
import { useGuobaStore } from '#/store';

const router = useRouter();
const userStore = useUserStore();
const guobaStore = useGuobaStore();

const loading = ref(true);
const pluginLoading = ref(true);
const errorText = ref('');
const dashboard = ref<GuobaDashboardData | null>(null);
const plugins = ref<GuobaPlugin[]>([]);

const pluginColumns: TableColumnsType<GuobaPlugin> = [
  {
    dataIndex: 'title',
    ellipsis: true,
    key: 'title',
    title: '插件',
  },
  {
    dataIndex: 'author',
    ellipsis: true,
    key: 'author',
    title: '作者',
    width: 160,
  },
  {
    key: 'status',
    title: '状态',
    width: 220,
  },
  {
    key: 'action',
    title: '操作',
    width: 92,
  },
];

const userName = computed(() => {
  return (
    userStore.userInfo?.realName
    ?? userStore.userInfo?.username
    ?? userStore.userInfo?.userId
    ?? '管理员'
  );
});

const businessSummary = computed(() => {
  return (
    dashboard.value?.business ?? {
      cookieCount: 0,
      friendCount: 0,
      groupCount: 0,
    }
  );
});

const pluginStats = computed(() => {
  const total = plugins.value.length;
  const installed = plugins.value.filter((item) => item.installed).length;
  const configurable = plugins.value.filter((item) => item.hasConfig).length;
  const invalid = plugins.value.filter((item) => item.isDeleted).length;
  return {
    configurable,
    installed,
    invalid,
    total,
  };
});

const summaryItems = computed(() => [
  {
    title: '插件总数',
    value: pluginStats.value.total,
  },
  {
    title: '已安装',
    value: pluginStats.value.installed,
  },
  {
    title: '群聊数量',
    value: businessSummary.value.groupCount,
  },
  {
    title: 'Cookie 用户',
    value: businessSummary.value.cookieCount,
  },
]);

const installedPlugins = computed(() => {
  return plugins.value
    .filter((item) => item.installed)
    .sort((a, b) => {
      if (Boolean(a.hasConfig) !== Boolean(b.hasConfig)) {
        return a.hasConfig ? -1 : 1;
      }
      const aTitle = String(a.title || a.name || '').toLowerCase();
      const bTitle = String(b.title || b.name || '').toLowerCase();
      return aTitle.localeCompare(bTitle);
    });
});

const accountSummary = computed(() => {
  return dashboard.value?.accounts ?? {
    currentNickname: '',
    currentPlatform: '',
    currentUin: '',
    list: [],
    offlineCount: 0,
    onlineCount: 0,
    total: 0,
  };
});

const envInfo = computed(() => {
  return dashboard.value?.env ?? {
    botMode: '',
    guobaVersion: '',
    nodeVersion: '',
    runtime: '',
    yunzaiVersion: '',
  };
});

const runtimeInfo = computed(() => dashboard.value?.runtime ?? null);
const redisInfo = computed(() => dashboard.value?.redis ?? null);

function getMainAuthor(plugin: Partial<GuobaPlugin>) {
  const authors = Array.isArray(plugin.author) ? plugin.author : [plugin.author];
  const author = String(authors[0] || '未知').trim();
  return author.replace(/^@+/, '') || '未知';
}

function getInitial(text: string) {
  const content = String(text || '').trim();
  return content ? content[0]!.toUpperCase() : '?';
}

function formatText(text?: string) {
  const value = String(text || '').trim();
  return value || '-';
}

function openPath(path: string) {
  router.push(path);
}

function openPluginDetail(plugin: Partial<GuobaPlugin>) {
  const name = String(plugin.name || '').trim();
  if (!name) {
    return;
  }
  router.push(`/plugin/@/${encodeURIComponent(name)}`);
}

async function loadData(force = false) {
  loading.value = true;
  pluginLoading.value = true;
  errorText.value = '';
  const errors: string[] = [];

  const pluginRequest = guobaStore.getPlugins(force)
    .then((pluginResult) => {
      plugins.value = Array.isArray(pluginResult) ? pluginResult : [];
    })
    .catch((error) => {
      errors.push(`插件数据加载失败：${
        error instanceof Error ? error.message : String(error || '未知错误')
      }`);
    })
    .finally(() => {
      pluginLoading.value = false;
    });

  try {
    const dashboardResult = await getDashboardDataApi();
    dashboard.value = dashboardResult ?? null;
  } catch (error) {
    errors.push(`仪表盘加载失败：${
      error instanceof Error ? error.message : String(error || '未知错误')
    }`);
  } finally {
    loading.value = false;
  }

  await pluginRequest;
  errorText.value = errors.join('；');
}

onMounted(() => {
  loadData();
});
</script>

<template>
  <Page auto-content-height content-class="home-page-content">
    <Skeleton v-if="loading" active :paragraph="{ rows: 12 }" />

    <div v-else class="home-page">
      <Alert v-if="errorText" show-icon type="warning" :message="errorText" />

      <Card class="hero-card">
        <Row :gutter="[16, 16]" align="middle" justify="space-between">
          <Col :xl="14" :lg="24" :xs="24">
            <Typography.Title :level="3" class="hero-title">
              欢迎回来，{{ userName }}
            </Typography.Title>
            <Typography.Paragraph class="hero-desc">
              管理插件、配置和运行状态
            </Typography.Paragraph>
            <Space :size="6" wrap>
              <Tag color="green">Redis {{ redisInfo?.available ? '可用' : '不可用' }}</Tag>
              <Tag>账号 {{ accountSummary.onlineCount }} / {{ accountSummary.total }}</Tag>
              <Tag v-if="pluginStats.invalid > 0" color="red">
                失效插件 {{ pluginStats.invalid }}
              </Tag>
            </Space>
          </Col>
          <Col :xl="10" :lg="24" :xs="24">
            <Space class="hero-actions" :size="8" wrap>
              <Button type="primary" @click="openPath('/plugins/market')">插件市场</Button>
              <Button @click="openPath('/config')">配置管理</Button>
              <Button @click="loadData(true)">刷新数据</Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Row :gutter="[12, 12]">
        <Col
          v-for="item in summaryItems"
          :key="item.title"
          :xl="6"
          :md="12"
          :xs="24"
        >
          <Card class="stat-card">
            <Statistic :title="item.title" :value="item.value" />
          </Card>
        </Col>
      </Row>

      <Row :gutter="[12, 12]" class="content-row">
        <Col :xl="16" :lg="24" :xs="24" class="content-col">
          <Card class="panel-card" title="已安装插件">
            <template #extra>
              <Button type="link" @click="openPath('/plugins/market')">查看全部</Button>
            </template>

            <Table
              :columns="pluginColumns"
              :data-source="installedPlugins"
              :loading="pluginLoading"
              :locale="{ emptyText: '暂无已安装插件' }"
              :pagination="false"
              row-key="name"
              size="small"
              :scroll="{ x: 720, y: 'calc(100dvh - 470px)' }"
            >
              <template #bodyCell="{ column, record: plugin }">
                <template v-if="column.key === 'title'">
                  <Space :size="10">
                    <Avatar>{{ getInitial(plugin.title || plugin.name) }}</Avatar>
                    <div class="plugin-name-cell">
                      <Typography.Text strong>{{ plugin.title || plugin.name }}</Typography.Text>
                      <Typography.Text type="secondary">{{ plugin.name }}</Typography.Text>
                    </div>
                  </Space>
                </template>

                <template v-else-if="column.key === 'author'">
                  {{ getMainAuthor(plugin) }}
                </template>

                <template v-else-if="column.key === 'status'">
                  <Space :size="4" wrap>
                    <Tag color="green">已安装</Tag>
                    <Tag v-if="plugin.hasConfig" color="purple">可配置</Tag>
                    <Tag v-if="plugin.isV3" color="blue">V3</Tag>
                    <Tag v-if="plugin.isV2" color="orange">V2</Tag>
                    <Tag v-if="plugin.isDeleted" color="red">已失效</Tag>
                  </Space>
                </template>

                <template v-else-if="column.key === 'action'">
                  <Button type="link" size="small" @click="openPluginDetail(plugin)">
                    详情
                  </Button>
                </template>
              </template>
            </Table>

          </Card>
        </Col>

        <Col :xl="8" :lg="24" :xs="24" class="content-col">
          <Space direction="vertical" :size="12" class="side-stack">
            <Card title="运行状态">
              <Descriptions :column="1" size="small">
                <Descriptions.Item label="云崽版本">
                  {{ formatText(envInfo.yunzaiVersion) }}
                </Descriptions.Item>
                <Descriptions.Item label="锅巴版本">
                  {{ formatText(envInfo.guobaVersion) }}
                </Descriptions.Item>
                <Descriptions.Item label="Node">
                  {{ formatText(envInfo.nodeVersion) }}
                </Descriptions.Item>
                <Descriptions.Item label="运行模式">
                  {{ formatText(envInfo.botMode) }}
                </Descriptions.Item>
                <Descriptions.Item label="运行时间">
                  {{ formatText(runtimeInfo?.processUptime.text) }}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <Card title="资源占用">
              <Space direction="vertical" :size="12" class="side-stack">
                <div>
                  <div class="progress-head">
                    <Typography.Text>进程内存</Typography.Text>
                    <Typography.Text type="secondary">
                      {{ runtimeInfo?.processMemory.heapUsedText ?? '-' }}
                    </Typography.Text>
                  </div>
                  <Progress
                    :percent="runtimeInfo?.processMemory.heapUsagePercent ?? 0"
                    size="small"
                  />
                </div>
                <div>
                  <div class="progress-head">
                    <Typography.Text>系统内存</Typography.Text>
                    <Typography.Text type="secondary">
                      {{ runtimeInfo?.systemMemory.usedText ?? '-' }}
                    </Typography.Text>
                  </div>
                  <Progress
                    :percent="runtimeInfo?.systemMemory.usagePercent ?? 0"
                    size="small"
                  />
                </div>
                <Descriptions :column="1" size="small">
                  <Descriptions.Item label="Redis Key">
                    {{ redisInfo?.keyCount ?? 0 }}
                  </Descriptions.Item>
                  <Descriptions.Item label="好友数量">
                    {{ businessSummary.friendCount }}
                  </Descriptions.Item>
                </Descriptions>
              </Space>
            </Card>

            <Card title="账号状态">
              <Space v-if="accountSummary.list.length > 0" direction="vertical" class="side-stack">
                <div
                  v-for="account in accountSummary.list.slice(0, 5)"
                  :key="`${account.platform}:${account.uin}`"
                  class="account-item"
                >
                  <Space :size="8">
                    <Tag :color="account.online ? 'green' : 'default'">
                      {{ account.online ? '在线' : '离线' }}
                    </Tag>
                    <Tooltip :title="account.uin">
                      <Typography.Text>{{ account.nickname || account.uin }}</Typography.Text>
                    </Tooltip>
                  </Space>
                  <Typography.Text type="secondary">{{ account.platform }}</Typography.Text>
                </div>
              </Space>
              <Empty v-else description="暂无账号数据" />
            </Card>
          </Space>
        </Col>
      </Row>
    </div>
  </Page>
</template>

<style scoped>
:deep(.home-page-content) {
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.home-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.hero-card :deep(.ant-card-body) {
  padding: 16px 24px;
}

.hero-title {
  margin: 0 0 6px !important;
}

.hero-desc {
  margin-bottom: 8px !important;
  color: hsl(var(--muted-foreground));
}

.stat-card :deep(.ant-card-body) {
  padding: 14px 24px;
}

.stat-card :deep(.ant-statistic-title) {
  margin-bottom: 6px;
}

.stat-card :deep(.ant-statistic-content) {
  font-size: 22px;
}

.hero-actions {
  width: 100%;
  justify-content: flex-end;
}

.content-row {
  flex: 1;
  min-height: 0;
}

.content-col {
  display: flex;
  min-height: 0;
}

.panel-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  width: 100%;
}

.panel-card :deep(.ant-card-body) {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.panel-card :deep(.ant-table-wrapper),
.panel-card :deep(.ant-spin-nested-loading),
.panel-card :deep(.ant-spin-container) {
  height: 100%;
  min-height: 0;
}

.panel-card :deep(.ant-spin-container) {
  display: flex;
  flex-direction: column;
}

.panel-card :deep(.ant-table) {
  flex: 1;
  min-height: 0;
}

.side-stack {
  height: 100%;
  min-height: 0;
  overflow: auto;
  width: 100%;
}

.side-stack :deep(.ant-card-body) {
  padding: 14px 24px;
}

.plugin-name-cell {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.progress-head,
.account-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

@media (max-width: 1200px) {
  :deep(.home-page-content) {
    overflow: auto;
  }

  .home-page {
    height: auto;
  }

  .hero-actions {
    justify-content: flex-start;
  }
}
</style>
