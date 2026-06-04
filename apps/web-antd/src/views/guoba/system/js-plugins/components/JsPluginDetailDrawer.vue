<script lang="ts" setup>
import type {
  GuobaJsPluginDetail,
  GuobaJsPluginRuleInfo,
  GuobaJsPluginTaskInfo,
} from '#/api';
import type { TableColumnsType } from 'ant-design-vue';

import { Descriptions, Drawer, Empty, Input, Table, Tabs, Tag } from 'ant-design-vue';

defineProps<{
  detail?: GuobaJsPluginDetail;
  loading?: boolean;
  open: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const ruleColumns: TableColumnsType<GuobaJsPluginRuleInfo> = [
  { dataIndex: 'reg', key: 'reg', title: '正则', width: 280 },
  { dataIndex: 'fnc', key: 'fnc', title: '方法', width: 160 },
  { dataIndex: 'permission', key: 'permission', title: '权限', width: 110 },
  { dataIndex: 'event', key: 'event', title: '事件', width: 130 },
];

const taskColumns: TableColumnsType<GuobaJsPluginTaskInfo> = [
  { dataIndex: 'name', key: 'name', title: '任务', width: 180 },
  { dataIndex: 'cron', key: 'cron', title: 'Cron', width: 200 },
  { dataIndex: 'fnc', key: 'fnc', title: '方法', width: 160 },
  { key: 'log', title: '日志', width: 90 },
];

function formatSize(size?: number) {
  const value = Number(size || 0);
  if (value >= 1024 * 1024) {
    return `${(value / 1024 / 1024).toFixed(2)} MB`;
  }
  if (value >= 1024) {
    return `${(value / 1024).toFixed(2)} KB`;
  }
  return `${value} B`;
}

function formatTime(value?: string) {
  return value ? value.replace('T', ' ').slice(0, 19) : '-';
}
</script>

<template>
  <Drawer
    :loading="loading"
    :open="open"
    :title="detail?.moduleFile || 'JS插件详情'"
    width="900"
    @close="emit('close')"
  >
    <template v-if="detail">
      <Descriptions bordered :column="2" size="small">
        <Descriptions.Item label="插件目录">
          {{ detail.pluginFolder }}
        </Descriptions.Item>
        <Descriptions.Item label="文件状态">
          <Tag :color="detail.enabled ? 'success' : detail.status === 'template' ? 'blue' : 'default'">
            {{ detail.status }}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="插件名">
          {{ detail.name || '-' }}
        </Descriptions.Item>
        <Descriptions.Item label="事件">
          {{ detail.event || '-' }}
        </Descriptions.Item>
        <Descriptions.Item label="优先级">
          {{ detail.priority ?? '-' }}
        </Descriptions.Item>
        <Descriptions.Item label="大小">
          {{ formatSize(detail.size) }}
        </Descriptions.Item>
        <Descriptions.Item label="修改时间">
          {{ formatTime(detail.modifiedAt) }}
        </Descriptions.Item>
        <Descriptions.Item label="加载状态">
          {{ detail.loaded ? '已加载' : '-' }}
        </Descriptions.Item>
        <Descriptions.Item label="路径" :span="2">
          {{ detail.relativePath }}
        </Descriptions.Item>
      </Descriptions>

      <Tabs class="detail-tabs">
        <Tabs.TabPane key="rules" :tab="`规则 (${detail.rules?.length || 0})`">
          <Table
            v-if="detail.rules?.length"
            :columns="ruleColumns"
            :data-source="detail.rules"
            :pagination="false"
            :scroll="{ x: 680 }"
            row-key="ruleIndex"
            size="small"
          />
          <Empty v-else description="暂无规则" />
        </Tabs.TabPane>
        <Tabs.TabPane key="tasks" :tab="`任务 (${detail.tasks?.length || 0})`">
          <Table
            v-if="detail.tasks?.length"
            :columns="taskColumns"
            :data-source="detail.tasks"
            :pagination="false"
            row-key="taskIndex"
            size="small"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'log'">
                <Tag :color="record.log === false ? 'default' : 'success'">
                  {{ record.log === false ? '关闭' : '开启' }}
                </Tag>
              </template>
            </template>
          </Table>
          <Empty v-else description="暂无任务" />
        </Tabs.TabPane>
        <Tabs.TabPane key="source" tab="源码">
          <Input.TextArea
            :auto-size="{ minRows: 18, maxRows: 28 }"
            :value="detail.content"
            readonly
          />
        </Tabs.TabPane>
      </Tabs>
    </template>
  </Drawer>
</template>

<style scoped>
.detail-tabs {
  margin-top: 16px;
}
</style>
