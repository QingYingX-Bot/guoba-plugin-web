<script lang="ts" setup>
import type { MiaoThemeConfig, MiaoThemeItem } from '../types';

import { computed, reactive, ref, watch } from 'vue';

import {
  Button,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  List,
  Modal,
  Popconfirm,
  Space,
  Tag,
  Typography,
  message,
} from 'ant-design-vue';

import {
  addThemeItem,
  deleteThemeItem,
  getThemeAssetUrl,
  getThemeList,
  putThemeItem,
  saveThemeConfig,
} from '../miao.api';

const props = defineProps<{
  open: boolean;
  token: string;
}>();

const emit = defineEmits<{
  'update:open': [boolean];
  'update:themeNames': [string[]];
}>();

const loading = ref(false);
const themeList = ref<MiaoThemeItem[]>([]);
const themePicVer = reactive<Record<string, number>>({});

const addModalOpen = ref(false);
const addThemeName = ref('');
const addThemeFile = ref<File | null>(null);

const editModalOpen = ref(false);
const editThemeName = ref('');
const editThemeStyle = ref<Partial<MiaoThemeConfig>>({});

const uploadInputRef = ref<HTMLInputElement | null>(null);
let uploadResolve: null | ((file: File | null) => void) = null;
const drawerWidth = computed(() => (window.innerWidth >= 768 ? 760 : window.innerWidth));

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
    const list = await getThemeList();
    themeList.value = Array.isArray(list) ? list : [];
    emit('update:themeNames', themeList.value.map((item) => item.name));
  } finally {
    loading.value = false;
  }
}

function closeDrawer() {
  emit('update:open', false);
}

function getThemeSrc(name: string) {
  return getThemeAssetUrl('main', {
    cacheVer: themePicVer[name] ?? 1,
    themeName: name,
    token: props.token,
  });
}

function openAddThemeModal() {
  addThemeName.value = '';
  addThemeFile.value = null;
  addModalOpen.value = true;
}

function onAddThemeFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  const files = target.files;
  addThemeFile.value = files && files.length > 0 ? files[0]! : null;
}

async function submitAddTheme() {
  const name = addThemeName.value.trim();
  if (!name) {
    message.warning('请输入皮肤名称');
    return;
  }
  if (!addThemeFile.value) {
    message.warning('请选择皮肤底图');
    return;
  }

  loading.value = true;
  try {
    await addThemeItem(name, addThemeFile.value);
    addModalOpen.value = false;
    await loadData();
    message.success('皮肤新增成功');
  } finally {
    loading.value = false;
  }
}

async function openEditTheme(theme: MiaoThemeItem) {
  editThemeName.value = theme.name;
  editThemeStyle.value = {
    ...(theme.style ?? {}),
    descShadow: theme.style?.descShadow ?? 'none',
    fontShadow: theme.style?.fontShadow ?? 'none',
  };
  editModalOpen.value = true;
}

async function submitEditTheme() {
  loading.value = true;
  try {
    await saveThemeConfig(editThemeName.value, { ...editThemeStyle.value });
    editModalOpen.value = false;
    await loadData();
    message.success('皮肤配置保存成功');
  } finally {
    loading.value = false;
  }
}

async function changeThemeImage(theme: MiaoThemeItem) {
  const file = await pickImageFile();
  if (!file) {
    return;
  }

  loading.value = true;
  try {
    await putThemeItem(theme.name, file);
    themePicVer[theme.name] = (themePicVer[theme.name] ?? 1) + 1;
    message.success('底图更新成功');
  } finally {
    loading.value = false;
  }
}

async function removeTheme(theme: MiaoThemeItem) {
  if (theme.name === 'default') {
    message.warning('默认皮肤不可删除');
    return;
  }

  loading.value = true;
  try {
    await deleteThemeItem(theme.name);
    await loadData();
    message.success('皮肤删除成功');
  } finally {
    loading.value = false;
  }
}

async function pickImageFile() {
  uploadInputRef.value?.click();
  return await new Promise<File | null>((resolve) => {
    uploadResolve = resolve;
  });
}

function onHiddenFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  const files = target.files;
  const file = files && files.length > 0 ? files[0]! : null;
  if (uploadResolve) {
    uploadResolve(file);
    uploadResolve = null;
  }
  target.value = '';
}
</script>

<template>
  <Drawer
    :open="open"
    :width="drawerWidth"
    title="喵喵帮助皮肤"
    @close="closeDrawer"
  >
    <div class="mb-3">
      <Button type="primary" @click="openAddThemeModal">新增皮肤</Button>
    </div>

    <input
      ref="uploadInputRef"
      type="file"
      accept="image/bmp,image/jpeg,image/png"
      class="hidden-input"
      @change="onHiddenFileChange"
    />

    <List
      bordered
      :data-source="themeList"
      :loading="loading"
      item-layout="vertical"
    >
      <template #renderItem="{ item }">
        <List.Item>
          <template #actions>
            <Button size="small" @click="openEditTheme(item)">编辑配置</Button>
            <Button size="small" @click="changeThemeImage(item)">更换底图</Button>
            <Popconfirm title="确定删除该皮肤吗？" @confirm="removeTheme(item)">
              <Button size="small" danger :disabled="item.name === 'default'">删除</Button>
            </Popconfirm>
          </template>

          <List.Item.Meta>
            <template #title>
              <Space>
                <span>{{ item.name }}</span>
                <Tag v-if="item.name === 'default'" color="blue">默认</Tag>
              </Space>
            </template>
            <template #description>
              <div class="theme-desc">
                <img :src="getThemeSrc(item.name)" alt="theme" />
                <Typography.Paragraph class="theme-json">
                  {{ JSON.stringify(item.style ?? {}, null, 2) }}
                </Typography.Paragraph>
              </div>
            </template>
          </List.Item.Meta>
        </List.Item>
      </template>
    </List>

    <Empty v-if="!loading && themeList.length === 0" description="暂无皮肤" class="mt-3" />

    <Modal
      v-model:open="addModalOpen"
      title="新增皮肤"
      @ok="submitAddTheme"
    >
      <Form layout="vertical">
        <Form.Item label="皮肤名称" required>
          <Input v-model:value="addThemeName" :maxlength="32" placeholder="例如：my-theme" />
        </Form.Item>
        <Form.Item label="皮肤底图" required>
          <input
            type="file"
            accept="image/bmp,image/jpeg,image/png"
            @change="onAddThemeFileChange"
          />
        </Form.Item>
      </Form>
    </Modal>

    <Modal
      v-model:open="editModalOpen"
      title="编辑皮肤配置"
      width="640px"
      @ok="submitEditTheme"
    >
      <Form layout="vertical">
        <Form.Item label="主文字颜色">
          <Input v-model:value="editThemeStyle.fontColor" />
        </Form.Item>
        <Form.Item label="主文字阴影">
          <Input v-model:value="editThemeStyle.fontShadow" />
        </Form.Item>
        <Form.Item label="描述颜色">
          <Input v-model:value="editThemeStyle.descColor" />
        </Form.Item>
        <Form.Item label="描述阴影">
          <Input v-model:value="editThemeStyle.descShadow" />
        </Form.Item>
        <Form.Item label="整体底色">
          <Input v-model:value="editThemeStyle.contBgColor" />
        </Form.Item>
        <Form.Item label="毛玻璃强度">
          <InputNumber v-model:value="editThemeStyle.contBgBlur" :min="0" :max="10" style="width: 100%" />
        </Form.Item>
        <Form.Item label="分组标题栏底色">
          <Input v-model:value="editThemeStyle.headerBgColor" />
        </Form.Item>
        <Form.Item label="奇数行底色">
          <Input v-model:value="editThemeStyle.rowBgColor1" />
        </Form.Item>
        <Form.Item label="偶数行底色">
          <Input v-model:value="editThemeStyle.rowBgColor2" />
        </Form.Item>
      </Form>
    </Modal>
  </Drawer>
</template>

<style scoped>
.hidden-input {
  display: none;
}

.theme-desc {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.theme-desc img {
  width: 150px;
  border-radius: 6px;
  border: 1px solid #f0f0f0;
}

.theme-json {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  padding: 8px;
  flex: 1;
}
</style>
