<script lang="ts" setup>
import type {
  EditModelData,
  MiaoHelpEditorAction,
  MiaoHelpEditorActionContext,
  MiaoHelpEditorAdapter,
  MiaoHelpGroup,
  MiaoHelpGroups,
  MiaoHelpListItem,
} from '../types';

import { computed, ref } from 'vue';

import { Button, Divider, Modal, Popconfirm, Switch, message } from 'ant-design-vue';

import SelectIconModal from './SelectIconModal.vue';

const props = defineProps<{
  editorAdapter?: MiaoHelpEditorAdapter | null;
  helpList: MiaoHelpGroups;
  iconB64List: string[];
  modelData: EditModelData;
}>();

const emit = defineEmits<{
  'update:modelData': [EditModelData];
}>();

const iconModalOpen = ref(false);

const visible = computed({
  get() {
    return props.modelData.show;
  },
  set(value: boolean) {
    emit('update:modelData', {
      ...props.modelData,
      show: value,
    });
  },
});

const currentGroup = computed(() => {
  const groupIndex = props.modelData.groupIndex;
  if (groupIndex === null || groupIndex < 0 || groupIndex >= props.helpList.length) {
    return null;
  }
  return props.helpList[groupIndex] ?? null;
});

function updateModelData(next: Partial<EditModelData>) {
  emit('update:modelData', {
    ...props.modelData,
    ...next,
  });
}

function buildActionContext(
  action: MiaoHelpEditorAction,
  offset?: -1 | 1,
): MiaoHelpEditorActionContext {
  return {
    action,
    helpList: props.helpList,
    modelData: props.modelData,
    currentCell: props.modelData.cell ?? null,
    currentGroup: currentGroup.value,
    offset,
  };
}

async function runBeforeAction(action: MiaoHelpEditorAction, offset?: -1 | 1) {
  const handler = props.editorAdapter?.beforeAction;
  if (!handler) {
    return true;
  }

  try {
    const result = await handler(buildActionContext(action, offset));
    return result !== false;
  } catch (error) {
    console.error('[MiaoHelpEditorAdapter] beforeAction failed:', error);
    message.error('喵喵编辑适配器执行失败，请检查适配实现');
    return false;
  }
}

async function resolveGroupTemplate() {
  const templateFactory = props.editorAdapter?.createGroupTemplate;
  if (!templateFactory) {
    return null;
  }

  try {
    return (await templateFactory(buildActionContext('createGroup'))) ?? null;
  } catch (error) {
    console.error('[MiaoHelpEditorAdapter] createGroupTemplate failed:', error);
    message.error('喵喵编辑适配器执行失败，请检查适配实现');
    return null;
  }
}

async function resolveCellTemplate() {
  const templateFactory = props.editorAdapter?.createCellTemplate;
  if (!templateFactory) {
    return null;
  }

  try {
    return (await templateFactory(buildActionContext('createCell'))) ?? null;
  } catch (error) {
    console.error('[MiaoHelpEditorAdapter] createCellTemplate failed:', error);
    message.error('喵喵编辑适配器执行失败，请检查适配实现');
    return null;
  }
}

async function createGroup() {
  if (!(await runBeforeAction('createGroup'))) {
    return;
  }

  const groupIndex = props.modelData.groupIndex ?? 0;
  const customGroup = await resolveGroupTemplate();
  const nextGroup: MiaoHelpGroup = {
    group: '未命名分组',
    list: [],
    ...(customGroup ?? {}),
  };
  if (!Array.isArray(nextGroup.list)) {
    nextGroup.list = [];
  }

  props.helpList.splice(groupIndex, 0, nextGroup);

  const group = props.helpList[groupIndex] as MiaoHelpGroup;
  updateModelData({
    cell: null,
    cellIndex: null,
    group,
    groupIndex,
  });
}

async function createCell() {
  const group = currentGroup.value;
  if (!group) {
    return;
  }
  if (!(await runBeforeAction('createCell'))) {
    return;
  }
  const cellIndex = props.modelData.cellIndex ?? 0;
  if (!Array.isArray(group.list)) {
    group.list = [];
  }

  const customCell = await resolveCellTemplate();
  const nextCell: MiaoHelpListItem = {
    desc: '请添加描述',
    icon: 1,
    title: '未命名项目',
    ...(customCell ?? {}),
  };
  nextCell.icon = Math.max(1, Number(nextCell.icon ?? 1) || 1);

  group.list.splice(cellIndex, 0, nextCell);

  updateModelData({
    cell: group.list[cellIndex] ?? null,
    cellIndex,
  });
}

async function moveGroup(offset: -1 | 1) {
  const index = props.modelData.groupIndex;
  if (index === null) {
    return;
  }
  if (!(await runBeforeAction('moveGroup', offset))) {
    return;
  }

  const targetIndex = index + offset;
  if (targetIndex < 0 || targetIndex >= props.helpList.length) {
    return;
  }

  const temp = props.helpList[index];
  props.helpList[index] = props.helpList[targetIndex]!;
  props.helpList[targetIndex] = temp!;

  updateModelData({
    group: props.helpList[targetIndex] ?? null,
    groupIndex: targetIndex,
  });
}

async function moveCell(offset: -1 | 1) {
  const groupIndex = props.modelData.groupIndex;
  const cellIndex = props.modelData.cellIndex;
  if (groupIndex === null || cellIndex === null) {
    return;
  }

  const group = props.helpList[groupIndex];
  if (!group || !Array.isArray(group.list)) {
    return;
  }

  const targetIndex = cellIndex + offset;
  if (targetIndex < 0 || targetIndex >= group.list.length) {
    await moveCellToOtherGroup(offset);
    return;
  }
  if (!(await runBeforeAction('moveCell', offset))) {
    return;
  }

  const temp = group.list[cellIndex];
  group.list[cellIndex] = group.list[targetIndex]!;
  group.list[targetIndex] = temp!;

  updateModelData({
    cell: group.list[targetIndex] ?? null,
    cellIndex: targetIndex,
  });
}

async function moveCellToOtherGroup(offset: -1 | 1) {
  const groupIndex = props.modelData.groupIndex;
  const cellIndex = props.modelData.cellIndex;
  const cell = props.modelData.cell;
  if (groupIndex === null || cellIndex === null || !cell) {
    return;
  }

  const targetGroupIndex = groupIndex + offset;
  if (targetGroupIndex < 0 || targetGroupIndex >= props.helpList.length) {
    return;
  }
  if (!(await runBeforeAction('moveCellCrossGroup', offset))) {
    return;
  }

  Modal.confirm({
    content: `确定要把当前项目移动到${offset === -1 ? '上' : '下'}一个分组吗？`,
    okText: '确定',
    title: '跨分组移动',
    onOk() {
      const oldGroup = props.helpList[groupIndex]!;
      const targetGroup = props.helpList[targetGroupIndex]!;
      oldGroup.list.splice(cellIndex, 1);

      let newCellIndex = 0;
      if (offset === -1) {
        targetGroup.list.push(cell);
        newCellIndex = targetGroup.list.length - 1;
      } else {
        targetGroup.list.unshift(cell);
        newCellIndex = 0;
      }

      updateModelData({
        cell: targetGroup.list[newCellIndex] ?? null,
        cellIndex: newCellIndex,
        group: targetGroup,
        groupIndex: targetGroupIndex,
      });
    },
  });
}

async function deleteGroup() {
  const index = props.modelData.groupIndex;
  if (index === null) {
    return;
  }
  if (!(await runBeforeAction('deleteGroup'))) {
    return;
  }

  props.helpList.splice(index, 1);
  visible.value = false;
}

async function deleteCell() {
  const group = currentGroup.value;
  const cellIndex = props.modelData.cellIndex;
  if (!group || cellIndex === null) {
    return;
  }
  if (!(await runBeforeAction('deleteCell'))) {
    return;
  }

  group.list.splice(cellIndex, 1);
  if (group.list.length === 0) {
    updateModelData({
      cell: null,
      cellIndex: null,
    });
    return;
  }

  const nextIndex = Math.min(cellIndex, group.list.length - 1);
  updateModelData({
    cell: group.list[nextIndex] ?? null,
    cellIndex: nextIndex,
  });
}

function canMoveCell(offset: -1 | 1) {
  const groupIndex = props.modelData.groupIndex;
  const cellIndex = props.modelData.cellIndex;
  if (groupIndex === null || cellIndex === null) {
    return false;
  }

  const group = props.helpList[groupIndex];
  if (!group) {
    return false;
  }

  if (offset === -1) {
    return !(groupIndex === 0 && cellIndex === 0);
  }
  return !(
    groupIndex === props.helpList.length - 1
    && cellIndex === group.list.length - 1
  );
}

function openIconModal() {
  iconModalOpen.value = true;
}
</script>

<template>
  <Modal
    v-model:open="visible"
    :footer="null"
    :mask="false"
    title="编辑内容"
    width="560px"
  >
    <div v-if="modelData.group" class="body-wrap">
      <div class="row">
        <div>分组</div>
        <div class="flex-1">
          <a-input v-model:value="modelData.group.group" placeholder="分组" />
        </div>
      </div>

      <div class="row">
        <div>仅主人</div>
        <Switch
          v-model:checked="modelData.group.auth"
          checked-value="master"
          checked-children="是"
          un-checked-children="否"
          un-checked-value=""
        />
      </div>

      <div class="action-row">
        <div class="left">
          <Button :disabled="modelData.groupIndex === 0" @click="moveGroup(-1)">上移分组</Button>
          <Button :disabled="modelData.groupIndex === helpList.length - 1" @click="moveGroup(1)">下移分组</Button>
        </div>
        <div class="right">
          <Button v-if="!modelData.cell" @click="createCell">添加项目</Button>
          <Button type="primary" @click="createGroup">添加分组</Button>
          <Popconfirm title="确定删除该分组吗？" @confirm="deleteGroup">
            <Button danger>删除分组</Button>
          </Popconfirm>
        </div>
      </div>

      <template v-if="modelData.cell">
        <Divider />

        <div
          class="icon-view"
          :style="`background:url(${iconB64List[modelData.cell.icon]}) 0 0 no-repeat`"
          @click="openIconModal"
        />

        <div class="row">
          <div>标题</div>
          <div class="flex-1">
            <a-input v-model:value="modelData.cell.title" placeholder="标题" />
          </div>
        </div>

        <div class="row">
          <div>描述</div>
          <div class="flex-1">
            <a-input v-model:value="modelData.cell.desc" placeholder="描述" />
          </div>
        </div>

        <div class="action-row">
          <div class="left">
            <Button :disabled="!canMoveCell(-1)" @click="moveCell(-1)">左移</Button>
            <Button :disabled="!canMoveCell(1)" @click="moveCell(1)">右移</Button>
          </div>
          <div class="right">
            <Button @click="createCell">添加项目</Button>
            <Popconfirm title="确定删除该项目吗？" @confirm="deleteCell">
              <Button danger>删除项目</Button>
            </Popconfirm>
          </div>
        </div>
      </template>
    </div>

    <SelectIconModal
      v-if="modelData.cell"
      v-model:open="iconModalOpen"
      :cell="modelData.cell"
      :icon-b64-list="iconB64List"
    />
  </Modal>
</template>

<style scoped>
.body-wrap {
  padding: 4px 6px;
}

.row {
  padding: 0 0 14px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.row > div:first-child {
  width: 80px;
  display: flex;
  justify-content: flex-end;
  color: #555;
}

.row > div:first-child::after {
  content: ':';
  margin-left: 4px;
}

.action-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.left,
.right {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.icon-view {
  margin: 0 auto 16px;
  width: 80px;
  height: 80px;
  border-radius: 6px;
  box-shadow: 0 0 15px #f0f1f5;
  cursor: pointer;
  transition: all 0.2s;
}

.icon-view:hover {
  box-shadow: 0 0 15px #4ebaee;
}
</style>
