import type { Recordable } from '@vben/types';

import { requestClient } from '#/api/request';

import type { GuobaInstallResult, GuobaPlugins } from './types';

/**
 * 获取插件列表
 */
export async function getPluginsApi(force = false) {
  return requestClient.get<GuobaPlugins>('/plugin/list', {
    params: { force },
  });
}

/**
 * 获取插件 README
 */
export async function getPluginReadmeApi(link: string, force = false) {
  return requestClient.get<string>('/plugin/readme', {
    params: { force, link },
  });
}

/**
 * 安装插件
 */
export async function installPluginApi(
  link: string,
  options?: {
    autoNpmInstall?: boolean;
    autoRestart?: boolean;
  },
) {
  return requestClient.put<GuobaInstallResult>('/plugin/install', {
    link,
    ...options,
  });
}

/**
 * 卸载插件
 */
export async function uninstallPluginApi(name: string) {
  return requestClient.put<GuobaInstallResult>('/plugin/uninstall', { name });
}

/**
 * 获取插件配置
 */
export async function getPluginConfigApi<T = Recordable<any>>(pluginName: string) {
  return requestClient.get<T>(
    `/plugin/s/${encodeURIComponent(pluginName)}/config`,
  );
}

/**
 * 保存插件配置
 */
export async function savePluginConfigApi(
  pluginName: string,
  data: Recordable<any>,
) {
  return requestClient.put(`/plugin/s/${encodeURIComponent(pluginName)}/config`, data);
}

/**
 * 执行插件 action
 */
export async function doPluginActionApi(
  pluginName: string,
  action: string,
  args?: Recordable<any>,
) {
  return requestClient.post(`/plugin/do/${encodeURIComponent(pluginName)}/action`, {
    action,
    args: args ?? {},
  });
}
