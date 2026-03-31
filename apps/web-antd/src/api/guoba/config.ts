import type { Recordable } from '@vben/types';

import { requestClient } from '#/api/request';

import type { GuobaConfigTab } from './types';

/**
 * 获取配置页 tabs
 */
export async function getConfigTabsApi() {
  return requestClient.get<GuobaConfigTab[]>('/config/tabs');
}

/**
 * 获取某个配置 key 的数据
 */
export async function getConfigDataApi<T = Recordable<any>>(key: string) {
  return requestClient.get<T>('/config/data', {
    params: { key },
  });
}

/**
 * 保存某个配置 key 的数据
 */
export async function saveConfigDataApi(key: string, data: Recordable<any>) {
  return requestClient.post('/config/data', { data, key });
}

/**
 * 删除 keyFormCard 的一项
 */
export async function removeConfigCardItemApi(formKey: string, cardKey: string) {
  return requestClient.delete('/config/card-Form', {
    data: { cardKey, formKey },
  });
}
