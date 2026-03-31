import type {
  ComponentRecordType,
  GenerateMenuAndRoutesOptions,
  RouteRecordStringComponent,
} from '@vben/types';

import { generateAccessible } from '@vben/access';
import { preferences } from '@vben/preferences';

import { message } from 'ant-design-vue';

import { getAllMenusApi } from '#/api';
import { BasicLayout, IFrameView } from '#/layouts';
import { $t } from '#/locales';

const forbiddenComponent = () => import('#/views/_core/fallback/forbidden.vue');

function normalizeGuobaMenus(
  routes: RouteRecordStringComponent[],
): RouteRecordStringComponent[] {
  return routes.map((route) => {
    const rawRoute = route as Record<string, any>;
    const meta = (route.meta ?? {}) as Record<string, any>;
    const routeGuobaMeta = rawRoute?.guobaMeta;
    const metaGuobaMeta = meta?.guobaMeta;
    const mergedGuobaMeta = metaGuobaMeta ?? routeGuobaMeta;
    const pluginIconPath = mergedGuobaMeta?.plugin?.iconPath;
    const normalizedMeta = {
      ...meta,
      ...(mergedGuobaMeta ? { guobaMeta: mergedGuobaMeta } : {}),
      title: meta.title ?? String(route.name ?? route.path),
      hideInMenu: meta.hideInMenu !== undefined ? meta.hideInMenu : meta.hideMenu,
      order: meta.order !== undefined ? meta.order : meta.orderNo,
      icon:
        typeof pluginIconPath === 'string' && pluginIconPath.trim()
          ? pluginIconPath
          : meta.icon,
    };

    const normalizedRoute: RouteRecordStringComponent = {
      ...route,
      meta: normalizedMeta as any,
    };

    if (normalizedRoute.component === 'LAYOUT') {
      normalizedRoute.component = 'BasicLayout';
    }

    if (Array.isArray(route.children) && route.children.length > 0) {
      normalizedRoute.children = normalizeGuobaMenus(route.children);
    }

    return normalizedRoute;
  });
}

async function generateAccess(options: GenerateMenuAndRoutesOptions) {
  const pageMap: ComponentRecordType = import.meta.glob('../views/**/*.vue');

  const layoutMap: ComponentRecordType = {
    BasicLayout,
    IFrameView,
  };

  return await generateAccessible(preferences.app.accessMode, {
    ...options,
    fetchMenuListAsync: async () => {
      message.loading({
        content: `${$t('common.loadingMenu')}...`,
        duration: 1.5,
      });
      const menus = await getAllMenusApi();
      return normalizeGuobaMenus(menus);
    },
    // 可以指定没有权限跳转403页面
    forbiddenComponent,
    // 如果 route.meta.menuVisibleWithForbidden = true
    layoutMap,
    pageMap,
  });
}

export { generateAccess };
