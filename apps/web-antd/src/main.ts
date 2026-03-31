import { initPreferences, updatePreferences } from '@vben/preferences';
import { unmountGlobalLoading } from '@vben/utils';

import { footerCopyright, overridesPreferences } from './preferences';

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

  // 强制覆盖版权文案，避免被历史缓存偏好设置覆盖为旧值
  updatePreferences({
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
  });

  // 启动应用并挂载
  // vue应用主要逻辑及视图
  const { bootstrap } = await import('./bootstrap');
  await bootstrap(namespace);

  // 移除并销毁loading
  unmountGlobalLoading();
}

initApplication();
