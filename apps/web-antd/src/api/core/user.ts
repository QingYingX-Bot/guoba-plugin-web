import type { UserInfo } from '@vben/types';

import { requestClient } from '#/api/request';

interface GuobaRoleObject {
  roleName?: string;
  value?: string;
}

type GuobaRole = GuobaRoleObject | string;

type GuobaUserInfo = Omit<UserInfo, 'roles'> & {
  roles?: GuobaRole[];
};

export interface GuobaUserProfile {
  avatar?: string;
  displayName?: string;
}

export interface GuobaPage<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface GuobaAccountMeta {
  defaultAccount?: boolean;
  remark?: string;
  tags?: string[];
}

export interface GuobaUserAccount {
  adapterId?: string;
  adapterName?: string;
  canDisable?: boolean;
  canEnable?: boolean;
  current?: boolean;
  friendCount?: number;
  groupCount?: number;
  homePath?: string;
  index?: number;
  onlineDuration?: string;
  platform?: string;
  realName?: string;
  status?: 'offline' | 'online';
  meta?: GuobaAccountMeta;
  userId: string;
  username?: string;
}

export interface GuobaAccountCapabilities {
  canManageStatus?: boolean;
  canReadContacts?: boolean;
  canReconnect?: boolean;
  canSendGroup?: boolean;
  canSendPrivate?: boolean;
}

export interface GuobaAccountDiagnostics {
  adapterId?: string;
  adapterName?: string;
  exists?: boolean;
  hasLogin?: boolean;
  hasLogout?: boolean;
  hasReconnect?: boolean;
  wsReadyState?: null | number;
}

export type GuobaAccountDetail = GuobaUserAccount & {
  capabilities?: GuobaAccountCapabilities;
  diagnostics?: GuobaAccountDiagnostics;
};

export interface GuobaContactTarget {
  id: string;
  memberCount?: number;
  name: string;
  remark?: string;
}

/**
 * 获取用户信息
 */
export async function getUserInfoApi() {
  const userInfo = await requestClient.get<GuobaUserInfo>('/user/getLoginUser');
  const roles =
    userInfo?.roles
      ?.map((item) => {
        if (typeof item === 'string') {
          return item;
        }
        return item?.value ?? '';
      })
      .filter(Boolean) ?? [];

  return {
    ...userInfo,
    roles,
  } as UserInfo;
}

/**
 * 获取账号列表
 */
export async function getUserListApi() {
  return requestClient.get<GuobaUserAccount[]>('/user/list');
}

export async function getAccountsApi(params?: {
  keyword?: string;
  page?: number;
  pageSize?: number;
}) {
  return requestClient.get<GuobaPage<GuobaUserAccount>>('/accounts', { params });
}

export async function getAccountDetailApi(userId: string) {
  return requestClient.get<GuobaAccountDetail>(
    `/accounts/${encodeURIComponent(userId)}`,
  );
}

export async function getAccountDiagnosticsApi(userId: string) {
  return requestClient.get<GuobaAccountDiagnostics>(
    `/accounts/${encodeURIComponent(userId)}/diagnostics`,
  );
}

export async function getAccountFriendsApi(
  userId: string,
  params?: { keyword?: string; page?: number; pageSize?: number },
) {
  return requestClient.get<GuobaPage<GuobaContactTarget>>(
    `/accounts/${encodeURIComponent(userId)}/friends`,
    { params },
  );
}

export async function getAccountGroupsApi(
  userId: string,
  params?: { keyword?: string; page?: number; pageSize?: number },
) {
  return requestClient.get<GuobaPage<GuobaContactTarget>>(
    `/accounts/${encodeURIComponent(userId)}/groups`,
    { params },
  );
}

export async function updateAccountProfileApi(
  userId: string,
  data: GuobaAccountMeta,
) {
  return requestClient.put<GuobaAccountMeta>(
    `/accounts/${encodeURIComponent(userId)}/profile`,
    data,
  );
}

/**
 * 获取面板资料设置
 */
export async function getUserProfileApi() {
  return requestClient.get<GuobaUserProfile>('/user/profile');
}

/**
 * 保存面板资料设置
 */
export async function updateUserProfileApi(data: GuobaUserProfile) {
  return requestClient.put<GuobaUserProfile>('/user/profile', data);
}

/**
 * 设置账号上下线状态
 */
export async function setUserAccountStatusApi(data: {
  action: 'disable' | 'enable';
  userId: string;
}) {
  return requestClient.put<{ status: string; userId: string }>(
    `/accounts/${encodeURIComponent(data.userId)}/status`,
    { action: data.action },
  );
}
