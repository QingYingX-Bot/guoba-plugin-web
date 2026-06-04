import { requestClient } from '#/api/request';

import type { GuobaPage } from '../core/user';

export type GuobaJsPluginStatus = 'disabled' | 'enabled' | 'template';

export interface GuobaJsPluginClassInfo {
  extendsName: string;
  name: string;
}

export interface GuobaJsPluginRuleInfo {
  event: string;
  fnc: string;
  log: boolean | null;
  name: string;
  permission: string;
  reg: string;
  ruleIndex: number;
}

export interface GuobaJsPluginTaskInfo {
  cron: string;
  fnc: string;
  log: boolean | null;
  name: string;
  taskIndex: number;
}

export interface GuobaJsPluginFile {
  classCount?: number;
  classes?: GuobaJsPluginClassInfo[];
  dsc?: string;
  enabled: boolean;
  event?: string;
  extension: string;
  loaded: boolean;
  loaderKey: string;
  modifiedAt: string;
  moduleFile: string;
  name: string;
  path: string;
  pluginFolder: string;
  priority?: null | number;
  relativePath: string;
  ruleCount?: number;
  rules?: GuobaJsPluginRuleInfo[];
  size: number;
  sourceKey: string;
  status: GuobaJsPluginStatus;
  taskCount?: number;
  tasks?: GuobaJsPluginTaskInfo[];
}

export interface GuobaJsPluginDetail extends GuobaJsPluginFile {
  content: string;
}

export interface GuobaJsPluginReloadResult {
  loaderKey: string;
  path: string;
  reloadedAt: string;
}

export async function getGuobaJsPluginsApi(params?: {
  keyword?: string;
  page?: number;
  pageSize?: number;
  status?: GuobaJsPluginStatus | '';
}) {
  return requestClient.get<GuobaPage<GuobaJsPluginFile>>('/js-plugins/list', {
    params,
  });
}

export async function getGuobaJsPluginDetailApi(path: string) {
  return requestClient.get<GuobaJsPluginDetail>('/js-plugins/detail', {
    params: { path },
  });
}

export async function toggleGuobaJsPluginApi(data: {
  enabled: boolean;
  path: string;
}) {
  return requestClient.post<GuobaJsPluginFile>('/js-plugins/toggle', data);
}

export async function copyGuobaJsPluginExampleApi(data: {
  path: string;
  targetName?: string;
}) {
  return requestClient.post<GuobaJsPluginFile>('/js-plugins/copy-example', data);
}

export async function reloadGuobaJsPluginApi(path: string) {
  return requestClient.post<GuobaJsPluginReloadResult>('/js-plugins/reload', {
    path,
  });
}
