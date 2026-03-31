import type {
  MiaoBackupItem,
  MiaoHelpConfig,
  MiaoHelpGroups,
  MiaoHelpResponse,
  MiaoThemeConfig,
  MiaoThemeItem,
} from './types';

import { requestClient } from '#/api/request';

export enum MiaoApi {
  help = '/plugin/miao/help',
  helpBackup = '/plugin/miao/help/backup',
  helpIcon = '/plugin/miao/help/icon',
  helpThemeAction = '/plugin/miao/help/theme/action',
  helpThemeActionPut = '/plugin/miao/help/theme/action_put',
  helpThemeBase = '/plugin/miao/help/theme',
  helpThemeConfig = '/plugin/miao/help/theme/config',
  helpThemeList = '/plugin/miao/help/theme/list',
}

export async function getMiaoHelpCfg() {
  return requestClient.get<MiaoHelpResponse>(MiaoApi.help);
}

export async function saveMiaoHelpCfg(
  helpCfg: MiaoHelpConfig,
  helpList: MiaoHelpGroups,
  iconB64List: string[],
  mainB64?: null | string,
) {
  const formData = new FormData();
  formData.append('helpCfg', JSON.stringify(helpCfg ?? {}, null, 2));
  formData.append('helpList', JSON.stringify(helpList ?? [], null, 2));
  formData.append('icon', await joinIcon(iconB64List ?? []));
  if (mainB64) {
    formData.append('main', await dataUrlToBlob(mainB64));
  }
  return requestClient.post(MiaoApi.help, formData, {
    timeout: -1,
  });
}

export async function getHelpIconList(base64?: string) {
  let sprite = base64;
  if (!sprite) {
    const blob = await requestClient.download<Blob>(MiaoApi.helpIcon, {
      timeout: -1,
    });
    sprite = await blobToDataUrl(blob);
  }

  const img = new Image();
  img.src = sprite;
  await waitOnload(img);
  return splitIcon(img);
}

export async function getBackupList() {
  return requestClient.get<MiaoBackupItem[]>(`${MiaoApi.helpBackup}/list`);
}

export async function addBackup(remark: string) {
  return requestClient.post(MiaoApi.helpBackup, { remark });
}

export async function restoreBackup(id: string) {
  return requestClient.post(`${MiaoApi.helpBackup}/restore`, { id });
}

export async function deleteBackup(id: string) {
  return requestClient.delete(`${MiaoApi.helpBackup}/delete`, {
    data: { id },
  });
}

export async function getThemeList() {
  return requestClient.get<MiaoThemeItem[]>(MiaoApi.helpThemeList);
}

export async function getThemeConfig(themeName: string) {
  const config = await requestClient.get<Partial<MiaoThemeConfig>>(MiaoApi.helpThemeConfig, {
    params: {
      themeName: themeName || 'default',
    },
  });

  return {
    ...config,
    descShadow: config?.descShadow ?? 'none',
    fontShadow: config?.fontShadow ?? 'none',
  } as MiaoThemeConfig;
}

export async function saveThemeConfig(
  themeName: string,
  config: Partial<MiaoThemeConfig>,
) {
  return requestClient.post(MiaoApi.helpThemeConfig, {
    config,
    themeName,
  });
}

export async function addThemeItem(themeName: string, mainPic: File) {
  return requestClient.upload(MiaoApi.helpThemeAction, {
    file: mainPic,
    mainPic,
    themeName,
  }, {
    timeout: -1,
  });
}

export async function putThemeItem(themeName: string, mainPic: File) {
  return requestClient.upload(MiaoApi.helpThemeActionPut, {
    file: mainPic,
    mainPic,
    themeName,
  }, {
    timeout: -1,
  });
}

export async function deleteThemeItem(themeName: string) {
  return requestClient.delete(MiaoApi.helpThemeAction, {
    data: { themeName },
    timeout: -1,
  });
}

export function getThemeAssetUrl(
  type: 'bg' | 'main',
  options: {
    cacheVer?: number;
    themeName?: string;
    token?: string;
  } = {},
) {
  const apiBase = String(requestClient.getBaseUrl?.() ?? '/api').replace(/\/+$/, '');
  const params = new URLSearchParams();

  if (options.themeName) {
    params.set('themeName', options.themeName);
  }
  if (options.token) {
    params.set('token', options.token);
  }
  params.set('_v', String(options.cacheVer ?? Date.now()));

  return `${apiBase}${MiaoApi.helpThemeBase}/${type}?${params.toString()}`;
}

async function blobToDataUrl(blob: Blob) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(String(reader.result ?? ''));
    };
    reader.onerror = () => {
      reject(new Error('读取图片失败'));
    };
    reader.readAsDataURL(blob);
  });
}

async function dataUrlToBlob(dataUrl: string) {
  const response = await fetch(dataUrl);
  return await response.blob();
}

function splitIcon(img: HTMLImageElement) {
  return new Promise<string[]>((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      resolve([]);
      return;
    }

    const rows = Math.max(1, Math.round(img.height / 100));
    const count = rows * 10;
    const iconList: string[] = [];

    for (let i = 0; i < count; i += 1) {
      const x = i % 10;
      const y = Math.floor(i / 10);
      ctx.drawImage(img, 100 * x, 100 * y, 100, 100, 0, 0, 100, 100);
      iconList[i + 1] = canvas.toDataURL();
      ctx.clearRect(0, 0, 100, 100);
    }

    resolve(iconList);
  });
}

async function joinIcon(iconB64List: string[]) {
  const canvas = document.createElement('canvas');
  canvas.width = 1000;

  const maxIndex = Math.max(1, (iconB64List?.length ?? 1) - 1);
  const rows = Math.max(1, Math.ceil(maxIndex / 10));
  canvas.height = rows * 100;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('无法处理图标画布');
  }

  for (let index = 1; index <= maxIndex; index += 1) {
    const base64 = iconB64List[index];
    if (!base64) {
      continue;
    }

    const image = new Image();
    image.src = base64;
    await waitOnload(image);

    const x = (index - 1) % 10;
    const y = Math.floor((index - 1) / 10);
    ctx.drawImage(image, 100 * x, 100 * y, 100, 100);
  }

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('图标合成失败'));
        return;
      }
      resolve(blob);
    });
  });
}

async function waitOnload(img: HTMLImageElement) {
  return await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('图片加载失败'));
  });
}
