<script setup lang="ts">
import type { GuobaConfigCard } from '#/api/guoba';
import type { TableColumnsType } from 'ant-design-vue';

import type { GroupRuleField, GroupRulePlugin, GroupRuleTools, GroupSelectOption, KeyFormEntry } from '../types';

import { IconifyIcon } from '@vben/icons';

import { Button, Form, Input, Select, Space, Table, Tag, Tooltip } from 'ant-design-vue';

const props = defineProps<{
  card: GuobaConfigCard;
  entry: KeyFormEntry;
  fields: readonly GroupRuleField[];
  filteredPlugins: GroupRulePlugin[];
  loading: boolean;
  ruleSearchKeyword: string;
  ruleTools: GroupRuleTools;
  selectOptions: GroupSelectOption[];
}>();

const emit = defineEmits<{
  refreshRules: [];
  'update:ruleSearchKeyword': [value: string];
}>();

const pluginColumns: TableColumnsType<GroupRulePlugin> = [
  { key: 'plugin', title: '插件', width: 260 },
  { key: 'rules', title: '规则', width: 120 },
  { key: 'active', title: '当前命中', width: 150 },
  { key: 'actions', title: '操作', width: 300 },
];
function getFieldTone(field: GroupRuleField) {
  return field === 'enable' ? 'green' : 'red';
}

function toPlugin(record: unknown) {
  return record as GroupRulePlugin;
}

function getPluginActiveCount(field: GroupRuleField, plugin: unknown) {
  return props.ruleTools.getPluginActiveCount(props.entry, field, toPlugin(plugin));
}

function isPluginFullyActive(field: GroupRuleField, plugin: unknown) {
  return props.ruleTools.isPluginFullyActive(props.entry, field, toPlugin(plugin));
}

function addPluginToField(field: GroupRuleField, plugin: unknown) {
  props.ruleTools.addPluginToField(props.entry, field, toPlugin(plugin));
}

function removePluginFromField(field: GroupRuleField, plugin: unknown) {
  props.ruleTools.removePluginFromField(props.entry, field, toPlugin(plugin));
}

function getPluginActionText(field: GroupRuleField, plugin: unknown) {
  return props.ruleTools.getPluginActionText(props.entry, field, toPlugin(plugin));
}
</script>

<template>
  <div class="group-rules-panel">
    <div class="group-rule-editor-grid">
      <section v-for="field in fields" :key="field" class="group-rule-field-panel">
        <div class="group-rule-field-head">
          <div>
            <strong>{{ ruleTools.getFieldMeta(card, field).label }}</strong>
            <small>{{ ruleTools.getFieldMeta(card, field).help }}</small>
          </div>
          <Tag :color="getFieldTone(field)">
            {{ ruleTools.getFieldValue(entry, field).length }}
          </Tag>
        </div>

        <Form class="group-rule-form" layout="vertical">
          <Form.Item>
            <Select
              allow-clear
              class="group-rule-select"
              mode="tags"
              placeholder="输入功能名后回车"
              show-search
              :loading="loading"
              :options="selectOptions"
              :value="ruleTools.getFieldValue(entry, field)"
              @update:value="ruleTools.setFieldValues(entry, field, $event)"
            />
          </Form.Item>
        </Form>
      </section>
    </div>

    <section class="group-rule-library-panel">
      <div class="group-rule-library-toolbar">
        <Input
          :value="ruleSearchKeyword"
          allow-clear
          placeholder="搜索插件、功能名"
          @update:value="emit('update:ruleSearchKeyword', String($event ?? ''))"
        />
        <Tooltip title="刷新规则库">
          <Button aria-label="刷新规则库" :loading="loading" size="small" @click="emit('refreshRules')">
            <IconifyIcon icon="lucide:refresh-cw" />
          </Button>
        </Tooltip>
        <Tag>{{ filteredPlugins.length }} 个插件</Tag>
      </div>

      <Table
        class="group-rule-table"
        :columns="pluginColumns"
        :data-source="filteredPlugins"
        :loading="loading"
        :locale="{ emptyText: '暂无可用功能规则' }"
        :pagination="false"
        row-key="key"
        :scroll="{ x: 860 }"
        size="small"
      >
        <template #bodyCell="{ column, record: plugin }">
          <template v-if="column.key === 'plugin'">
            <div class="group-rule-plugin-cell">
              <strong>{{ plugin.name }}</strong>
              <span>{{ plugin.description || plugin.key }}</span>
            </div>
          </template>

          <template v-else-if="column.key === 'rules'">
            <Space :size="4" wrap>
              <Tag>{{ plugin.ruleCount }} 功能</Tag>
              <Tag>{{ plugin.moduleCount }} 文件</Tag>
            </Space>
          </template>

          <template v-else-if="column.key === 'active'">
            <Space :size="4" wrap>
              <Tag v-if="getPluginActiveCount('enable', plugin) > 0" color="green">
                白 {{ getPluginActiveCount('enable', plugin) }}
              </Tag>
              <Tag v-if="getPluginActiveCount('disable', plugin) > 0" color="red">
                黑 {{ getPluginActiveCount('disable', plugin) }}
              </Tag>
              <span
                v-if="getPluginActiveCount('enable', plugin) === 0
                  && getPluginActiveCount('disable', plugin) === 0"
                class="group-rule-empty-text"
              >
                -
              </span>
            </Space>
          </template>

          <template v-else-if="column.key === 'actions'">
            <Space :size="6" wrap>
              <Button v-if="!isPluginFullyActive('enable', plugin)" class="group-rule-action" size="small" @click="addPluginToField('enable', plugin)">
                {{ getPluginActionText('enable', plugin) }}
              </Button>
              <Button v-else class="group-rule-action" size="small" @click="removePluginFromField('enable', plugin)">
                {{ ruleTools.getPluginRemoveText('enable') }}
              </Button>
              <Button v-if="!isPluginFullyActive('disable', plugin)" class="group-rule-action" danger size="small" @click="addPluginToField('disable', plugin)">
                {{ getPluginActionText('disable', plugin) }}
              </Button>
              <Button v-else class="group-rule-action" danger size="small" @click="removePluginFromField('disable', plugin)">
                {{ ruleTools.getPluginRemoveText('disable') }}
              </Button>
            </Space>
          </template>
        </template>
      </Table>
    </section>
  </div>
</template>
