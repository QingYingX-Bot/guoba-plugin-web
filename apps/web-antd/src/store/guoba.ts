import { ref } from 'vue';

import { defineStore } from 'pinia';

import { getPluginsApi } from '#/api';
import type { GuobaPlugins } from '#/api/guoba';

export const useGuobaStore = defineStore('guoba', () => {
  const plugins = ref<GuobaPlugins | null>(null);

  async function getPlugins(force = false): Promise<GuobaPlugins> {
    if (force || plugins.value === null) {
      plugins.value = await getPluginsApi(force);
    }
    return plugins.value ?? [];
  }

  function setPlugins(data: GuobaPlugins) {
    plugins.value = data;
  }

  function clearPlugins() {
    plugins.value = null;
  }

  return {
    clearPlugins,
    getPlugins,
    plugins,
    setPlugins,
  };
});
