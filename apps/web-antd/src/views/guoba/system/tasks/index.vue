<script lang="ts" setup>
import { ref } from 'vue';

import { Page } from '@vben/common-ui';

import { Tabs } from 'ant-design-vue';

import BackgroundTaskRecordsPane from './components/BackgroundTaskRecordsPane.vue';
import PluginTaskRecordsPane from './components/PluginTaskRecordsPane.vue';
import PluginTasksPane from './components/PluginTasksPane.vue';

const activeTab = ref('plugin');
</script>

<template>
  <Page title="任务管理">
    <Tabs v-model:activeKey="activeTab">
      <Tabs.TabPane key="plugin" tab="插件任务">
        <PluginTasksPane />
      </Tabs.TabPane>
      <Tabs.TabPane key="plugin-records" tab="任务执行记录">
        <PluginTaskRecordsPane />
      </Tabs.TabPane>
      <Tabs.TabPane key="background-records" tab="后台执行记录">
        <BackgroundTaskRecordsPane />
      </Tabs.TabPane>
    </Tabs>
  </Page>
</template>
