<script lang="ts" setup>
import type {
  EditModelData,
  MiaoHelpEditorAdapter,
  MiaoHelpConfig,
  MiaoHelpGroup,
  MiaoHelpGroups,
  MiaoHelpList,
  MiaoHelpListItem,
  MiaoThemeConfig,
  MiaoVersionInfo,
} from '../types';
import type { CSSProperties } from 'vue';

import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

import { Button, Popover, message } from 'ant-design-vue';

import { getHelpIconList, getThemeAssetUrl } from '../miao.api';
import EditBodyModal from './EditBodyModal.vue';

const props = withDefaults(defineProps<{
  cacheVer: number;
  helpCfg: MiaoHelpConfig;
  helpList: MiaoHelpGroups;
  iconB64List: string[];
  mainB64: null | string;
  modelData: EditModelData;
  themeName: string;
  themeStyle: Partial<MiaoThemeConfig>;
  token: string;
  versions: MiaoVersionInfo;
  editorAdapter: MiaoHelpEditorAdapter | null;
}>(), {
  cacheVer: 0,
  helpCfg: () => ({
    bgBlur: true,
    colCount: 3,
    colWidth: 265,
    subTitle: '',
    theme: 'all',
    themeExclude: ['default'],
    title: '',
  }),
  helpList: () => [],
  iconB64List: () => [],
  mainB64: null,
  modelData: () => ({
    cell: null,
    cellIndex: null,
    group: null,
    groupIndex: null,
    show: false,
  }),
  themeName: 'default',
  themeStyle: () => ({}),
  token: '',
  versions: () => ({
    miao: 'x.x.x',
    yunzai: 'x.x.x',
  }),
  editorAdapter: null,
});

const emit = defineEmits<{
  'open-setting': [];
  'update:iconB64List': [string[]];
  'update:mainB64': [null | string];
  'update:modelData': [EditModelData];
}>();

const bgInputRef = ref<HTMLInputElement | null>(null);
const iconInputRef = ref<HTMLInputElement | null>(null);
const windowWidth = ref(1200);
const opsOpen = ref(false);

const colCount = computed(() => {
  const value = Number(props.helpCfg?.colCount ?? 3);
  return Math.max(2, Math.min(5, Number.isFinite(value) ? value : 3));
});

const colWidth = computed(() => {
  const value = Number(props.helpCfg?.colWidth ?? 265);
  return Math.max(100, Math.min(500, Number.isFinite(value) ? value : 265));
});

const panelWidth = computed(() => {
  const value = colCount.value * colWidth.value + 30;
  return Math.max(800, Math.min(2500, value));
});

const scale = computed(() => {
  const width = windowWidth.value || 1200;
  if (width >= panelWidth.value) {
    return 1;
  }
  return Number((width / panelWidth.value).toFixed(4));
});

const panelStyle = computed<CSSProperties>(() => ({
  transform: `scale(${scale.value})`,
  transformOrigin: 'center top',
}));

const containerStyle = computed<CSSProperties>(() => {
  const themeMain = props.mainB64
    ? props.mainB64
    : getThemeAssetUrl('main', {
      cacheVer: props.cacheVer,
      themeName: props.themeName,
      token: props.token,
    });

  const themeBg = getThemeAssetUrl('bg', {
    cacheVer: props.cacheVer,
    themeName: props.themeName,
    token: props.token,
  });

  return {
    background: `url(${themeMain}) top left/100% auto no-repeat,url(${themeBg})`,
    width: `${panelWidth.value}px`,
  };
});

const themeCssVars = computed<CSSProperties>(() => {
  const style = props.themeStyle ?? {};
  const blur = Number(style.contBgBlur ?? 3);

  return {
    '--miao-col-width-percent': `${100 / colCount.value}%`,
    '--miao-cont-bg': String(style.contBgColor ?? 'rgba(43, 52, 61, 0.8)'),
    '--miao-cont-blur': props.helpCfg?.bgBlur === false ? 'none' : `blur(${blur}px)`,
    '--miao-desc-color': String(style.descColor ?? '#eee'),
    '--miao-desc-shadow': String(style.descShadow ?? 'none'),
    '--miao-font-color': String(style.fontColor ?? '#ceb78b'),
    '--miao-font-shadow': String(style.fontShadow ?? 'none'),
    '--miao-header-bg': String(style.headerBgColor ?? 'rgba(34, 41, 51, .4)'),
    '--miao-row-bg-1': String(style.rowBgColor1 ?? 'rgba(34, 41, 51, .2)'),
    '--miao-row-bg-2': String(style.rowBgColor2 ?? 'rgba(34, 41, 51, .4)'),
  } as CSSProperties;
});

function updateWindowWidth() {
  windowWidth.value = Math.max(360, document.body.clientWidth || window.innerWidth || 1200);
}

function splitRows(list: MiaoHelpList) {
  const rows: MiaoHelpList[] = [];
  for (let index = 0; index < list.length; index += colCount.value) {
    rows.push(list.slice(index, index + colCount.value));
  }
  return rows;
}

function openSetting() {
  emit('open-setting');
  emit('update:modelData', {
    ...props.modelData,
    show: false,
  });
  opsOpen.value = false;
}

function clickBody(
  cell: MiaoHelpListItem | null,
  cellIndex: null | number,
  group: MiaoHelpGroup,
  groupIndex: number,
) {
  let isShow = true;
  if (props.modelData.show && cell && props.modelData.cell === cell) {
    isShow = false;
  }

  emit('update:modelData', {
    cell,
    cellIndex,
    group,
    groupIndex,
    show: isShow,
  });
}

function triggerBgInput() {
  bgInputRef.value?.click();
  opsOpen.value = false;
}

function triggerIconInput() {
  iconInputRef.value?.click();
  opsOpen.value = false;
}

function onBgInputChange(event: Event) {
  const target = event.target as HTMLInputElement;
  const files = target.files;
  if (!files || files.length === 0) {
    return;
  }

  const file = files[0]!;
  const reader = new FileReader();
  reader.onload = () => {
    emit('update:mainB64', String(reader.result ?? ''));
  };
  reader.readAsDataURL(file);
  target.value = '';
}

async function onIconInputChange(event: Event) {
  const target = event.target as HTMLInputElement;
  const files = target.files;
  if (!files || files.length === 0) {
    return;
  }

  try {
    const file = files[0]!;
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(String(reader.result ?? ''));
      };
      reader.onerror = () => {
        reject(new Error('读取图标失败'));
      };
      reader.readAsDataURL(file);
    });

    const iconList = await getHelpIconList(base64);
    emit('update:iconB64List', iconList);
    message.success('图标上传成功');
  } catch (error) {
    message.error((error as Error)?.message || '图标上传失败');
  } finally {
    target.value = '';
  }
}

function cellStyle(cell: MiaoHelpListItem) {
  return {
    background: `url(${props.iconB64List[cell.icon] || ''}) 0 0 no-repeat`,
  };
}

onMounted(() => {
  updateWindowWidth();
  window.addEventListener('resize', updateWindowWidth);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateWindowWidth);
});
</script>

<template>
  <div class="miao-help-panel" :style="panelStyle">
    <div class="container" :style="[containerStyle, themeCssVars]">
      <div class="setting-box">
        <Popover
          v-model:open="opsOpen"
          trigger="click"
          placement="leftTop"
          overlayClassName="miao-ops-popover"
        >
          <template #content>
            <div class="ops-panel">
              <button type="button" class="ops-item" @click="triggerBgInput">
                <span class="ops-dot"></span>
                <span>更换背景</span>
              </button>
              <button type="button" class="ops-item" @click="triggerIconInput">
                <span class="ops-dot"></span>
                <span>上传图标</span>
              </button>
              <button type="button" class="ops-item" @click="openSetting">
                <span class="ops-dot"></span>
                <span>高级设置</span>
              </button>
            </div>
          </template>
          <Button class="ops-trigger">
            <span>操作</span>
            <span :class="['ops-caret', { open: opsOpen }]" />
          </Button>
        </Popover>
      </div>

      <input
        ref="bgInputRef"
        type="file"
        accept="image/bmp,image/jpeg,image/png"
        class="hidden-input"
        @change="onBgInputChange"
      />
      <input
        ref="iconInputRef"
        type="file"
        accept="image/png"
        class="hidden-input"
        @change="onIconInputChange"
      />

      <div class="info-box">
        <div class="head-box">
          <div class="title">{{ helpCfg.title }}</div>
          <div class="label">{{ helpCfg.subTitle }}</div>
        </div>
      </div>

      <div v-for="(group, groupIndex) in helpList" :key="groupIndex" class="cont-box">
        <div class="help-group" @click="clickBody(null, null, group, groupIndex)">
          <span>{{ group.group }}</span>
        </div>

        <div v-if="group.list && group.list.length > 0" class="help-table">
          <div
            v-for="(row, rowIndex) in splitRows(group.list)"
            :key="`row-${groupIndex}-${rowIndex}`"
            class="tr"
          >
            <template v-for="colIndex in colCount" :key="`cell-${groupIndex}-${rowIndex}-${colIndex}`">
              <template v-if="row[colIndex - 1]">
                <div
                  :class="[
                    'td',
                    {
                      active: modelData.show && modelData.cell === row[colIndex - 1],
                    },
                  ]"
                  @click="clickBody(row[colIndex - 1]!, rowIndex * colCount + (colIndex - 1), group, groupIndex)"
                >
                  <span class="help-icon" :style="cellStyle(row[colIndex - 1]!)" />
                  <strong class="help-title">{{ row[colIndex - 1]!.title }}</strong>
                  <span class="help-desc">{{ row[colIndex - 1]!.desc }}</span>
                </div>
              </template>
              <template v-else>
                <div class="td empty" />
              </template>
            </template>
          </div>
        </div>
      </div>

      <div class="copyright">
        Created By Yunzai-Bot
        <span class="version">{{ versions.yunzai }}</span>
        &amp; Miao-Plugin
        <span class="version">{{ versions.miao }}</span>
      </div>
    </div>

    <EditBodyModal
      :help-list="helpList"
      :icon-b64-list="iconB64List"
      :model-data="modelData"
      :editor-adapter="editorAdapter"
      @update:model-data="emit('update:modelData', $event)"
    />
  </div>
</template>

<style scoped lang="less">
@import '../style/miao.less';

.setting-box {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 3;
}

.ops-trigger {
  min-width: 72px;
  height: 32px;
  padding: 0 12px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.45);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  line-height: 32px;
  background: linear-gradient(
    135deg,
    rgba(40, 49, 61, 0.78),
    rgba(23, 32, 43, 0.72)
  );
  box-shadow: 0 5px 14px rgba(2, 6, 23, 0.28);
  backdrop-filter: blur(8px);
}

.ops-trigger:hover,
.ops-trigger:focus {
  color: #fff;
  border-color: rgba(255, 255, 255, 0.6);
  background: linear-gradient(
    135deg,
    rgba(58, 71, 87, 0.82),
    rgba(33, 45, 58, 0.78)
  );
}

.ops-panel {
  display: flex;
  flex-direction: column;
  min-width: 146px;
  gap: 4px;
}

.ops-item {
  display: flex;
  align-items: center;
  gap: 8px;
  border: none;
  border-radius: 10px;
  padding: 8px 10px;
  color: hsl(var(--popover-foreground));
  background: transparent;
  cursor: pointer;
  text-align: left;
  font-size: 13px;
}

.ops-item:hover {
  background: hsl(var(--accent) / 78%);
}

.ops-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: hsl(var(--primary));
}

:deep(.miao-ops-popover .ant-popover-inner) {
  border-radius: 12px;
  border: 1px solid hsl(var(--border) / 65%);
  background: hsl(var(--popover) / 96%);
  box-shadow: 0 10px 26px hsl(220 20% 10% / 20%);
  backdrop-filter: blur(10px);
}

:deep(.miao-ops-popover .ant-popover-inner-content) {
  padding: 8px;
}

:deep(.miao-ops-popover .ant-popover-arrow::before) {
  background: hsl(var(--popover) / 96%);
}

.ops-caret {
  width: 6px;
  height: 6px;
  border-right: 1.5px solid rgba(255, 255, 255, 0.9);
  border-bottom: 1.5px solid rgba(255, 255, 255, 0.9);
  transform: rotate(45deg) translateY(-1px);
  transition: transform 0.2s ease;
}

.ops-caret.open {
  transform: rotate(-135deg) translateY(-1px);
}

.hidden-input {
  display: none;
}
</style>
