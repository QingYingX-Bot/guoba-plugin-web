import { requestClient } from '#/api/request';

import type { GuobaPage } from '../core/user';
import type { GuobaDashboardData } from './types';

export type GuobaMessageTargetType = 'group' | 'private';
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

export async function getGuobaTaskApi(id: string) {
  return requestClient.get<GuobaTaskRecord>(`/tasks/${encodeURIComponent(id)}`);
}
