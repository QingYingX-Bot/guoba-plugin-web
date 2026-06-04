<script lang="ts" setup>
import type { GuobaFileEntry, GuobaFileRoot } from '#/api';
import { computed, onMounted, reactive, ref } from 'vue';
import { Page } from '@vben/common-ui';
import { Modal, message } from 'ant-design-vue';
import { createGuobaDirectoryApi, deleteGuobaFileApi, getGuobaFileListApi, readGuobaFileApi, renameGuobaFileApi, writeGuobaFileApi } from '#/api';
import FileEditorDrawer from './components/FileEditorDrawer.vue';
import FileManagerShell from './components/FileManagerShell.vue';
import FilePathBar from './components/FilePathBar.vue';
import FileRootSidebar from './components/FileRootSidebar.vue';
import FileTable from './components/FileTable.vue';
import NameModal from './components/NameModal.vue';

const loading = ref(false);
const saving = ref(false);
const roots = ref<GuobaFileRoot[]>([]);
const items = ref<GuobaFileEntry[]>([]);
const currentPath = ref('');
const currentName = ref('');
const currentRelativePath = ref('.');
const parentPath = ref('');
const pathInput = ref('');
const editorOpen = ref(false);
const editorFile = ref<GuobaFileEntry>();
const editorContent = ref('');
const nameModal = reactive({
  name: '',
  open: false,
  path: '',
  title: '',
  type: 'mkdir' as 'mkdir' | 'rename',
});
const currentTitle = computed(() => currentName.value || '文件管理');
const currentMeta = computed(() => currentRelativePath.value === '.' ? currentPath.value : currentRelativePath.value);

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '操作失败';
}

async function loadFiles(path = currentPath.value) {
  loading.value = true;
  try {
    const result = await getGuobaFileListApi({ path });
    roots.value = result.roots ?? [];
    items.value = result.items ?? [];
    currentPath.value = result.current?.path ?? '';
    currentName.value = result.current?.name ?? '';
    currentRelativePath.value = result.current?.relativePath ?? '.';
    pathInput.value = currentPath.value;
    parentPath.value = typeof result.parent === 'object' ? result.parent.path : '';
  } catch (error: unknown) {
    message.error(getErrorMessage(error));
  } finally {
    loading.value = false;
  }
}

function openItem(item: GuobaFileEntry) {
  if (item.isDirectory) {
    loadFiles(item.path);
    return;
  }
  editItem(item);
}

async function editItem(item: GuobaFileEntry) {
  loading.value = true;
  try {
    const file = await readGuobaFileApi(item.path);
    editorFile.value = item;
    editorContent.value = file.content;
    editorOpen.value = true;
  } catch (error: unknown) {
    message.error(getErrorMessage(error));
  } finally {
    loading.value = false;
  }
}

async function saveFile() {
  const file = editorFile.value;
  if (!file) {
    return;
  }
  saving.value = true;
  try {
    await writeGuobaFileApi({ content: editorContent.value, path: file.path });
    message.success('保存成功');
    editorOpen.value = false;
    await loadFiles();
  } catch (error: unknown) {
    message.error(getErrorMessage(error));
  } finally {
    saving.value = false;
  }
}

function openNameModal(type: 'mkdir' | 'rename', item?: GuobaFileEntry) {
  nameModal.type = type;
  nameModal.path = item?.path || currentPath.value;
  nameModal.name = type === 'rename' ? item?.name || '' : '';
  nameModal.title = type === 'rename' ? '重命名' : '新建目录';
  nameModal.open = true;
}

async function submitNameModal() {
  const name = nameModal.name.trim();
  if (!name) {
    message.warning('请输入名称');
    return;
  }
  try {
    if (nameModal.type === 'rename') {
      await renameGuobaFileApi({ name, path: nameModal.path });
    } else {
      await createGuobaDirectoryApi({ name, path: currentPath.value });
    }
    nameModal.open = false;
    await loadFiles();
  } catch (error: unknown) {
    message.error(getErrorMessage(error));
  }
}

function deleteItem(item: GuobaFileEntry) {
  Modal.confirm({
    content: item.path,
    okButtonProps: { danger: true },
    okText: '删除',
    title: `删除 ${item.name}`,
    async onOk() {
      try {
        await deleteGuobaFileApi(item.path);
        message.success('删除成功');
        await loadFiles();
      } catch (error: unknown) {
        message.error(getErrorMessage(error));
      }
    },
  });
}

onMounted(() => {
  loadFiles();
});
</script>

<template>
  <Page title="文件管理">
    <FileManagerShell :meta="currentMeta" :title="currentTitle">
      <template #side>
        <FileRootSidebar
          :current-path="currentPath"
          :loading="loading"
          :roots="roots"
          @open="loadFiles"
        />
      </template>
      <template #toolbar>
        <FilePathBar
          v-model:path="pathInput"
          :loading="loading"
          :parent-path="parentPath"
          @mkdir="openNameModal('mkdir')"
          @open="loadFiles"
          @parent="loadFiles(parentPath)"
          @refresh="loadFiles()"
        />
      </template>
      <FileTable
        :items="items"
        :loading="loading"
        @delete="deleteItem"
        @open="openItem"
        @rename="(item) => openNameModal('rename', item)"
      />
    </FileManagerShell>
    <FileEditorDrawer
      v-model:content="editorContent"
      v-model:open="editorOpen"
      :file="editorFile"
      :saving="saving"
      @save="saveFile"
    />
    <NameModal
      v-model:open="nameModal.open"
      v-model:value="nameModal.name"
      :title="nameModal.title"
      @ok="submitNameModal"
    />
  </Page>
</template>
