import { initPreferences, updatePreferences } from '@vben/preferences';
import { unmountGlobalLoading } from '@vben/utils';

import { appLogo, footerCopyright, overridesPreferences } from './preferences';

/**
 * 应用初始化完成之后再进行页面加载渲染
 */
async function initApplication() {
  // name用于指定项目唯一标识
  // 用于区分不同项目的偏好设置以及存储数据的key前缀以及其他一些需要隔离的数据
  const env = import.meta.env.PROD ? 'prod' : 'dev';
  const appVersion = import.meta.env.VITE_APP_VERSION;
  const namespace = `${import.meta.env.VITE_APP_NAMESPACE}-${appVersion}-${env}`;

  // app偏好设置初始化
  await initPreferences({
    namespace,
    overrides: overridesPreferences,
  });

  const appName = import.meta.env.VITE_APP_TITLE;

  // 强制覆盖品牌与版权文案，避免被历史缓存偏好设置覆盖为旧值
  updatePreferences({
    app: {
      authPageLayout: 'panel-left',
      name: appName,
    },
    copyright: {
      companyName: footerCopyright.companyName,
      companySiteLink: footerCopyright.companySiteLink,
      date: footerCopyright.date,
      enable: footerCopyright.enable,
      // Always overwrite cached icp, including empty string.
      // This keeps footer ICP strictly consistent with server config.
      icp: footerCopyright.icp,
      icpLink: footerCopyright.icpLink,
      settingShow: footerCopyright.settingShow,
    },
    logo: {
      source: appLogo,
      sourceDark: appLogo,
    },
    theme: {
      mode: 'light',
    },
  });

  // 启动应用并挂载
  // vue应用主要逻辑及视图
  const { bootstrap } = await import('./bootstrap');
  await bootstrap(namespace);

  // 从后端加载已保存的 UI 偏好设置（需要在登录之后，否则没有 token）
  try {
    const { getUiPreferencesApi } = await import('#/api/guoba/preferences');
    const saved = await getUiPreferencesApi();
    if (saved && typeof saved === 'object' && Object.keys(saved).length > 0) {
      updatePreferences(saved);
    }
  } catch {
    // 首次访问或未登录时忽略
  }

  // 移除并销毁loading
  unmountGlobalLoading();
}

initApplication();
