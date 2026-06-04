<script lang="ts" setup>
import { onMounted } from 'vue';

import { Page } from '@vben/common-ui';

import SandboxConsolePane from './components/SandboxConsolePane.vue';
import SandboxEnvironmentModal from './components/SandboxEnvironmentModal.vue';
import SandboxEnvironmentPane from './components/SandboxEnvironmentPane.vue';
import SandboxRecordTable from './components/SandboxRecordTable.vue';
import { useSandboxPage } from './useSandboxPage';

const {
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
} = useSandboxPage();

onMounted(initialize);
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
        @select="(id) => (selectedId = id)"
        @toggle="toggleEnvironment"
      />
      <SandboxConsolePane
        v-model:active-conversation-id="activeConversationId"
        v-model:code="code"
        v-model:message="messageInput"
        v-model:selected-id="selectedId"
        :chat="chat"
        :conversations="conversations"
        :environments="environments"
        :record="latestCodeRecord"
        :running="running"
        :sending="sending"
        @conversation-create="createConversation"
        @conversation-delete="deleteConversation"
        @conversation-send="sendConversationMessage"
        @run-code="runCode"
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
