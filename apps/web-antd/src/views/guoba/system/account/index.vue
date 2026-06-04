<script lang="ts" setup>
import type { GuobaUserAccount } from '#/api';
import type { TableColumnsType, TablePaginationConfig } from 'ant-design-vue';

import { computed, onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { Button, Card, Input, Space, Table, Tag, message } from 'ant-design-vue';

import { getAccountsApi, setUserAccountStatusApi } from '#/api';

import AccountDetailDrawer from './components/AccountDetailDrawer.vue';

const accountListLoading = ref(false);
const accountList = ref<GuobaUserAccount[]>([]);
const actionPendingMap = ref<Record<string, boolean>>({});
const keyword = ref('');
const detailOpen = ref(false);
const selectedAccountId = ref('');
const pagination = reactive({ page: 1, pageSize: 20, total: 0 });

const columns: TableColumnsType<GuobaUserAccount> = [
  { dataIndex: 'index', key: 'index', title: '#', width: 64 },
  { dataIndex: 'userId', key: 'userId', title: '账号ID', width: 240 },
  { dataIndex: 'realName', key: 'realName', title: '昵称', width: 180 },
  { dataIndex: 'platform', key: 'platform', title: '平台', width: 120 },
  { key: 'adapter', title: '适配器', width: 220 },
  { key: 'meta', title: '备注', width: 180 },
  { dataIndex: 'friendCount', key: 'friendCount', title: '好友数', width: 100 },
  { dataIndex: 'groupCount', key: 'groupCount', title: '群/频道数', width: 120 },
  { dataIndex: 'onlineDuration', key: 'onlineDuration', title: '在线时长', width: 150 },
  { key: 'status', title: '状态', width: 100 },
  { key: 'action', title: '操作', width: 210 },
];

const tablePagination = computed(() => ({
  current: pagination.page,
  pageSize: pagination.pageSize,
  showSizeChanger: true,
  total: pagination.total,
}));

function isActionPending(userId: string) {
  return !!actionPendingMap.value[userId];
}

function toUserAccount(record: unknown) {
  return record as GuobaUserAccount;
}

function openDetail(record: GuobaUserAccount) {
  selectedAccountId.value = record.userId;
  detailOpen.value = true;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '操作失败';
}

async function updateAccountStatus(record: GuobaUserAccount, action: 'disable' | 'enable') {
  const userId = String(record.userId || '').trim();
  if (!userId || isActionPending(userId)) {
    return;
  }
  actionPendingMap.value[userId] = true;
  try {
    await setUserAccountStatusApi({ action, userId });
    message.success(action === 'enable' ? '已发送启用操作' : '已发送禁用操作');
    await loadAccountList();
  } catch (error: unknown) {
    message.error(getErrorMessage(error));
  } finally {
    actionPendingMap.value[userId] = false;
  }
}

async function loadAccountList() {
  accountListLoading.value = true;
  try {
    const page = await getAccountsApi({
      keyword: keyword.value.trim(),
      page: pagination.page,
      pageSize: pagination.pageSize,
    });
    accountList.value = page?.items ?? [];
    pagination.total = page?.total ?? 0;
  } finally {
    accountListLoading.value = false;
  }
}

function handleSearch() {
  pagination.page = 1;
  loadAccountList();
}

function handleTableChange(next: TablePaginationConfig) {
  pagination.page = Number(next.current || 1);
  pagination.pageSize = Number(next.pageSize || 20);
  loadAccountList();
}

onMounted(() => {
  loadAccountList();
});
</script>

<template>
  <Page description="账号列表" title="账号管理">
    <Card title="账号列表">
      <template #extra>
        <Space>
          <Input v-model:value="keyword" allow-clear placeholder="账号、昵称、平台" @press-enter="handleSearch" />
          <Button type="primary" @click="handleSearch">搜索</Button>
          <Button :loading="accountListLoading" @click="loadAccountList">刷新</Button>
        </Space>
      </template>

      <Table
        :columns="columns"
        :data-source="accountList"
        :loading="accountListLoading"
        :pagination="tablePagination"
        :scroll="{ x: 1680 }"
        row-key="userId"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'adapter'">
            {{ record.adapterName ? `${record.adapterName}${record.adapterId ? ` (${record.adapterId})` : ''}` : record.adapterId || '-' }}
          </template>
          <template v-else-if="column.key === 'meta'">
            {{ record.meta?.remark || '-' }}
          </template>
          <template v-else-if="column.key === 'status'">
            <Tag :color="record.status === 'online' ? 'success' : 'default'">
              {{ record.status === 'online' ? '在线' : '离线' }}
            </Tag>
          </template>
          <template v-else-if="column.key === 'action'">
            <Space>
              <Button @click="openDetail(toUserAccount(record))">详情</Button>
              <Button
                v-if="record.status === 'online'"
                danger
                :disabled="record.canDisable === false || isActionPending(record.userId)"
                @click="updateAccountStatus(toUserAccount(record), 'disable')"
              >
                禁用
              </Button>
              <Button
                v-else
                type="primary"
                :disabled="record.canEnable === false || isActionPending(record.userId)"
                @click="updateAccountStatus(toUserAccount(record), 'enable')"
              >
                启用
              </Button>
            </Space>
          </template>
        </template>
      </Table>
    </Card>

    <AccountDetailDrawer
      v-model:open="detailOpen"
      :account-id="selectedAccountId"
      @saved="loadAccountList"
    />
  </Page>
</template>
