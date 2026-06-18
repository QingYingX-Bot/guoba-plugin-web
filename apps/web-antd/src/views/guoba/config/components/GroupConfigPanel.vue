<script setup lang="ts">
import type { GuobaConfigCard } from '#/api/guoba';

import type { GroupDetailView, GroupEntryTools, GroupRuleField, GroupRulePlugin, GroupRuleTools, GroupSchemaTools, GroupSelectOption, GroupSettingSection, KeyFormEntry } from '../types';

import { computed } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { Button, Empty, Select, Segmented, Space, Tag, Tooltip } from 'ant-design-vue';

import GroupRulesPanel from './GroupRulesPanel.vue';
import GroupSettingsPanel from './GroupSettingsPanel.vue';

import './group-config.css';

const props = defineProps<{
  activeEntry: KeyFormEntry | null;
  card: GuobaConfigCard;
  detailView: GroupDetailView;
  entries: KeyFormEntry[];
  entryTools: GroupEntryTools;
  filteredEntries: KeyFormEntry[];
  filteredRulePlugins: GroupRulePlugin[];
  loading: boolean;
  pluginRulesLoading: boolean;
  ruleFields: readonly GroupRuleField[];
  ruleSearchKeyword: string;
  ruleSelectOptions: GroupSelectOption[];
  ruleTools: GroupRuleTools;
  schemaTools: GroupSchemaTools;
  searchKeyword: string;
  settingSections: GroupSettingSection[];
}>();

const emit = defineEmits<{
  addEntry: [];
  deleteEntry: [entry: KeyFormEntry];
  refresh: [];
  refreshRules: [];
  saveEntry: [entry: KeyFormEntry];
  selectEntry: [rawKey: string];
  'update:detailView': [value: GroupDetailView];
  'update:ruleSearchKeyword': [value: string];
  'update:searchKeyword': [value: string];
}>();

const pickerEntries = computed(() => {
  if (!props.activeEntry || props.filteredEntries.some((entry) => entry.rawKey === props.activeEntry?.rawKey)) {
    return props.filteredEntries;
  }
  return [props.activeEntry, ...props.filteredEntries];
});

const activeDetailView = computed({
  get: () => props.detailView,
  set: (value) => emit('update:detailView', value as GroupDetailView),
});

const detailOptions = [
  { label: '基础设置', value: 'settings' },
  { label: '功能名单', value: 'rules' },
];

const activeRuleCount = computed(() => {
  if (!props.activeEntry) {
    return 0;
  }
  return props.ruleTools.getFieldValue(props.activeEntry, 'enable').length
    + props.ruleTools.getFieldValue(props.activeEntry, 'disable').length;
});

const activeEnableCount = computed(() => {
  return props.activeEntry ? props.ruleTools.getFieldValue(props.activeEntry, 'enable').length : 0;
});

const activeDisableCount = computed(() => {
  return props.activeEntry ? props.ruleTools.getFieldValue(props.activeEntry, 'disable').length : 0;
});

function handleSelectEntry(rawKey: unknown) {
  const nextKey = String(rawKey ?? '');
  if (!nextKey) {
    return;
  }
  emit('selectEntry', nextKey);
  emit('update:searchKeyword', '');
}
</script>

<template>
  <div class="group-config-shell">
    <div class="group-commandbar">
      <div class="group-picker">
        <span class="group-picker-label">当前群</span>
        <Select
          class="group-picker-select"
          :filter-option="false"
          option-label-prop="label"
          placeholder="搜索群名或群号"
          show-search
          :search-value="searchKeyword"
          :value="activeEntry?.rawKey"
          @search="emit('update:searchKeyword', String($event ?? ''))"
          @select="handleSelectEntry"
        >
          <Select.Option
            v-for="entry in pickerEntries"
            :key="entry.rawKey"
            :label="entryTools.getTitle(card, entry)"
            :value="entry.rawKey"
          >
            <div class="group-picker-option">
              <span>{{ entryTools.getTitle(card, entry) }}</span>
              <small>{{ entryTools.getSubtitle(entry) }}</small>
            </div>
          </Select.Option>
        </Select>
        <Tag>{{ filteredEntries.length }} / {{ entries.length }}</Tag>
      </div>

      <Space class="group-command-actions" :size="8" wrap>
        <Button v-if="card.allowAdd" size="small" type="primary" @click="emit('addEntry')">
          <IconifyIcon icon="lucide:plus" />
          新增群聊
        </Button>
        <Tooltip title="刷新配置">
          <Button size="small" :loading="loading" @click="emit('refresh')">
            <IconifyIcon icon="lucide:refresh-cw" />
          </Button>
        </Tooltip>
        <Tooltip
          v-if="activeEntry && card.allowDel && !entryTools.isDefault(activeEntry)"
          title="删除当前群配置"
        >
          <Button danger size="small" @click="emit('deleteEntry', activeEntry)">
            <IconifyIcon icon="lucide:trash-2" />
          </Button>
        </Tooltip>
        <Button
          :disabled="!activeEntry"
          size="small"
          type="primary"
          :loading="activeEntry?.saving"
          @click="activeEntry && emit('saveEntry', activeEntry)"
        >
          <IconifyIcon icon="lucide:save" />
          保存
        </Button>
      </Space>
    </div>

    <Empty
      v-if="!activeEntry"
      class="group-config-empty"
      description="请选择或新增一个群配置"
    />

    <div v-else class="group-config-editor">
      <div class="group-editor-head">
        <div class="group-editor-title">
          <strong>{{ entryTools.getTitle(card, activeEntry) }}</strong>
          <span>{{ entryTools.getSubtitle(activeEntry) }}</span>
        </div>

        <div class="group-editor-meta">
          <Tag v-if="entryTools.isDefault(activeEntry)">默认</Tag>
          <Tag color="blue">设置 {{ settingSections.length }}</Tag>
          <Tag color="green">白 {{ activeEnableCount }}</Tag>
          <Tag color="red">黑 {{ activeDisableCount }}</Tag>
        </div>
      </div>

      <div class="group-editor-switch">
        <Segmented v-model:value="activeDetailView" :options="detailOptions" />
        <Tag v-if="activeRuleCount > 0">功能规则 {{ activeRuleCount }}</Tag>
      </div>

      <div class="group-editor-body">
        <GroupSettingsPanel v-show="activeDetailView === 'settings'" :entry="activeEntry" :schema-tools="schemaTools" :sections="settingSections" />

        <GroupRulesPanel
          v-show="activeDetailView === 'rules'"
          :card="card"
          :entry="activeEntry"
          :fields="ruleFields"
          :filtered-plugins="filteredRulePlugins"
          :loading="pluginRulesLoading"
          :rule-search-keyword="ruleSearchKeyword"
          :rule-tools="ruleTools"
          :select-options="ruleSelectOptions"
          @refresh-rules="emit('refreshRules')"
          @update:rule-search-keyword="emit('update:ruleSearchKeyword', $event)"
        />
      </div>
    </div>
  </div>
</template>
