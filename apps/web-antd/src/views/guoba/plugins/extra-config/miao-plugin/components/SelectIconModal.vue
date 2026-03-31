<script lang="ts" setup>
import type { MiaoHelpListItem } from '../types';

import { computed, ref } from 'vue';

import { Button, Modal, Space, message } from 'ant-design-vue';

import IconUploader from './IconUploader.vue';

const props = defineProps<{
  cell: MiaoHelpListItem;
  iconB64List: string[];
  open: boolean;
}>();

const emit = defineEmits<{
  'update:open': [boolean];
}>();

const edit = ref(false);
const uploaderOpen = ref(false);
const selected = ref(0);

const iconCount = computed(() => {
  return Math.max(0, (props.iconB64List?.length ?? 0) - 1);
});

function closeModal() {
  edit.value = false;
  emit('update:open', false);
}

function switchEdit() {
  edit.value = !edit.value;
  if (edit.value) {
    message.info('请点击你要替换的图标位');
  }
}

function clickIcon(index: number) {
  const iconIndex = index + 1;
  if (!edit.value) {
    props.cell.icon = iconIndex;
    closeModal();
    return;
  }

  selected.value = iconIndex;
  uploaderOpen.value = true;
}

function addLine() {
  const hasEmpty = props.iconB64List.some((item, index) => index > 0 && !item);
  if (hasEmpty) {
    message.warning('仍有空白图标位，请先利用后再新增');
    return;
  }
  props.iconB64List.push(...new Array(10).fill(''));
}
</script>

<template>
  <Modal
    :open="open"
    :footer="null"
    title="选择图标"
    width="460px"
    @cancel="closeModal"
  >
    <div class="icon-wrap">
      <div
        v-for="index in iconCount"
        :key="index"
        :class="['icon-item', { 'is-edit': edit }]"
        :style="{
          background: `url(${iconB64List[index]}) 0 0 no-repeat`,
          backgroundSize: '50px 50px',
        }"
        @click="clickIcon(index - 1)"
      />
    </div>

    <Space class="mt-3" wrap>
      <Button :type="edit ? 'default' : 'primary'" @click="switchEdit">
        {{ edit ? '完成替换' : '替换图标' }}
      </Button>
      <Button @click="addLine">添加 10 个空图标位</Button>
    </Space>

    <IconUploader
      v-model:open="uploaderOpen"
      :icon-b64-list="iconB64List"
      :selected="selected"
    />
  </Modal>
</template>

<style scoped>
.icon-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-height: 420px;
  overflow: auto;
  padding: 4px;
}

.icon-item {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.icon-item:hover {
  transform: scale(1.08);
  box-shadow: 0 0 10px #4ebaee;
}

.icon-item.is-edit {
  box-shadow: 2px 2px 8px -4px #4ebaee;
}

.icon-item.is-edit:hover {
  box-shadow: 0 0 10px #ff4d4f;
}
</style>
