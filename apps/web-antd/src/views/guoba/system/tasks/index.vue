<script lang="ts" setup>
import type { GuobaPluginTaskRecord, GuobaPluginTaskStatus, GuobaTaskRecord } from '#/api';
import type { TablePaginationConfig } from 'ant-design-vue';

import { computed, onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { Button, Card, Input, Select, Space, Tabs } from 'ant-design-vue';

import { getGuobaPluginTasksApi, getGuobaTasksApi } from '#/api';

import PluginTaskTable from '../_components/PluginTaskTable.vue';
import TaskTable from '../_components/TaskTable.vue';

const activeTab = ref('plugin');
const pluginLoading = ref(false);
const recordLoading = ref(false);
const recordLoaded = ref(false);
const pluginTasks = ref<GuobaPluginTaskRecord[]>([]);
const records = ref<GuobaTaskRecord[]>([]);
const pluginFilters = reactive({
  keyword: '',
  status: '' as '' | GuobaPluginTaskStatus,
});
const recordFilters = reactive({
  keyword: '',
  status: '',
  type: '',
});
const pluginPagination = reactive({ page: 1, pageSize: 20, total: 0 });
const recordPagination = reactive({ page: 1, pageSize: 20, total: 0 });

const pluginStatusOptions = [
  { label: '全部状态', value: '' },
  { label: '已注册', value: 'scheduled' },
  { label: '未注册', value: 'inactive' },
];
const recordStatusOptions = [
  { label: '全部状态', value: '' },
  { label: '待执行', value: 'pending' },
  { label: '执行中', value: 'running' },
  { label: '成功', value: 'success' },
  { label: '失败', value: 'failed' },
];
const typeOptions = [
  { label: '全部类型', value: '' },
  { label: '代发消息', value: 'message.send' },
];

const pluginTablePagination = computed<TablePaginationConfig>(() => ({
  current: pluginPagination.page,
  pageSize: pluginPagination.pageSize,
  showSizeChanger: true,
  total: pluginPagination.total,
}));
const recordTablePagination = computed<TablePaginationConfig>(() => ({
  current: recordPagination.page,
  pageSize: recordPagination.pageSize,
  showSizeChanger: true,
  total: recordPagination.total,
}));

async function loadPluginTasks() {
  pluginLoading.value = true;
  try {
    const page = await getGuobaPluginTasksApi({
      keyword: pluginFilters.keyword.trim(),
      page: pluginPagination.page,
      pageSize: pluginPagination.pageSize,
      status: pluginFilters.status,
    });
    pluginTasks.value = page?.items ?? [];
    pluginPagination.total = page?.total ?? 0;
  } finally {
    pluginLoading.value = false;
  }
}

async function loadRecords() {
  recordLoading.value = true;
  try {
    const page = await getGuobaTasksApi({
      keyword: recordFilters.keyword.trim(),
      page: recordPagination.page,
      pageSize: recordPagination.pageSize,
      status: recordFilters.status,
      type: recordFilters.type,
    });
    records.value = page?.items ?? [];
    recordPagination.total = page?.total ?? 0;
    recordLoaded.value = true;
  } finally {
    recordLoading.value = false;
  }
}

function handlePluginSearch() {
  pluginPagination.page = 1;
  loadPluginTasks();
}

function handleRecordSearch() {
  recordPagination.page = 1;
  loadRecords();
}

function handlePluginTableChange(next: TablePaginationConfig) {
  pluginPagination.page = Number(next.current || 1);
  pluginPagination.pageSize = Number(next.pageSize || 20);
  loadPluginTasks();
}

function handleRecordTableChange(next: TablePaginationConfig) {
  recordPagination.page = Number(next.current || 1);
  recordPagination.pageSize = Number(next.pageSize || 20);
  loadRecords();
}

function handleTabChange(key: string | number) {
  if (String(key) === 'records' && !recordLoaded.value) {
    loadRecords();
  }
}

onMounted(() => {
  loadPluginTasks();
});
</script>

<template>
  <Page title="任务管理">
    <Tabs v-model:activeKey="activeTab" @change="handleTabChange">
      <Tabs.TabPane key="plugin" tab="插件任务">
        <Card title="插件定时任务">
          <template #extra>
            <Space wrap>
              <Input v-model:value="pluginFilters.keyword" allow-clear placeholder="插件、任务、Cron" @press-enter="handlePluginSearch" />
              <Select v-model:value="pluginFilters.status" :options="pluginStatusOptions" class="task-filter" />
              <Button type="primary" @click="handlePluginSearch">搜索</Button>
              <Button :loading="pluginLoading" @click="loadPluginTasks">刷新</Button>
            </Space>
          </template>
          <PluginTaskTable
            :loading="pluginLoading"
            :pagination="pluginTablePagination"
            :tasks="pluginTasks"
            @change="handlePluginTableChange"
          />
        </Card>
      </Tabs.TabPane>

      <Tabs.TabPane key="records" tab="执行记录">
        <Card title="后台执行记录">
          <template #extra>
            <Space wrap>
              <Input v-model:value="recordFilters.keyword" allow-clear placeholder="任务、账号、目标" @press-enter="handleRecordSearch" />
              <Select v-model:value="recordFilters.status" :options="recordStatusOptions" class="task-filter" />
              <Select v-model:value="recordFilters.type" :options="typeOptions" class="task-filter" />
              <Button type="primary" @click="handleRecordSearch">搜索</Button>
              <Button :loading="recordLoading" @click="loadRecords">刷新</Button>
            </Space>
          </template>
          <TaskTable
            :loading="recordLoading"
            :pagination="recordTablePagination"
            :tasks="records"
            @change="handleRecordTableChange"
          />
        </Card>
      </Tabs.TabPane>
    </Tabs>
  </Page>
</template>

<style scoped>
.task-filter {
  width: 120px;
}
</style>
