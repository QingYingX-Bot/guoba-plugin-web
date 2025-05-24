<template>
  <span>
    <a-button
      :type="btn.type"
      :preIcon="btn.icon"
      :loading="loading"
      :size="btn.size"
      :block="btn.block"
      :danger="btn.danger"
      :shape="btn.shape"
      :ghost="btn.ghost"
      :disabled="btn.disabled"
      class="button-item"
      @click="onClick"
    >
      {{ btn.label }}
    </a-button>
  </span>
</template>

<script lang="ts" setup>
  import type { Plugin } from '/#/guoba';
  import type { FormActionType } from '/@/components/Form';
  import { ref, inject } from 'vue';
  import { useMessage } from '/@/hooks/web/useMessage';
  import { get } from 'lodash-es';
  import { defHttp } from '/@/utils/http/axios';

  const props = defineProps({
    btn: {
      type: Object as PropType<Recordable>,
      required: true,
    },
  });

  const formActions = inject<FormActionType>('formActions');
  const pluginInfo = inject<Plugin>('pluginInfo');

  const loading = ref(false);

  const { createMessage: $message, createConfirmSync } = useMessage();

  async function onClick() {
    const { btn } = props;
    if (!btn.action) {
      $message.warn('按钮缺少 action 参数');
      return;
    }
    let flag = true;
    if (btn.confirm) {
      flag = (await createConfirmSync(btn.confirm)) as boolean;
    }
    if (!flag) {
      return;
    }
    // 解析：args
    const args: any[] = [];
    if (Array.isArray(btn.args)) {
      const values = formActions?.getFieldsValue() as Recordable;
      for (const arg of btn.args) {
        if (typeof arg === 'string') {
          // 替换所有 #{xxx} 格式的字符串
          let result = arg;
          const matches = arg.matchAll(/#{([^}]+)}/g);
          for (const match of matches) {
            const key = match[1];
            const value = get(values, key);
            result = result.replace(match[0], value?.toString() ?? '');
          }
          args.push(result);
        } else {
          args.push(arg);
        }
      }
    }
    try {
      loading.value = true;
      let result = await defHttp.post(
        {
          url: `/plugin/do/${pluginInfo?.name}/action`,
          params: {
            action: btn.action,
            args,
          },
        },
        { isTransformResponse: false },
      );
      if (result.ok) {
        $message.success(result.message);
      } else {
        $message.error(result.message);
      }
    } catch (e) {
      console.error(e);
      $message.error('操作失败，请查看前端控制台');
    } finally {
      loading.value = false;
    }
  }
</script>

<style lang="less"></style>
