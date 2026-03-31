# Guoba Plugin Web（当前精简版）

这是 Guoba 插件前端工程的精简维护版本，当前仅保留 `web-antd` 方案，用于构建并发布到 Guoba 后端静态目录。

## 项目目标

- 维护 Guoba 管理面板前端（Vue 3 + Vite + TypeScript）。
- 构建后同步到 `../server/static` 供后端直接托管。
- 保持最小可维护结构，减少无关目录和脚本干扰。

## 当前目录（核心）

- `apps/web-antd`：实际前端应用。
- `packages/*`：`web-antd` 依赖的工作区包。
- `internal/{node-utils,tailwind-config,tsconfig,vite-config}`：构建和类型配置支持。
- `scripts/sync-v5-dist.mjs`：将前端产物同步到 `../server/static`。
- `scripts/clean.mjs`：递归清理 `node_modules` / `dist` / `.turbo`。
- `PROJECT_MAP.zh-CN.md`：项目地图与入口说明。

## 环境要求

- Node.js：`^20.19.0 || ^22.18.0 || ^24.0.0`
- 推荐本地版本：`22.22.0`（见 `.node-version`）
- pnpm：`>=10.0.0`

## 快速开始

```bash
pnpm install
pnpm run dev
```

开发默认等价于：

```bash
pnpm run dev:antd
```

## 构建与发布

只构建前端应用：

```bash
pnpm run build:v5:app
```

只同步构建产物到后端静态目录：

```bash
pnpm run sync:v5:dist
```

一键构建并同步（推荐）：

```bash
pnpm run build:v5
```

## 常用脚本

- `pnpm run build`：turbo 构建工作区（按依赖链）。
- `pnpm run build:analyze`：分析模式构建。
- `pnpm run preview`：预览 `web-antd` 构建结果。
- `pnpm run test:unit`：运行单元测试（Vitest）。
- `pnpm run clean`：清理缓存和依赖目录。
- `pnpm run reinstall`：清理后重新安装依赖。

## 与 Guoba 后端联动

- 前端产物来源：`apps/web-antd/dist`
- 同步目标目录：`../server/static`
- 同步脚本：`scripts/sync-v5-dist.mjs`

## 维护建议

- 业务改动优先集中在 `apps/web-antd/src/views/guoba` 与 `apps/web-antd/src/api/guoba`。
- 每次修改完页面后执行 `pnpm run build:v5`，避免前端与 `server/static` 不一致。
- 详细入口说明可见 `PROJECT_MAP.zh-CN.md`。

