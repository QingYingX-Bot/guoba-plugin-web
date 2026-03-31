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
  userId: string;
  username?: string;
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

/**
 * 设置账号上下线状态
 */
export async function setUserAccountStatusApi(data: {
  action: 'disable' | 'enable';
  userId: string;
}) {
  return requestClient.put<boolean>('/user/account/status', data);
}
