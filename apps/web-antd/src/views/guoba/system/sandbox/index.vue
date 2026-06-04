<script lang="ts" setup>
import type {
  GuobaSandboxEnvironment,
  GuobaSandboxEnvironmentPayload,
  GuobaSandboxRecord,
} from '#/api';
import type { TablePaginationConfig } from 'ant-design-vue';

import { computed, onMounted, reactive, ref } from 'vue';
import { Page } from '@vben/common-ui';
import { message, Modal } from 'ant-design-vue';
import {
  createGuobaSandboxEnvironmentApi,
  deleteGuobaSandboxEnvironmentApi,
  getGuobaSandboxEnvironmentsApi,
  getGuobaSandboxRecordsApi,
  runGuobaSandboxApi,
  toggleGuobaSandboxEnvironmentApi,
  updateGuobaSandboxEnvironmentApi,
} from '#/api';

import SandboxEnvironmentModal from './components/SandboxEnvironmentModal.vue';
import SandboxEnvironmentPane from './components/SandboxEnvironmentPane.vue';
import SandboxRecordTable from './components/SandboxRecordTable.vue';
import SandboxRunnerPane from './components/SandboxRunnerPane.vue';
import { defaultSandboxChat, defaultSandboxCode } from './sandboxDefaults';

const loading = ref(false);
const running = ref(false);
const saving = ref(false);
const recordLoading = ref(false);
const environments = ref<GuobaSandboxEnvironment[]>([]);
const selectedId = ref('');
const code = ref(defaultSandboxCode);
const chat = reactive({ ...defaultSandboxChat });
const latestRecord = ref<GuobaSandboxRecord>();
const records = ref<GuobaSandboxRecord[]>([]);
const editingEnvironment = ref<GuobaSandboxEnvironment>();
const modalOpen = ref(false);
const recordPagination = reactive({ page: 1, pageSize: 10, total: 0 });

const tablePagination = computed<TablePaginationConfig>(() => ({
  current: recordPagination.page,
  pageSize: recordPagination.pageSize,
  showSizeChanger: true,
  total: recordPagination.total,
}));

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '操作失败';
}

async function loadEnvironments() {
  loading.value = true;
  try {
    environments.value = await getGuobaSandboxEnvironmentsApi();
    if (!selectedId.value || !environments.value.some((item) => item.id === selectedId.value)) {
      selectedId.value = environments.value[0]?.id || '';
    }
  } catch (error: unknown) {
    message.error(getErrorMessage(error));
  } finally {
    loading.value = false;
  }
}

async function loadRecords() {
  recordLoading.value = true;
  try {
    const page = await getGuobaSandboxRecordsApi({ page: recordPagination.page, pageSize: recordPagination.pageSize });
    records.value = page?.items ?? [];
    recordPagination.total = page?.total ?? 0;
  } finally {
    recordLoading.value = false;
  }
}

async function runCode() {
  if (!selectedId.value) {
    message.warning('请选择沙盒环境');
    return;
  }
  running.value = true;
  try {
    latestRecord.value = await runGuobaSandboxApi({ chat: { ...chat }, code: code.value, environmentId: selectedId.value });
    message[latestRecord.value.status === 'success' ? 'success' : 'error']('运行完成');
    recordPagination.page = 1;
    await loadRecords();
  } catch (error: unknown) {
    message.error(getErrorMessage(error));
  } finally {
    running.value = false;
  }
}

function openCreateModal() {
  editingEnvironment.value = undefined;
  modalOpen.value = true;
}

function openEditModal(record: GuobaSandboxEnvironment) {
  editingEnvironment.value = record;
  modalOpen.value = true;
}

async function saveEnvironment(payload: GuobaSandboxEnvironmentPayload) {
  if (!payload.name) {
    message.warning('请输入沙盒名称');
    return;
  }
  saving.value = true;
  try {
    if (editingEnvironment.value) await updateGuobaSandboxEnvironmentApi(editingEnvironment.value.id, payload);
    else await createGuobaSandboxEnvironmentApi(payload);
    modalOpen.value = false;
    await loadEnvironments();
    message.success('已保存');
  } catch (error: unknown) {
    message.error(getErrorMessage(error));
  } finally {
    saving.value = false;
  }
}

function deleteEnvironment(record: GuobaSandboxEnvironment) {
  Modal.confirm({
    content: record.name,
    okButtonProps: { danger: true },
    okText: '删除',
    title: '删除沙盒环境',
    async onOk() {
      await deleteGuobaSandboxEnvironmentApi(record.id);
      await loadEnvironments();
      message.success('已删除');
    },
  });
}

async function toggleEnvironment(record: GuobaSandboxEnvironment, enabled: boolean) {
  await toggleGuobaSandboxEnvironmentApi(record.id, enabled);
  await loadEnvironments();
}

function handleRecordChange(next: TablePaginationConfig) {
  recordPagination.page = Number(next.current || 1);
  recordPagination.pageSize = Number(next.pageSize || 10);
  loadRecords();
}

onMounted(async () => {
  await loadEnvironments();
  await loadRecords();
});
</script>

<template>
  <Page title="沙盒管理">
    <div class="grid gap-3">
      <SandboxEnvironmentPane
        :environments="environments"
        :loading="loading"
        :selected-id="selectedId"
        @create="openCreateModal"
        @delete="deleteEnvironment"
        @edit="openEditModal"
        @select="(id) => selectedId = id"
        @toggle="toggleEnvironment"
      />
      <SandboxRunnerPane
        :chat="chat"
        v-model:code="code"
        v-model:selected-id="selectedId"
        :environments="environments"
        :record="latestRecord"
        :running="running"
        @run="runCode"
        @update:chat="(value) => Object.assign(chat, value)"
      />
      <SandboxRecordTable
        :loading="recordLoading"
        :pagination="tablePagination"
        :records="records"
        @change="handleRecordChange"
      />
    </div>
    <SandboxEnvironmentModal
      :environment="editingEnvironment"
      :open="modalOpen"
      :saving="saving"
      @close="modalOpen = false"
      @save="saveEnvironment"
    />
  </Page>
</template>
