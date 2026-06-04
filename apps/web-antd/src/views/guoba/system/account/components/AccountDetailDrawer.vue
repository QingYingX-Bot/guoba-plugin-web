<script lang="ts" setup>
import type { GuobaAccountDetail, GuobaContactTarget, GuobaPage } from '#/api';
import type { TableColumnsType } from 'ant-design-vue';

import { ref, watch } from 'vue';

import {
  Descriptions,
  Drawer,
  Table,
  Tabs,
  Tag,
} from 'ant-design-vue';

import {
  getAccountDetailApi,
  getAccountFriendsApi,
  getAccountGroupsApi,
} from '#/api';

const props = defineProps<{
  accountId: string;
  open: boolean;
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
}>();

const loading = ref(false);
const detail = ref<GuobaAccountDetail>();
const friends = ref<GuobaContactTarget[]>([]);
const groups = ref<GuobaContactTarget[]>([]);

const targetColumns: TableColumnsType<GuobaContactTarget> = [
  { dataIndex: 'id', key: 'id', title: 'ID', width: 180 },
  { dataIndex: 'name', key: 'name', title: '名称' },
];
const groupColumns: TableColumnsType<GuobaContactTarget> = [
  { dataIndex: 'id', key: 'id', title: 'ID', width: 180 },
  { dataIndex: 'name', key: 'name', title: '名称' },
  { dataIndex: 'memberCount', key: 'memberCount', title: '成员数', width: 100 },
];

function closeDrawer() {
  emit('update:open', false);
}

async function loadDetail() {
  const accountId = props.accountId;
  if (!props.open || !accountId) {
    return;
  }
  loading.value = true;
  try {
    const [nextDetail, friendPage, groupPage] = await Promise.all([
      getAccountDetailApi(accountId),
      getAccountFriendsApi(accountId, { page: 1, pageSize: 20 }),
      getAccountGroupsApi(accountId, { page: 1, pageSize: 20 }),
    ]);
    detail.value = nextDetail;
    friends.value = normalizePage(friendPage);
    groups.value = normalizePage(groupPage);
  } finally {
    loading.value = false;
  }
}

function normalizePage(page?: GuobaPage<GuobaContactTarget>) {
  return Array.isArray(page?.items) ? page.items : [];
}

watch(() => [props.open, props.accountId], loadDetail, { immediate: true });
</script>

<template>
  <Drawer destroy-on-close :open="open" placement="right" title="账号详情" width="720" @close="closeDrawer">
    <Tabs>
      <Tabs.TabPane key="summary" tab="概览">
        <Descriptions bordered :column="1" size="small">
          <Descriptions.Item label="账号ID">
            {{ detail?.userId || accountId }}
          </Descriptions.Item>
          <Descriptions.Item label="昵称">
            {{ detail?.realName || '-' }}
          </Descriptions.Item>
          <Descriptions.Item label="平台">
            {{ detail?.platform || '-' }}
          </Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag :color="detail?.status === 'online' ? 'success' : 'default'">
              {{ detail?.status === 'online' ? '在线' : '离线' }}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="能力">
            私聊 {{ detail?.capabilities?.canSendPrivate ? '支持' : '受限' }} /
            群聊 {{ detail?.capabilities?.canSendGroup ? '支持' : '受限' }}
          </Descriptions.Item>
        </Descriptions>
      </Tabs.TabPane>

      <Tabs.TabPane key="diagnostics" tab="诊断">
        <Descriptions bordered :column="1" size="small">
          <Descriptions.Item label="适配器">
            {{ detail?.diagnostics?.adapterName || detail?.diagnostics?.adapterId || '-' }}
          </Descriptions.Item>
          <Descriptions.Item label="WebSocket">
            {{ detail?.diagnostics?.wsReadyState ?? '-' }}
          </Descriptions.Item>
          <Descriptions.Item label="登录方法">
            {{ detail?.diagnostics?.hasLogin ? '可用' : '不可用' }}
          </Descriptions.Item>
          <Descriptions.Item label="下线方法">
            {{ detail?.diagnostics?.hasLogout ? '可用' : '不可用' }}
          </Descriptions.Item>
        </Descriptions>
      </Tabs.TabPane>

      <Tabs.TabPane key="friends" tab="好友">
        <Table :columns="targetColumns" :data-source="friends" :loading="loading" :pagination="{ pageSize: 10 }" row-key="id" size="small" />
      </Tabs.TabPane>

      <Tabs.TabPane key="groups" tab="群/频道">
        <Table :columns="groupColumns" :data-source="groups" :loading="loading" :pagination="{ pageSize: 10 }" row-key="id" size="small" />
      </Tabs.TabPane>
    </Tabs>
  </Drawer>
</template>
