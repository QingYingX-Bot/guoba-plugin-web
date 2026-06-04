<script lang="ts" setup>
import type { GuobaContactTarget, GuobaMessageSendRequest, GuobaTaskRecord, GuobaUserAccount } from '#/api';

import { computed, onMounted, reactive, ref, watch } from 'vue';

import { Page } from '@vben/common-ui';

import { AutoComplete, Button, Card, Col, Form, Input, Row, Segmented, Select, Space, message } from 'ant-design-vue';

import { getAccountFriendsApi, getAccountGroupsApi, getAccountsApi, getGuobaTasksApi, sendGuobaMessageApi } from '#/api';

import TaskTable from '../_components/TaskTable.vue';

type Option = { label: string; value: string };

const form = reactive<GuobaMessageSendRequest>({
  accountId: '',
  content: '',
  targetId: '',
  targetType: 'private',
});
const accounts = ref<GuobaUserAccount[]>([]);
const recentTasks = ref<GuobaTaskRecord[]>([]);
const targetOptions = ref<Option[]>([]);
const accountLoading = ref(false);
const targetLoading = ref(false);
const sending = ref(false);
const taskLoading = ref(false);
const targetSeq = ref(0);

const targetTypeOptions = [
  { label: '私聊', value: 'private' },
  { label: '群聊', value: 'group' },
];
const accountOptions = computed<Option[]>(() => accounts.value.map((item) => ({
  label: `${item.realName || item.userId} (${item.userId})`,
  value: item.userId,
})));
const contentLength = computed(() => form.content.length);

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '操作失败';
}

function toTargetOption(item: GuobaContactTarget): Option {
  return {
    label: `${item.name || item.id} (${item.id})`,
    value: item.id,
  };
}

async function loadAccounts() {
  accountLoading.value = true;
  try {
    const page = await getAccountsApi({ page: 1, pageSize: 100 });
    accounts.value = page?.items ?? [];
    if (!form.accountId && accounts.value[0]) {
      form.accountId = accounts.value[0].userId;
    }
  } finally {
    accountLoading.value = false;
  }
}

async function loadTargets(keyword = '') {
  if (!form.accountId) {
    targetOptions.value = [];
    return;
  }
  const seq = targetSeq.value + 1;
  targetSeq.value = seq;
  targetLoading.value = true;
  const accountId = form.accountId;
  const targetType = form.targetType;
  try {
    const api = targetType === 'group' ? getAccountGroupsApi : getAccountFriendsApi;
    const page = await api(accountId, { keyword, page: 1, pageSize: 30 });
    if (seq === targetSeq.value) {
      targetOptions.value = (page?.items ?? []).map(toTargetOption);
    }
  } finally {
    if (seq === targetSeq.value) {
      targetLoading.value = false;
    }
  }
}

async function loadRecentTasks() {
  taskLoading.value = true;
  try {
    const page = await getGuobaTasksApi({ page: 1, pageSize: 6, type: 'message.send' });
    recentTasks.value = page?.items ?? [];
  } finally {
    taskLoading.value = false;
  }
}

function validatePayload() {
  const payload = {
    ...form,
    accountId: form.accountId.trim(),
    content: form.content,
    targetId: form.targetId.trim(),
  };
  if (!payload.accountId || !payload.targetId || !payload.content.trim()) {
    message.warning('请完整填写账号、目标和消息内容');
    return null;
  }
  return payload;
}

async function handleSend() {
  const payload = validatePayload();
  if (!payload || sending.value) {
    return;
  }
  sending.value = true;
  try {
    const result = await sendGuobaMessageApi(payload);
    message.success(result.messageId ? `消息已发送：${result.messageId}` : '消息已发送');
    form.content = '';
  } catch (error: unknown) {
    message.error(getErrorMessage(error));
  } finally {
    sending.value = false;
    await loadRecentTasks();
  }
}

watch(() => [form.accountId, form.targetType], () => {
  form.targetId = '';
  loadTargets();
});

onMounted(async () => {
  await loadAccounts();
  await Promise.all([loadTargets(), loadRecentTasks()]);
});
</script>

<template>
  <Page title="代发消息">
    <Row :gutter="[16, 16]">
      <Col :lg="9" :xs="24">
        <Card title="发送消息">
          <Form layout="vertical">
            <Form.Item label="发送账号">
              <Select
                v-model:value="form.accountId"
                :loading="accountLoading"
                :options="accountOptions"
                option-filter-prop="label"
                show-search
              />
            </Form.Item>
            <Form.Item label="目标类型">
              <Segmented v-model:value="form.targetType" :options="targetTypeOptions" block />
            </Form.Item>
            <Form.Item label="目标ID">
              <AutoComplete
                v-model:value="form.targetId"
                :options="targetOptions"
                :loading="targetLoading"
                placeholder="输入目标 ID 或搜索名称"
                @search="loadTargets"
              />
            </Form.Item>
            <Form.Item :label="`消息内容（${contentLength}/2000）`">
              <Input.TextArea v-model:value="form.content" :maxlength="2000" :rows="8" show-count />
            </Form.Item>
            <Space>
              <Button type="primary" :loading="sending" @click="handleSend">发送</Button>
              <Button :loading="targetLoading" @click="loadTargets()">刷新目标</Button>
            </Space>
          </Form>
        </Card>
      </Col>
      <Col :lg="15" :xs="24">
        <Card title="最近任务">
          <template #extra>
            <Button :loading="taskLoading" @click="loadRecentTasks">刷新</Button>
          </template>
          <TaskTable compact :loading="taskLoading" :pagination="false" :tasks="recentTasks" />
        </Card>
      </Col>
    </Row>
  </Page>
</template>
