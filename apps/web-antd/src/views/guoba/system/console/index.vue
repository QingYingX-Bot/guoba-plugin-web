<script lang="ts" setup>
import type { GuobaConsoleStreamEvent, GuobaConsoleStreamHello } from '#/api';

import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue';

import { Page } from '@vben/common-ui';
import { useAppConfig } from '@vben/hooks';
import { IconifyIcon } from '@vben/icons';
import { useAccessStore } from '@vben/stores';

import { Button, Card, Space, Tag, Tooltip, Typography, message } from 'ant-design-vue';

import ConsoleLogPanel from './components/ConsoleLogPanel.vue';

const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD);
const accessStore = useAccessStore();
const eventSource = shallowRef<EventSource>();
const events = ref<GuobaConsoleStreamEvent[]>([]);
const status = ref<'closed' | 'connecting' | 'open'>('closed');
const autoScroll = ref(true);
const panelRef = ref<HTMLElement>();

const connected = computed(() => status.value === 'open');
const metaText = computed(() => {
  return connected.value ? `实时连接中 | ${events.value.length} 行` : `连接状态：${status.value}`;
});

function createStreamUrl() {
  const url = new URL(`${apiURL}/console/stream`, window.location.origin);
  url.searchParams.set('token', String(accessStore.accessToken || ''));
  return url.toString();
}

function parseEventData<T>(event: Event) {
  try {
    return JSON.parse((event as MessageEvent).data) as T;
  } catch {
    return null;
  }
}

function appendEvent(item: GuobaConsoleStreamEvent) {
  events.value.push(item);
  if (events.value.length > 1000) {
    events.value.splice(0, events.value.length - 1000);
  }
  scrollToBottom();
}

function scrollToBottom() {
  if (!autoScroll.value) {
    return;
  }
  nextTick(() => {
    const panel = panelRef.value?.querySelector('.console-panel');
    if (panel) {
      panel.scrollTop = panel.scrollHeight;
    }
  });
}

function connect() {
  disconnect(false);
  status.value = 'connecting';
  const source = new EventSource(createStreamUrl());
  eventSource.value = source;
  source.onopen = () => {
    status.value = 'open';
  };
  source.onerror = () => {
    status.value = source.readyState === EventSource.CLOSED ? 'closed' : 'connecting';
  };
  source.addEventListener('hello', (event) => {
    const data = parseEventData<GuobaConsoleStreamHello>(event);
    if (!data) {
      return;
    }
    events.value = data.replay ?? [];
    scrollToBottom();
  });
  source.addEventListener('console', (event) => {
    const data = parseEventData<GuobaConsoleStreamEvent>(event);
    if (!data) {
      return;
    }
    appendEvent(data);
  });
}

function disconnect(showMessage = true) {
  eventSource.value?.close();
  eventSource.value = undefined;
  status.value = 'closed';
  if (showMessage) {
    message.info('实时控制台已断开');
  }
}

function clearConsole() {
  events.value = [];
}

onMounted(() => {
  connect();
});

onBeforeUnmount(() => {
  disconnect(false);
});
</script>

<template>
  <Page title="控制台">
    <Card>
      <template #title>
        <Space>
          <span>实时控制台</span>
          <Tag :color="connected ? 'green' : 'orange'">
            {{ connected ? '已连接' : status === 'connecting' ? '连接中' : '已断开' }}
          </Tag>
        </Space>
      </template>
      <template #extra>
        <Space wrap>
          <Tooltip :title="autoScroll ? '关闭自动滚动' : '开启自动滚动'">
            <Button @click="autoScroll = !autoScroll">
              <IconifyIcon :icon="autoScroll ? 'lucide:scroll-text' : 'lucide:pause'" />
            </Button>
          </Tooltip>
          <Button @click="clearConsole">清屏</Button>
          <Button v-if="connected" danger @click="disconnect()">断开</Button>
          <Button v-else type="primary" @click="connect">连接</Button>
        </Space>
      </template>
      <Typography.Text class="console-meta" type="secondary">
        {{ metaText }}
      </Typography.Text>
      <div ref="panelRef">
        <ConsoleLogPanel :items="events" />
      </div>
    </Card>
  </Page>
</template>

<style scoped>
.console-meta {
  display: block;
  margin-bottom: 10px;
  word-break: break-all;
}
</style>
