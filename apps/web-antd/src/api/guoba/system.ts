import { requestClient } from '#/api/request';

import type { GuobaDashboardData, GuobaHomeData } from './types';

/**
 * 获取首页统计数据
 */
export async function getHomeDataApi() {
  return requestClient.get<GuobaHomeData>('/home/data');
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
