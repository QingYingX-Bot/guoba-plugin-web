<script lang="ts" setup>
import type { GuobaDashboardData, GuobaPlugin } from '#/api';
import type { Component } from 'vue';

import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { Bell, CircleHelp, Inbox, LayoutGrid } from '@vben/icons';
import { useUserStore } from '@vben/stores';

import { Alert, Button, Card, Empty, Skeleton, Space, Tag } from 'ant-design-vue';

import { getDashboardDataApi } from '#/api';
import { useGuobaStore } from '#/store';

const router = useRouter();
const userStore = useUserStore();
const guobaStore = useGuobaStore();

const loading = ref(true);
const errorText = ref('');
const dashboard = ref<GuobaDashboardData | null>(null);
const plugins = ref<GuobaPlugin[]>([]);

const greeting = computed(() => {
  const userName =
    userStore.userInfo?.realName
    ?? userStore.userInfo?.username
    ?? userStore.userInfo?.userId
    ?? '管理员';
  return `欢迎回来，${userName}`;
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
  return {
    configurable,
    installed,
    total,
  };
});

interface OverviewCard {
  desc: string;
  icon: Component;
  title: string;
  value: string;
}

const overviewCards = computed<OverviewCard[]>(() => {
  return [
    {
      desc: '当前会话',
      icon: Inbox,
      title: 'Cookie 用户',
      value: String(businessSummary.value.cookieCount),
    },
    {
      desc: '已接入群聊',
      icon: CircleHelp,
      title: '群聊数量',
      value: String(businessSummary.value.groupCount),
    },
    {
      desc: 'Bot 好友',
      icon: Bell,
      title: '好友数量',
      value: String(businessSummary.value.friendCount),
    },
    {
      desc: `已安装 ${pluginStats.value.installed} · 可配置 ${pluginStats.value.configurable}`,
      icon: LayoutGrid,
      title: '插件总数',
      value: String(pluginStats.value.total),
    },
  ];
});

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

function getMainAuthor(plugin: GuobaPlugin) {
  const authors = Array.isArray(plugin.author) ? plugin.author : [plugin.author];
  return String(authors[0] || '未知').trim();
}

function getInitial(text: string) {
  const content = String(text || '').trim();
  return content ? content[0]!.toUpperCase() : '?';
}

function shortDesc(text: string) {
  const value = String(text || '').trim();
  if (!value) {
    return '暂无描述';
  }
  if (value.length <= 68) {
    return value;
  }
  return `${value.slice(0, 68)}...`;
}

function openPluginDetail(plugin: GuobaPlugin) {
  router.push(`/plugin/@/${encodeURIComponent(plugin.name)}`);
}

function openPluginsPage() {
  router.push('/plugins');
}

async function loadData(force = false) {
  loading.value = true;
  try {
    const [pluginResult, dashboardResult] = await Promise.all([
      guobaStore.getPlugins(force),
      getDashboardDataApi(),
    ]);
    plugins.value = Array.isArray(pluginResult) ? pluginResult : [];
    dashboard.value = dashboardResult ?? null;
    errorText.value = '';
  } catch (error) {
    errorText.value = `数据加载失败：${
      error instanceof Error ? error.message : String(error || '未知错误')
    }`;
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadData(true);
});
</script>

<template>
  <Page auto-content-height content-class="home-page-content">
    <Skeleton v-if="loading" active />

    <template v-else>
      <div class="home-page">
        <Alert v-if="errorText" show-icon type="warning" :message="errorText" />

        <div class="top-grid">
          <Card class="welcome-card top-card">
            <h2 class="welcome-title">{{ greeting }}</h2>
            <p class="welcome-desc">欢迎使用插件后台管理系统</p>
            <Space :size="6" wrap>
              <Tag>在线插件 {{ pluginStats.total }}</Tag>
              <Tag color="green">已安装 {{ pluginStats.installed }}</Tag>
              <Tag color="purple">可配置 {{ pluginStats.configurable }}</Tag>
            </Space>
          </Card>

          <Card
            v-for="item in overviewCards"
            :key="item.title"
            class="top-card metric-card"
          >
            <div class="metric-head">
              <div class="metric-title">{{ item.title }}</div>
              <component :is="item.icon" class="metric-icon" />
            </div>
            <div class="metric-value">{{ item.value }}</div>
            <div class="metric-desc">{{ item.desc }}</div>
          </Card>
        </div>

        <Card class="overview-card" title="插件概览">
          <template #extra>
            <Button type="link" @click="openPluginsPage">更多</Button>
          </template>

          <div class="plugin-scroll">
            <div v-if="installedPlugins.length === 0" class="empty-wrap">
              <Empty description="暂无已安装插件" />
            </div>

            <div v-else class="plugin-grid">
              <div
                v-for="plugin in installedPlugins"
                :key="plugin.name"
                class="plugin-card"
                @click="openPluginDetail(plugin)"
              >
                <div class="plugin-header">
                  <div class="plugin-avatar">
                    {{ getInitial(plugin.title || plugin.name) }}
                  </div>
                  <div class="plugin-meta">
                    <div class="plugin-title">{{ plugin.title || plugin.name }}</div>
                    <div class="plugin-author">@{{ getMainAuthor(plugin) }}</div>
                  </div>
                </div>

                <div class="plugin-desc">
                  {{ shortDesc(plugin.description) }}
                </div>

                <Space :size="4" wrap>
                  <Tag color="green">已安装</Tag>
                  <Tag v-if="plugin.hasConfig" color="purple">可配置</Tag>
                  <Tag v-if="plugin.isV3" color="blue">V3</Tag>
                  <Tag v-if="plugin.isV2" color="orange">V2</Tag>
                  <Tag v-if="plugin.isDeleted" color="red">已失效</Tag>
                </Space>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </template>
  </Page>
</template>

<style scoped>
:deep(.home-page-content) {
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.home-page {
  height: 100%;
  min-height: 0;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 12px;
}

.top-grid {
  display: grid;
  grid-template-columns: 1.7fr repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.top-card :deep(.ant-card-body) {
  padding: 14px 14px 12px;
}

.welcome-title {
  margin: 0;
  font-size: 26px;
  font-weight: 700;
  line-height: 1.2;
}

.welcome-desc {
  margin: 6px 0 10px;
  font-size: 13px;
  color: hsl(var(--muted-foreground));
}

.metric-card {
  display: block;
}

.metric-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.metric-title {
  color: hsl(var(--foreground));
  font-size: 16px;
  font-weight: 600;
}

.metric-icon {
  width: 18px;
  height: 18px;
  color: hsl(var(--muted-foreground));
  opacity: 0.85;
}

.metric-value {
  margin-top: 6px;
  font-size: 42px;
  font-weight: 700;
  line-height: 1.1;
}

.metric-desc {
  margin-top: 2px;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
}

.overview-card {
  min-height: 0;
}

.overview-card :deep(.ant-card-head) {
  min-height: 48px;
  padding: 0 14px;
}

.overview-card :deep(.ant-card-head-title) {
  padding: 12px 0;
}

.overview-card :deep(.ant-card-body) {
  height: calc(100% - 48px);
  min-height: 0;
  padding: 14px;
}

.plugin-scroll {
  height: 100%;
  min-height: 0;
  overflow: auto;
  padding-right: 4px;
}

.empty-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 220px;
}

.plugin-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.plugin-card {
  border: 1px solid hsl(var(--border) / 75%);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.plugin-card:hover {
  border-color: hsl(var(--primary) / 60%);
  box-shadow: 0 4px 16px hsl(var(--primary) / 12%);
}

.plugin-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.plugin-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  color: hsl(var(--foreground));
  background: hsl(var(--muted) / 65%);
}

.plugin-meta {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.plugin-title {
  font-size: 14px;
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.plugin-author {
  margin-top: 2px;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.plugin-desc {
  font-size: 12px;
  line-height: 1.5;
  color: hsl(var(--muted-foreground));
  min-height: 36px;
}

@media (max-width: 1800px) {
  .metric-value {
    font-size: 34px;
  }
}

@media (max-width: 1480px) {
  :deep(.home-page-content) {
    overflow: auto;
  }

  .home-page {
    height: auto;
    grid-template-rows: auto;
  }

  .top-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .top-grid > :first-child {
    grid-column: 1 / -1;
  }

  .overview-card :deep(.ant-card-body) {
    height: auto;
  }

  .plugin-scroll {
    max-height: 70vh;
  }

  .plugin-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 1024px) {
  .top-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .plugin-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .welcome-title {
    font-size: 24px;
  }
}

@media (max-width: 640px) {
  .top-grid,
  .plugin-grid {
    grid-template-columns: 1fr;
  }
}
</style>
