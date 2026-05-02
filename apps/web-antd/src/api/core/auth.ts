import { baseRequestClient, requestClient } from '#/api/request';

export namespace AuthApi {
  export interface LoginParams {
    code: string;
  }

  export interface PasswordLoginParams {
    password: string;
    remember?: boolean;
  }

  export interface LoginResult {
    token: string;
  }

  export interface PasswordLoginStatus {
    hasPassword: boolean;
    rememberDays: number;
  }

  export interface PermCodeResult {
    liteToken?: string;
    permCode: string[];
  }
}

/**
 * 验证码登录
 */
export async function loginApi(data: AuthApi.LoginParams) {
  return requestClient.post<AuthApi.LoginResult>('/login/code/check', data);
}

/**
 * 固定密码登录状态
 */
export async function passwordLoginStatusApi() {
  return requestClient.get<AuthApi.PasswordLoginStatus>(
    '/login/password/status',
  );
}

/**
 * 固定密码登录
 */
export async function passwordLoginApi(data: AuthApi.PasswordLoginParams) {
  return requestClient.post<AuthApi.LoginResult>(
    '/login/password/check',
    data,
  );
}

/**
 * 请求验证码
 */
export async function loginCodeRequestApi() {
  return baseRequestClient.post('/login/code/request', {});
}

/**
 * 主人快捷登录
 */
export async function quickLoginApi(code: string) {
  return requestClient.post<AuthApi.LoginResult>('/login/quick', { code });
}

/**
 * 刷新accessToken
 */
export async function refreshTokenApi() {
  throw new Error('Guoba does not support refresh-token flow');
}

/**
 * 退出登录
 */
export async function logoutApi() {
  return baseRequestClient.post('/logout', {});
}

/**
 * 获取用户权限码
 */
export async function getAccessCodesApi() {
  const data = await requestClient.get<AuthApi.PermCodeResult>('/getPermCode');
  return data?.permCode ?? [];
}
