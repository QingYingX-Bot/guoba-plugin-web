<script lang="ts" setup>
import type { MiaoBackupItem } from '../types';

import { computed, ref, watch } from 'vue';

import {
  Button,
  Drawer,
  Empty,
  Input,
  List,
  Modal,
  Popconfirm,
  Space,
  Tag,
  message,
} from 'ant-design-vue';

import { addBackup, deleteBackup, getBackupList, restoreBackup } from '../miao.api';

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  reload: [];
  'update:open': [boolean];
}>();

const loading = ref(false);
const backupList = ref<MiaoBackupItem[]>([]);
const addModalOpen = ref(false);
const remark = ref('');
const drawerWidth = computed(() => (window.innerWidth >= 768 ? 700 : window.innerWidth));

watch(
  () => props.open,
  (open) => {
    if (open) {
      loadData();
    }
  },
);

async function loadData() {
  loading.value = true;
  try {
    const result = await getBackupList();
    backupList.value = Array.isArray(result) ? [...result].reverse() : [];
  } finally {
    loading.value = false;
  }
}

function closeDrawer() {
  emit('update:open', false);
}

function openAddModal() {
  remark.value = '';
  addModalOpen.value = true;
}

async function submitAddBackup() {
  const value = remark.value.trim();
  if (!value) {
    message.warning('请输入备份备注');
    return;
  }

  loading.value = true;
  try {
    await addBackup(value);
    addModalOpen.value = false;
    await loadData();
    message.success('备份新增成功');
  } finally {
    loading.value = false;
  }
}

async function doRestore(item: MiaoBackupItem) {
  if (item.version && item.version !== 2) {
    const confirmed = await new Promise<boolean>((resolve) => {
      Modal.confirm({
        content: '该备份为旧版格式，恢复时将自动转换，是否继续？',
        okText: '继续恢复',
        title: '备份版本较旧',
        onCancel: () => resolve(false),
        onOk: () => resolve(true),
      });
    });
    if (!confirmed) {
      return;
    }
  }

  loading.value = true;
  try {
    await restoreBackup(item.id);
    message.success('备份恢复成功');
    emit('reload');
    await loadData();
  } finally {
    loading.value = false;
  }
}

async function doDelete(item: MiaoBackupItem) {
  loading.value = true;
  try {
    await deleteBackup(item.id);
    await loadData();
    message.success('备份删除成功');
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <Drawer
    :open="open"
    :width="drawerWidth"
    title="喵喵帮助备份"
    @close="closeDrawer"
  >
    <div class="mb-3">
      <Button type="primary" @click="openAddModal">新增备份</Button>
    </div>

    <List
      bordered
      :data-source="backupList"
      :loading="loading"
      item-layout="horizontal"
    >
      <template #renderItem="{ item }">
        <List.Item>
          <template #actions>
            <Popconfirm title="确定恢复这个备份吗？" @confirm="doRestore(item)">
              <a>恢复</a>
            </Popconfirm>
            <Popconfirm title="确定删除这个备份吗？" @confirm="doDelete(item)">
              <a class="danger-text">删除</a>
            </Popconfirm>
          </template>

          <List.Item.Meta :description="item.time">
            <template #title>
              <Space>
                <span>{{ item.remark }}</span>
                <Tag v-if="item.version && item.version !== 2">OLD</Tag>
              </Space>
            </template>
          </List.Item.Meta>
        </List.Item>
      </template>
    </List>

    <Empty v-if="!loading && backupList.length === 0" description="暂无备份" class="mt-3" />

    <Modal
      v-model:open="addModalOpen"
      title="新增备份"
      @ok="submitAddBackup"
    >
      <Input v-model:value="remark" :maxlength="60" placeholder="请输入备份名称" />
      <p class="tip">注：新版备份只备份配置与图标。</p>
    </Modal>
  </Drawer>
</template>

<style scoped>
.danger-text {
  color: #ff4d4f;
}

.tip {
  margin-top: 8px;
  color: #999;
}
</style>
