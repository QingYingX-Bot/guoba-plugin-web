<script lang="ts" setup>
import type { GuobaUserAccount } from '#/api';
import type { TableColumnsType } from 'ant-design-vue';

import { onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { Button, Card, Space, Table, Tag, message } from 'ant-design-vue';

import { getUserListApi, setUserAccountStatusApi } from '#/api';

const accountListLoading = ref(false);
const accountList = ref<GuobaUserAccount[]>([]);
const actionPendingMap = ref<Record<string, boolean>>({});

const columns: TableColumnsType<GuobaUserAccount> = [
  {
    dataIndex: 'index',
    key: 'index',
    title: '#',
    width: 64,
  },
  {
    dataIndex: 'userId',
    key: 'userId',
    title: '账号ID',
    width: 300,
  },
  {
    dataIndex: 'realName',
    key: 'realName',
    title: '昵称',
    width: 200,
  },
  {
    dataIndex: 'platform',
    key: 'platform',
    title: '平台',
    width: 140,
  },
  {
    key: 'adapter',
    title: '适配器',
    width: 240,
  },
  {
    dataIndex: 'friendCount',
    key: 'friendCount',
    title: '好友数',
    width: 110,
  },
  {
    dataIndex: 'groupCount',
    key: 'groupCount',
    title: '群/频道数',
    width: 130,
  },
  {
    dataIndex: 'onlineDuration',
    key: 'onlineDuration',
    title: '在线时长',
    width: 180,
  },
  {
    key: 'status',
    title: '状态',
    width: 120,
  },
  {
    key: 'action',
    title: '操作',
    width: 140,
  },
];

function isActionPending(userId: string) {
  return !!actionPendingMap.value[userId];
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
  } catch (error: any) {
    message.error(error?.message || '操作失败');
  } finally {
    actionPendingMap.value[userId] = false;
  }
}

async function loadAccountList() {
  accountListLoading.value = true;
  try {
    accountList.value = (await getUserListApi()) ?? [];
  } finally {
    accountListLoading.value = false;
  }
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
          <Tag color="blue">
            共 {{ accountList.length }} 个账号
          </Tag>
          <Button :loading="accountListLoading" @click="loadAccountList">
            刷新列表
          </Button>
        </Space>
      </template>

      <Table
        :columns="columns"
        :data-source="accountList"
        :loading="accountListLoading"
        :pagination="{ pageSize: 20, showSizeChanger: true }"
        :scroll="{ x: 1540 }"
        row-key="userId"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'adapter'">
            {{
              record.adapterName
                ? `${record.adapterName}${record.adapterId ? ` (${record.adapterId})` : ''}`
                : record.adapterId || '-'
            }}
          </template>

          <template v-else-if="column.key === 'status'">
            <Tag :color="record.status === 'online' ? 'success' : 'default'">
              {{ record.status === 'online' ? '在线' : '离线' }}
            </Tag>
          </template>

          <template v-else-if="column.key === 'action'">
            <template v-if="record.status === 'online'">
              <Button
                danger
                :disabled="record.canDisable === false || isActionPending(record.userId)"
                @click="updateAccountStatus(record, 'disable')"
              >
                禁用
              </Button>
            </template>
            <template v-else>
              <Button
                type="primary"
                :disabled="record.canEnable === false || isActionPending(record.userId)"
                @click="updateAccountStatus(record, 'enable')"
              >
                启用
              </Button>
            </template>
          </template>
        </template>
      </Table>
    </Card>
  </Page>
</template>
