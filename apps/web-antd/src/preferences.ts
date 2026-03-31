import { defineOverridesPreferences } from '@vben/preferences';

// VITE_APP_VERSION is injected from guoba-plugin-web/package.json at build time.
const appVersion = import.meta.env.VITE_APP_VERSION;
const guobaRepoUrl = 'https://github.com/QingYingX-Bot/guoba-plugin';
const icpSiteLink = 'http://beian.miit.gov.cn/';
const versionLabel = appVersion ? ` V${appVersion}` : '';
const guobaConf = (
  globalThis as {
    __GUOBA_CONF__?: {
      ICP_NO?: unknown;
    };
  }
).__GUOBA_CONF__;
const icpNoRaw = guobaConf?.ICP_NO;
const icpNo = icpNoRaw == null ? '' : String(icpNoRaw).trim();

export const footerCopyright = {
  companyName: `Guoba-plugin Fork${versionLabel}`,
  companySiteLink: guobaRepoUrl,
  date: '2026',
  enable: true,
  icp: icpNo,
  icpLink: icpSiteLink,
  settingShow: true,
};

/**
 * @description 项目配置文件
 * 只需要覆盖项目中的一部分配置，不需要的配置不用覆盖，会自动使用默认配置
 * !!! 更改配置后请清空缓存，否则可能不生效
 */
export const overridesPreferences = defineOverridesPreferences({
  // overrides
  app: {
    accessMode: 'backend',
    defaultHomePath: '/home',
    name: import.meta.env.VITE_APP_TITLE,
  },
  copyright: footerCopyright,
  footer: {
    enable: true,
  },
  widget: {
    timezone: false,
  },
});
