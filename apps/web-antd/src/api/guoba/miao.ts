import type { Recordable } from '@vben/types';

import { requestClient } from '#/api/request';

export interface SaveMiaoHelpParams {
  helpCfg: string;
  helpList: string;
}

/**
 * 获取喵喵帮助配置（只读）
 */
export async function getMiaoHelpApi<T = Recordable<any>>() {
  return requestClient.get<T>('/plugin/miao/help');
}

/**
 * 保存喵喵帮助配置
 */
export async function saveMiaoHelpApi(data: SaveMiaoHelpParams) {
  return requestClient.post('/plugin/miao/help', data);
}

/**
 * 获取喵喵帮助备份列表
 */
export async function getMiaoHelpBackupsApi<T = Recordable<any>[]>() {
  return requestClient.get<T>('/plugin/miao/help/backup/list');
}
