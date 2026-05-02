import type { Recordable } from '@vben/types';

export interface GuobaHomeData {
  cookieCount: number;
  friendCount: number;
  groupCount: number;
}

export interface GuobaDashboardAccountItem {
  nickname: string;
  online: boolean;
  platform: string;
  uin: string;
}

export interface GuobaDashboardData {
  accounts: {
    currentNickname: string;
    currentPlatform: string;
    currentUin: string;
    list: GuobaDashboardAccountItem[];
    offlineCount: number;
    onlineCount: number;
    total: number;
  };
  business: {
    cookieCount: number;
    friendCount: number;
    groupCount: number;
  };
  env: {
    botMode: string;
    guobaVersion: string;
    nodeVersion: string;
    runtime: string;
    yunzaiVersion: string;
  };
  platformDistribution: Array<{
    count: number;
    name: string;
  }>;
  redis: {
    available: boolean;
    keyCount: number;
  };
  runtime: {
    cpu: {
      cores: number;
      model: string;
    };
    loadavg: {
      fifteen: number;
      five: number;
      one: number;
    };
    processMemory: {
      external: number;
      externalText: string;
      heapTotal: number;
      heapTotalText: string;
      heapUsagePercent: number;
      heapUsed: number;
      heapUsedText: string;
      rss: number;
      rssText: string;
    };
    processUptime: {
      seconds: number;
      text: string;
    };
    systemMemory: {
      free: number;
      freeText: string;
      total: number;
      totalText: string;
      usagePercent: number;
      used: number;
      usedText: string;
    };
    systemUptime: {
      seconds: number;
      text: string;
    };
  };
}

export interface GuobaPluginSchemaGroup {
  name: string;
  schemas: Recordable<any>[];
  title: string;
}

export interface GuobaPlugin {
  author: string | string[];
  authorLink?: string | string[];
  description: string;
  hasConfig?: boolean;
  icon?: string;
  iconColor?: string;
  iconPath?: string;
  installed: boolean;
  isDeleted?: boolean;
  isV2?: boolean;
  isV3?: boolean;
  link: string;
  name: string;
  schemaGroups?: GuobaPluginSchemaGroup[];
  schemas?: Recordable<any>[];
  showInMenu?: boolean;
  title: string;
}

export type GuobaPlugins = GuobaPlugin[];

export interface GuobaConfigCard {
  addBtnText?: string;
  allowAdd?: boolean;
  allowDel?: boolean;
  desc: string;
  key: string;
  lengthMax?: number;
  lengthMin?: number;
  promptProps?: Recordable<any>;
  schemas?: Recordable<any>[];
  title: string;
  type?: string;
}

export interface GuobaConfigTab {
  cards: GuobaConfigCard[];
  key: string;
  title: string;
}

export interface GuobaInstallResult {
  logs?: string[];
  message: string;
  status: 'error' | 'success';
}
