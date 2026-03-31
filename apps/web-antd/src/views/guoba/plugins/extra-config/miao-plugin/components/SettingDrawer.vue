<script lang="ts" setup>
import type { MiaoHelpConfig, MiaoThemeConfig } from '../types';

import { computed, ref, watch } from 'vue';

import {
  Button,
  Col,
  Drawer,
  Form,
  Input,
  InputNumber,
  Radio,
  Row,
  Select,
  Space,
  Switch,
} from 'ant-design-vue';

const props = defineProps<{
  debugThemeName: string;
  model: MiaoHelpConfig;
  open: boolean;
  themeName: string;
  themeNames: string[];
  themeStyle: Partial<MiaoThemeConfig>;
}>();

const emit = defineEmits<{
  'update:debugThemeName': [string];
  'update:model': [MiaoHelpConfig];
  'update:open': [boolean];
  'update:themeStyle': [Partial<MiaoThemeConfig>];
}>();

const formModel = ref<MiaoHelpConfig>(cloneHelpCfg(props.model));
const styleModel = ref<Partial<MiaoThemeConfig>>(cloneStyle(props.themeStyle));
const debugEnabled = ref(false);

const themeOptions = computed(() => {
  const names = Array.isArray(props.themeNames) && props.themeNames.length > 0
    ? props.themeNames
    : ['default'];
  return names.map((name) => ({
    label: name,
    value: name,
  }));
});

const currentThemeName = computed(() => {
  return debugEnabled.value
    ? props.debugThemeName || props.themeName || ''
    : '';
});

const drawerWidth = computed(() => {
  return window.innerWidth >= 640 ? 640 : window.innerWidth;
});

watch(
  () => props.open,
  (open) => {
    if (open) {
      formModel.value = cloneHelpCfg(props.model);
      styleModel.value = cloneStyle(props.themeStyle);
      debugEnabled.value = !!props.debugThemeName;
    }
  },
);

function closeDrawer() {
  emit('update:open', false);
}

function applyChanges() {
  const nextModel = cloneHelpCfg(formModel.value);
  if (!Array.isArray(nextModel.theme) || nextModel.theme.length === 0) {
    nextModel.theme = 'all';
  }
  emit('update:model', nextModel);
  emit('update:themeStyle', { ...styleModel.value });
  emit('update:debugThemeName', debugEnabled.value ? currentThemeName.value : '');
  closeDrawer();
}

function onThemeSetChange(themeSet: unknown) {
  const enabled = themeSet === true;
  if (enabled) {
    const current = formModel.value.theme;
    if (!Array.isArray(current) || current.length === 0) {
      formModel.value.theme = ['default'];
    }
  } else {
    formModel.value.theme = 'all';
  }
}

function updateDebugThemeName(value: unknown) {
  emit('update:debugThemeName', typeof value === 'string' ? value : '');
}

function cloneHelpCfg(value?: MiaoHelpConfig) {
  const cfg = value ? JSON.parse(JSON.stringify(value)) as MiaoHelpConfig : ({} as MiaoHelpConfig);
  return {
    bgBlur: cfg.bgBlur !== false,
    colCount: Number(cfg.colCount ?? 3),
    colWidth: Number(cfg.colWidth ?? 265),
    subTitle: cfg.subTitle ?? '',
    theme: cfg.theme ?? 'all',
    themeExclude: Array.isArray(cfg.themeExclude) ? [...cfg.themeExclude] : ['default'],
    title: cfg.title ?? '',
  };
}

function cloneStyle(value?: Partial<MiaoThemeConfig>) {
  const style = value ? JSON.parse(JSON.stringify(value)) as Partial<MiaoThemeConfig> : {};
  return {
    contBgBlur: Number(style.contBgBlur ?? 3),
    contBgColor: style.contBgColor ?? 'rgba(43,52,61,0.8)',
    descColor: style.descColor ?? '#eeeeee',
    descShadow: style.descShadow ?? 'none',
    fontColor: style.fontColor ?? '#ceb78b',
    fontShadow: style.fontShadow ?? 'none',
    headerBgColor: style.headerBgColor ?? 'rgba(34,41,51,0.4)',
    rowBgColor1: style.rowBgColor1 ?? 'rgba(34,41,51,0.2)',
    rowBgColor2: style.rowBgColor2 ?? 'rgba(34,41,51,0.4)',
  };
}
</script>

<template>
  <Drawer
    :open="open"
    :width="drawerWidth"
    placement="left"
    title="高级设置"
    @close="closeDrawer"
  >
    <Form layout="vertical">
      <Row :gutter="12">
        <Col :span="24">
          <Form.Item label="帮助标题">
            <Input v-model:value="formModel.title" />
          </Form.Item>
        </Col>
        <Col :span="24">
          <Form.Item label="副标题">
            <Input v-model:value="formModel.subTitle" />
          </Form.Item>
        </Col>
        <Col :span="12">
          <Form.Item label="列数">
            <Radio.Group v-model:value="formModel.colCount">
              <Radio :value="2">2</Radio>
              <Radio :value="3">3</Radio>
              <Radio :value="4">4</Radio>
              <Radio :value="5">5</Radio>
            </Radio.Group>
          </Form.Item>
        </Col>
        <Col :span="12">
          <Form.Item label="单列宽度">
            <InputNumber v-model:value="formModel.colWidth" :max="500" :min="100" style="width: 100%" />
          </Form.Item>
        </Col>

        <Col :span="12">
          <Form.Item label="背景毛玻璃">
            <Switch v-model:checked="formModel.bgBlur" />
          </Form.Item>
        </Col>
        <Col :span="12">
          <Form.Item label="指定皮肤">
            <Switch :checked="Array.isArray(formModel.theme)" @change="onThemeSetChange" />
          </Form.Item>
        </Col>

        <Col :span="24" v-if="Array.isArray(formModel.theme)">
          <Form.Item label="皮肤池（随机）">
            <Select v-model:value="formModel.theme" mode="multiple" :options="themeOptions" />
          </Form.Item>
        </Col>

        <Col :span="24">
          <Form.Item label="排除皮肤">
            <Select v-model:value="formModel.themeExclude" mode="multiple" :options="themeOptions" />
          </Form.Item>
        </Col>

        <Col :span="24">
          <Form.Item label="调试皮肤">
            <Space>
              <Switch v-model:checked="debugEnabled" />
              <Select
                v-if="debugEnabled"
                :options="themeOptions"
                :value="currentThemeName"
                style="width: 200px"
                @change="updateDebugThemeName"
              />
            </Space>
          </Form.Item>
        </Col>

        <Col :span="24">
          <Form.Item label="主文字颜色">
            <Input v-model:value="styleModel.fontColor" />
          </Form.Item>
        </Col>
        <Col :span="24">
          <Form.Item label="描述文字颜色">
            <Input v-model:value="styleModel.descColor" />
          </Form.Item>
        </Col>
        <Col :span="24">
          <Form.Item label="标题栏底色">
            <Input v-model:value="styleModel.headerBgColor" />
          </Form.Item>
        </Col>
        <Col :span="24">
          <Form.Item label="整体底色">
            <Input v-model:value="styleModel.contBgColor" />
          </Form.Item>
        </Col>
        <Col :span="12">
          <Form.Item label="奇数行底色">
            <Input v-model:value="styleModel.rowBgColor1" />
          </Form.Item>
        </Col>
        <Col :span="12">
          <Form.Item label="偶数行底色">
            <Input v-model:value="styleModel.rowBgColor2" />
          </Form.Item>
        </Col>
        <Col :span="24">
          <Form.Item label="主文字阴影">
            <Input v-model:value="styleModel.fontShadow" />
          </Form.Item>
        </Col>
        <Col :span="24">
          <Form.Item label="描述文字阴影">
            <Input v-model:value="styleModel.descShadow" />
          </Form.Item>
        </Col>
        <Col :span="24">
          <Form.Item label="内容毛玻璃强度">
            <InputNumber v-model:value="styleModel.contBgBlur" :max="10" :min="0" style="width: 100%" />
          </Form.Item>
        </Col>
      </Row>
    </Form>

    <template #footer>
      <div class="footer-actions">
        <Space>
          <Button @click="closeDrawer">取消</Button>
          <Button type="primary" @click="applyChanges">应用</Button>
        </Space>
      </div>
    </template>
  </Drawer>
</template>

<style scoped>
.footer-actions {
  width: 100%;
  display: flex;
  justify-content: flex-end;
}
</style>
