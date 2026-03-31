# Guoba-Plugin-Web 项目梳理（实战版）

这份文档面向当前仓库的实际开发场景，重点是：你平时改哪里、怎么构建、怎么发布到 `server/static`。

## 1. 当前项目定位

- 仓库类型：`pnpm workspace` + `turbo` 的 monorepo。
- 前端主力应用：`apps/web-antd`（你当前 Guoba 页面主要在这里改）。
- 发布目标：构建后同步到上级插件目录的 `server/static`。

## 2. 目录速览（只列常用）

- `apps/web-antd`
  - 主 Web 管理端（你现在在改的页面都在这里）
- `packages/*`
  - 通用基础库（UI、hooks、utils、types 等）
- `internal/*`
  - 工程化配置（eslint、tailwind、vite、tsconfig）
- `scripts/sync-v5-dist.mjs`
  - 将 `apps/web-antd/dist` 同步到 `../server/static`
- `PROJECT_MAP.zh-CN.md`
  - 当前仓库的业务入口和构建发布说明

## 3. 你最常改的业务入口

### 页面

- `apps/web-antd/src/views/guoba/home/index.vue` 首页
- `apps/web-antd/src/views/guoba/config/index.vue` 配置
- `apps/web-antd/src/views/guoba/plugins/index.vue` 插件列表
- `apps/web-antd/src/views/guoba/plugins/plugin-detail/index.vue` 插件详情
- `apps/web-antd/src/views/guoba/system/account/index.vue` 账号管理
- `apps/web-antd/src/views/guoba/_components/*` 通用业务组件

### API

- `apps/web-antd/src/api/guoba/config.ts` 配置相关接口
- `apps/web-antd/src/api/guoba/plugin.ts` 插件相关接口
- `apps/web-antd/src/api/guoba/system.ts` 系统相关接口
- `apps/web-antd/src/api/guoba/types.ts` 业务类型定义
- `apps/web-antd/src/api/request.ts` 请求拦截器与 token header

### 状态管理

- `apps/web-antd/src/store/guoba.ts` 插件列表缓存等状态

## 4. 前后端路由与菜单关系（Guoba 关键）

- 前端页面组件路径由后端菜单声明驱动（动态菜单）。
- 后端菜单定义核心文件：
  - `../server/service/both/system/model/menus/pluginMenus.js`
- 用户/账号接口控制器：
  - `../server/controller/system/UserController.js`

也就是说：你看到的 Guoba 菜单和入口，很大一部分是后端给前端下发的，不只是前端本地静态路由。

## 5. 开发与发布最短路径

在 `guoba-plugin-web` 目录执行：

```bash
pnpm run dev:antd
```

只构建 antd 前端：

```bash
pnpm run build:v5:app
```

构建并同步到 `server/static`（常用）：

```bash
pnpm run build:v5
```

其中 `build:v5` 实际是：

1. `build:v5:app` -> 构建 `apps/web-antd`
2. `sync:v5:dist` -> 覆盖同步到 `../server/static`

## 6. 建议的日常改动流程

1. 先改 `apps/web-antd/src/views/guoba/**`
2. 接着改对应 API：`src/api/guoba/**`
3. 如涉及菜单/入口，联动检查 `server/.../pluginMenus.js`
4. 如涉及账号状态、登录态等，联动检查 `server/controller/system/UserController.js`
5. 最后执行 `pnpm run build:v5` 并强刷页面验证

## 7. 当前维护建议（不改结构版）

- 业务改动尽量收敛在 `views/guoba` + `api/guoba`，降低升级成本。
- 工程层（`packages/internal`）只在必要时改，避免把业务问题升级为架构问题。
- 每次改完前端都走一次 `build:v5`，避免 “源码改了但 static 没同步”。

## 8. 本次瘦身记录

- 已移除未使用目录：
  - `apps/backend-mock`
  - `apps/web-antdv-next`
  - `apps/web-ele`
  - `apps/web-naive`
  - `apps/web-tdesign`
  - `docs`
  - `playground`
- 已移除开发流程目录：
  - `internal/lint-configs`
  - `scripts/deploy`
  - `scripts/turbo-run`
  - `scripts/vsh`
- 已移除仓库元信息目录：
  - `.changeset`
  - `.github`
  - `.vscode`
- 已递归清理产物和依赖目录：
  - `node_modules`
  - `dist`
  - `.turbo`
- 已清理对应无效脚本和构建配置（`package.json`、`pnpm-workspace.yaml`、`turbo.json`）。
