import { requestClient } from '#/api/request';

/**
 * 获取已保存的 UI 偏好设置
 */
export async function getUiPreferencesApi<T = Record<string, any>>() {
  return requestClient.get<T>('/preferences/ui');
}

/**
 * 保存 UI 偏好设置
 */
export async function saveUiPreferencesApi(data: Record<string, any>) {
  return requestClient.post('/preferences/ui', data);
}
