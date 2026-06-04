import { requestClient } from '#/api/request';

import type { GuobaPage } from '../core/user';
import type { GuobaDashboardData } from './types';

export type GuobaMessageTargetType = 'group' | 'private';
export type GuobaConsoleLogType = 'command' | 'error';
export type GuobaPluginTaskLogStatus = 'running' | 'success' | 'unknown';
export type GuobaPluginTaskStatus = 'inactive' | 'scheduled';
export type GuobaTaskStatus = 'failed' | 'pending' | 'running' | 'success';

export interface GuobaMessageSendRequest {
  accountId: string;
  content: string;
  dryRun?: boolean;
  targetId: string;
  targetType: GuobaMessageTargetType;
}

export interface GuobaMessageSendResult {
  accountId: string;
  error?: string;
  messageId?: string;
  status: 'failed' | 'success';
  targetId: string;
  targetType: GuobaMessageTargetType;
  taskId: string;
}

export interface GuobaTaskRecord {
  accountId?: string;
  createdAt: string;
  duration?: number;
  error?: string;
  finishedAt?: string;
  id: string;
  result?: null | Record<string, unknown>;
  startedAt?: string;
  status: GuobaTaskStatus;
  summary?: string;
  targetId?: string;
  targetType?: string;
  title: string;
  type: string;
  updatedAt: string;
}

export interface GuobaPluginTaskRecord {
  cron: string;
  functionName: string;
  id: string;
  log: boolean;
  nextRunAt: string;
  pluginDescription: string;
  pluginId: string;
  pluginName: string;
  status: GuobaPluginTaskStatus;
  taskName: string;
}

export interface GuobaPluginTaskLogRecord {
  cost: string;
  createdAt: string;
  cron: string;
  id: string;
  pluginId: string;
  status: GuobaPluginTaskLogStatus;
  statusText: string;
  taskName: string;
}

export interface GuobaFileLocation {
  name: string;
  path: string;
  relativePath: string;
}

export interface GuobaFileRoot {
  key: string;
  path: string;
  title: string;
}

export interface GuobaFileEntry {
  editable: boolean;
  extension: string;
  isDirectory: boolean;
  isFile: boolean;
  modifiedAt: string;
  name: string;
  path: string;
  relativePath: string;
  size: number;
  type: 'directory' | 'file';
}

export interface GuobaFileListResult {
  current: GuobaFileLocation;
  items: GuobaFileEntry[];
  parent?: '' | GuobaFileLocation;
  roots: GuobaFileRoot[];
}

export type GuobaFileReadResult = GuobaFileEntry & {
  content: string;
  encoding: 'utf8';
};

export interface GuobaConsoleLogItem {
  content: string;
  id: string;
  level: string;
  lineNo: number;
  raw: string;
  time: string;
}

export interface GuobaConsoleLogResult {
  date: string;
  dates: string[];
  exists: boolean;
  file: string;
  items: GuobaConsoleLogItem[];
  limit: number;
  total: number;
  truncated: boolean;
  type: GuobaConsoleLogType;
  updatedAt: string;
}

/**
 * 获取仪表盘聚合数据
 */
export async function getDashboardDataApi() {
  return requestClient.get<GuobaDashboardData>('/home/dashboard');
}

/**
 * 重启锅巴服务
 */
export async function restartGuobaApi() {
  return requestClient.post('/sys/restart-guoba', {});
}

/**
 * 重启 Bot
 */
export async function restartBotApi() {
  return requestClient.post('/bot/restart', {});
}

export async function getGuobaConsoleLogsApi(params?: {
  date?: string;
  keyword?: string;
  limit?: number;
  type?: GuobaConsoleLogType;
}) {
  return requestClient.get<GuobaConsoleLogResult>('/console/logs', { params });
}

export async function sendGuobaMessageApi(data: GuobaMessageSendRequest) {
  return requestClient.post<GuobaMessageSendResult>('/messages/send', data);
}

export async function getGuobaTasksApi(params?: {
  keyword?: string;
  page?: number;
  pageSize?: number;
  status?: string;
  type?: string;
}) {
  return requestClient.get<GuobaPage<GuobaTaskRecord>>('/tasks', { params });
}

export async function getGuobaPluginTasksApi(params?: {
  keyword?: string;
  page?: number;
  pageSize?: number;
  status?: GuobaPluginTaskStatus | '';
}) {
  return requestClient.get<GuobaPage<GuobaPluginTaskRecord>>('/tasks/plugin', { params });
}

export async function getGuobaPluginTaskRecordsApi(params?: {
  keyword?: string;
  page?: number;
  pageSize?: number;
  status?: GuobaPluginTaskLogStatus | '';
}) {
  return requestClient.get<GuobaPage<GuobaPluginTaskLogRecord>>(
    '/tasks/plugin/records',
    { params },
  );
}

export async function getGuobaTaskApi(id: string) {
  return requestClient.get<GuobaTaskRecord>(`/tasks/${encodeURIComponent(id)}`);
}

export async function getGuobaFileRootsApi() {
  return requestClient.get<GuobaFileRoot[]>('/files/roots');
}

export async function getGuobaFileListApi(params?: { path?: string }) {
  return requestClient.get<GuobaFileListResult>('/files/list', { params });
}

export async function readGuobaFileApi(path: string) {
  return requestClient.get<GuobaFileReadResult>('/files/read', {
    params: { path },
  });
}

export async function writeGuobaFileApi(data: { content: string; path: string }) {
  return requestClient.put<GuobaFileEntry>('/files/write', data);
}

export async function createGuobaDirectoryApi(data: { name: string; path: string }) {
  return requestClient.post<GuobaFileEntry>('/files/mkdir', data);
}

export async function renameGuobaFileApi(data: { name: string; path: string }) {
  return requestClient.post<GuobaFileEntry>('/files/rename', data);
}

export async function deleteGuobaFileApi(path: string) {
  return requestClient.delete<{ path: string }>('/files/delete', {
    data: { path },
  });
}
