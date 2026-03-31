<script lang="ts" setup>
import type {
  EditModelData,
  MiaoHelpEditorAdapter,
  MiaoHelpConfig,
  MiaoHelpGroups,
  MiaoThemeConfig,
  MiaoVersionInfo,
} from './types';

import { computed, ref, watch } from 'vue';

import { Page } from '@vben/common-ui';
import { useAccessStore } from '@vben/stores';

import { Card, Modal, Spin, message } from 'ant-design-vue';

import {
  getHelpIconList,
  getMiaoHelpCfg,
  getThemeConfig,
  saveMiaoHelpCfg,
} from './miao.api';
import BackupDrawer from './components/BackupDrawer.vue';
import HelpPanel from './components/HelpPanel.vue';
import MiaoHeader from './components/MiaoHeader.vue';
import SettingDrawer from './components/SettingDrawer.vue';
import ThemeDrawer from './components/ThemeDrawer.vue';

const accessStore = useAccessStore();

const loading = ref(false);
const pageLoading = ref(true);
const cacheVer = ref(0);

const helpCfg = ref<MiaoHelpConfig>(defaultHelpCfg());
const helpList = ref<MiaoHelpGroups>([]);
const mainB64 = ref<null | string>(null);
const iconB64List = ref<string[]>([]);

const versions = ref<MiaoVersionInfo>({
  miao: 'x.x.x',
  yunzai: 'x.x.x',
});

const modelData = ref<EditModelData>({
  cell: null,
  cellIndex: null,
  group: null,
  groupIndex: null,
  show: false,
});

const themeNames = ref<string[]>([]);
const themeStyle = ref<Partial<MiaoThemeConfig>>({});
const debugThemeName = ref('');
const themeName = ref('default');

const backupDrawerOpen = ref(false);
const settingDrawerOpen = ref(false);
const themeDrawerOpen = ref(false);

const token = computed(() => String(accessStore.accessToken ?? ''));
const editorAdapter = resolveEditorAdapter();

function resolveEditorAdapter() {
  if (typeof window === 'undefined') {
    return null;
  }

  const adapterWindow = window as Window & {
    __GUOBA_MIAO_HELP_EDITOR_ADAPTER__?: MiaoHelpEditorAdapter;
    __GUOBA_MIAO_HELP_EDITOR_ADAPTER_FACTORY__?: () => MiaoHelpEditorAdapter | null | undefined;
  };

  try {
    const adapterFactory = adapterWindow.__GUOBA_MIAO_HELP_EDITOR_ADAPTER_FACTORY__;
    if (typeof adapterFactory === 'function') {
      const adapter = adapterFactory();
      if (adapter) {
        return adapter;
      }
    }
  } catch (error) {
    console.error('[MiaoHelpEditorAdapter] adapter factory failed:', error);
  }

  return adapterWindow.__GUOBA_MIAO_HELP_EDITOR_ADAPTER__ ?? null;
}

watch(
  [debugThemeName, themeNames, () => helpCfg.value.theme, () => helpCfg.value.themeExclude],
  () => {
    themeName.value = selectThemeName();
  },
  {
    deep: true,
    immediate: true,
  },
);

watch(
  () => themeName.value,
  async (name) => {
    if (!name) {
      themeStyle.value = {};
      return;
    }
    try {
      themeStyle.value = await getThemeConfig(name);
    } catch {
      themeStyle.value = {};
    }
  },
  { immediate: true },
);

async function loadData() {
  loading.value = true;
  try {
    const result = await getMiaoHelpCfg();
    helpCfg.value = normalizeHelpCfg(result.helpCfg);
    helpList.value = normalizeHelpList(result.helpList);
    themeNames.value = normalizeThemeNames(result.themeNames);
    versions.value = {
      miao: String(result.miaoVersion ?? 'x.x.x'),
      yunzai: String(result.yunzaiVersion ?? 'x.x.x'),
    };

    mainB64.value = null;
    iconB64List.value = await getHelpIconList();
    cacheVer.value += 1;
  } finally {
    loading.value = false;
    pageLoading.value = false;
  }
}

async function saveData() {
  loading.value = true;
  try {
    await saveMiaoHelpCfg(
      helpCfg.value,
      helpList.value,
      iconB64List.value,
      mainB64.value,
    );
    await loadData();
    message.success('保存成功');
  } finally {
    loading.value = false;
  }
}

function rollback() {
  Modal.confirm({
    content: '确定要放弃当前未保存的修改吗？',
    okText: '放弃修改',
    title: '回滚确认',
    onOk: () => {
      loadData();
    },
  });
}

function openBackup() {
  backupDrawerOpen.value = true;
}

function openTheme() {
  themeDrawerOpen.value = true;
}

function openSetting() {
  settingDrawerOpen.value = true;
}

function defaultHelpCfg(): MiaoHelpConfig {
  return {
    bgBlur: true,
    colCount: 3,
    colWidth: 265,
    subTitle: '',
    theme: 'all',
    themeExclude: ['default'],
    title: '喵喵帮助',
  };
}

function normalizeHelpCfg(cfg?: Partial<MiaoHelpConfig>) {
  const base = defaultHelpCfg();
  const merged = {
    ...base,
    ...(cfg ?? {}),
  };

  const theme = merged.theme;
  if (Array.isArray(theme)) {
    merged.theme = theme.length > 0 ? theme : 'all';
  }

  if (!Array.isArray(merged.themeExclude)) {
    merged.themeExclude = ['default'];
  }

  return merged;
}

function normalizeHelpList(list?: unknown): MiaoHelpGroups {
  if (!Array.isArray(list)) {
    return [];
  }

  return list.map((group: any) => ({
    auth: group?.auth === 'master' ? ('master' as const) : undefined,
    desc: String(group?.desc ?? ''),
    group: String(group?.group ?? '未命名分组'),
    list: Array.isArray(group?.list)
      ? group.list.map((item: any) => ({
        desc: String(item?.desc ?? ''),
        icon: Math.max(1, Number(item?.icon ?? 1) || 1),
        title: String(item?.title ?? '未命名项目'),
      }))
      : [],
  }));
}

function normalizeThemeNames(names?: string[]) {
  if (!Array.isArray(names) || names.length === 0) {
    return ['default'];
  }
  return names;
}

function selectThemeName() {
  if (debugThemeName.value) {
    return debugThemeName.value;
  }

  const names = themeNames.value.length > 0 ? themeNames.value : ['default'];
  let include: string[] = [];

  if (Array.isArray(helpCfg.value.theme)) {
    include = helpCfg.value.theme.filter((name) => names.includes(name));
  } else {
    include = [...names];
  }

  const exclude = Array.isArray(helpCfg.value.themeExclude)
    ? helpCfg.value.themeExclude
    : [];

  include = include.filter((name) => !exclude.includes(name));
  if (include.length === 0) {
    include = ['default'];
  }

  const index = Math.floor(Math.random() * include.length);
  return include[index] ?? 'default';
}

loadData();
</script>

<template>
  <Page>
    <Card :loading="loading" class="miao-edit-page">
      <MiaoHeader
        class="mb-4"
        :loading="loading"
        :versions="versions"
        @backup="openBackup"
        @refresh="loadData"
        @rollback="rollback"
        @save="saveData"
        @setting="openSetting"
        @theme="openTheme"
      />

      <div class="preview-wrap">
        <Spin :spinning="loading || pageLoading">
          <Transition name="scroll-y-reverse-transition">
            <HelpPanel
              v-if="!pageLoading"
              :cache-ver="cacheVer"
              :help-cfg="helpCfg"
              :help-list="helpList"
              :icon-b64-list="iconB64List"
              :main-b64="mainB64"
              :model-data="modelData"
              :theme-name="themeName"
              :theme-style="themeStyle"
              :token="token"
              :versions="versions"
              :editor-adapter="editorAdapter"
              @open-setting="openSetting"
              @update:icon-b64-list="iconB64List = $event"
              @update:main-b64="mainB64 = $event"
              @update:model-data="modelData = $event"
            />
          </Transition>
        </Spin>
      </div>
    </Card>

    <ThemeDrawer
      v-model:open="themeDrawerOpen"
      :token="token"
      @update:theme-names="themeNames = $event"
    />

    <BackupDrawer
      v-model:open="backupDrawerOpen"
      @reload="loadData"
    />

    <SettingDrawer
      v-model:debug-theme-name="debugThemeName"
      v-model:model="helpCfg"
      v-model:open="settingDrawerOpen"
      v-model:theme-style="themeStyle"
      :theme-name="themeName"
      :theme-names="themeNames"
    />
  </Page>
</template>

<style scoped>
.preview-wrap {
  display: flex;
  justify-content: center;
  padding: 12px 0;
  overflow: auto;
}
</style>
