import type {
  GuobaSandboxChatInput,
  GuobaSandboxConversation,
  GuobaSandboxEnvironment,
  GuobaSandboxEnvironmentPayload,
  GuobaSandboxRecord,
} from '#/api';
import type { TablePaginationConfig } from 'ant-design-vue';

import { computed, reactive, ref, watch } from 'vue';
import { message, Modal } from 'ant-design-vue';
import {
  createGuobaSandboxConversationApi,
  createGuobaSandboxEnvironmentApi,
  deleteGuobaSandboxConversationApi,
  deleteGuobaSandboxEnvironmentApi,
  getGuobaSandboxConversationsApi,
  getGuobaSandboxEnvironmentsApi,
  getGuobaSandboxRecordsApi,
  runGuobaSandboxCodeApi,
  sendGuobaSandboxConversationMessageApi,
  toggleGuobaSandboxEnvironmentApi,
  updateGuobaSandboxEnvironmentApi,
} from '#/api';

import { defaultSandboxChat, defaultSandboxCode } from './sandboxDefaults';

export function useSandboxPage() {
  const loading = ref(false);
  const running = ref(false);
  const saving = ref(false);
  const sending = ref(false);
  const recordLoading = ref(false);
  const environments = ref<GuobaSandboxEnvironment[]>([]);
  const selectedId = ref('');
  const code = ref(defaultSandboxCode);
  const chat = reactive<GuobaSandboxChatInput>({ ...defaultSandboxChat });
  const messageInput = ref(defaultSandboxChat.message);
  const latestCodeRecord = ref<GuobaSandboxRecord>();
  const latestRecord = ref<GuobaSandboxRecord>();
  const records = ref<GuobaSandboxRecord[]>([]);
  const conversations = ref<GuobaSandboxConversation[]>([]);
  const activeConversationId = ref('');
  const editingEnvironment = ref<GuobaSandboxEnvironment>();
  const modalOpen = ref(false);
  const recordPagination = reactive({ page: 1, pageSize: 10, total: 0 });
  const tablePagination = computed<TablePaginationConfig>(() => ({
    current: recordPagination.page,
    pageSize: recordPagination.pageSize,
    showSizeChanger: true,
    total: recordPagination.total,
  }));

  async function initialize() {
    await loadEnvironments();
    await Promise.all([loadConversations(), loadRecords()]);
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

  async function loadConversations() {
    conversations.value = await getGuobaSandboxConversationsApi();
    if (!activeConversationId.value || !conversations.value.some((item) => item.id === activeConversationId.value)) {
      activeConversationId.value = conversations.value[0]?.id || '';
    }
    syncChatFromConversation();
  }

  async function loadRecords() {
    recordLoading.value = true;
    try {
      const page = await getGuobaSandboxRecordsApi({
        page: recordPagination.page,
        pageSize: recordPagination.pageSize,
      });
      records.value = page?.items ?? [];
      recordPagination.total = page?.total ?? 0;
    } finally {
      recordLoading.value = false;
    }
  }

  async function runCode() {
    if (!selectedId.value) return message.warning('请选择沙盒环境');
    running.value = true;
    try {
      latestCodeRecord.value = await runGuobaSandboxCodeApi({
        chat: { ...chat },
        code: code.value,
        environmentId: selectedId.value,
      });
      latestRecord.value = latestCodeRecord.value;
      message[latestCodeRecord.value.status === 'success' ? 'success' : 'error']('运行完成');
      await reloadFirstPage();
    } catch (error: unknown) {
      message.error(getErrorMessage(error));
    } finally {
      running.value = false;
    }
  }

  async function createConversation() {
    try {
      const item = await createConversationRecord();
      if (!item) return;
      upsertConversation(item);
      message.success('已新建会话');
    } catch (error: unknown) {
      message.error(getErrorMessage(error));
    }
  }

  async function deleteConversation() {
    const id = activeConversationId.value;
    if (!id) return;
    try {
      await deleteGuobaSandboxConversationApi(id);
      await loadConversations();
      message.success('已删除会话');
    } catch (error: unknown) {
      message.error(getErrorMessage(error));
    }
  }

  async function sendConversationMessage() {
    if (!selectedId.value) return message.warning('请选择沙盒环境');
    const content = messageInput.value.trim();
    if (!content) return message.warning('请输入沙盒消息');
    sending.value = true;
    try {
      const id = await ensureConversation();
      if (!id) return;
      const result = await sendGuobaSandboxConversationMessageApi(id, {
        chat: { ...chat, message: content, rawMessage: content },
        environmentId: selectedId.value,
        message: content,
      });
      upsertConversation(result.conversation);
      latestRecord.value = result.record;
      messageInput.value = '';
      await reloadFirstPage();
    } catch (error: unknown) {
      message.error(getErrorMessage(error));
    } finally {
      sending.value = false;
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
    if (!payload.name) return message.warning('请输入沙盒名称');
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

  function syncChatFromConversation() {
    const item = conversations.value.find((row) => row.id === activeConversationId.value);
    if (item) Object.assign(chat, item.chat);
  }

  function upsertConversation(item: GuobaSandboxConversation) {
    const index = conversations.value.findIndex((row) => row.id === item.id);
    if (index === -1) conversations.value.unshift(item);
    else conversations.value.splice(index, 1, item);
    activeConversationId.value = item.id;
    syncChatFromConversation();
  }

  async function reloadFirstPage() {
    recordPagination.page = 1;
    await loadRecords();
  }

  async function createConversationRecord() {
    if (!selectedId.value) {
      message.warning('请选择沙盒环境');
      return null;
    }
    return await createGuobaSandboxConversationApi({
      chat: { ...chat },
      environmentId: selectedId.value,
    });
  }

  async function ensureConversation() {
    if (activeConversationId.value) return activeConversationId.value;
    const item = await createConversationRecord();
    if (!item) return '';
    upsertConversation(item);
    return item.id;
  }

  function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : '操作失败';
  }

  watch(activeConversationId, syncChatFromConversation);

  return {
    activeConversationId,
    chat,
    code,
    conversations,
    createConversation,
    deleteConversation,
    deleteEnvironment,
    editingEnvironment,
    environments,
    handleRecordChange,
    initialize,
    latestCodeRecord,
    latestRecord,
    loading,
    messageInput,
    modalOpen,
    openCreateModal,
    openEditModal,
    recordLoading,
    records,
    runCode,
    running,
    saveEnvironment,
    saving,
    selectedId,
    sendConversationMessage,
    sending,
    tablePagination,
    toggleEnvironment,
  };
}
