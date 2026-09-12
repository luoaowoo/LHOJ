# Hydro 全功能迁移计划

## 目标
把 `http://64.90.0.223:801` 上 Hydro v4.14.1 的用户功能迁移进当前 React + MUI 前端。Hydro 继续作为后端，前端直接使用 `/api` GraphQL、`/hydro-native/*` PJAX/表单和上传下载接口，不新增业务后端。

## 基线
- 后端：Hydro v4.14.1 Community。
- 官方 UI：4.53.1。
- 会话：Hydro Cookie，所有请求保持同源。
- 数据读取：优先 GraphQL；缺少 GraphQL 时用 PJAX/HTML 适配。
- 写入：结构化接口优先；其余复用 Hydro 原生表单 action。
- UI：沿用 `src/theme.ts`、MUI、现有的响应式和 accessibility 规则。
- 不允许把用户带到 Hydro 原生主题；下载、打印和媒体资源除外。

## 架构
1. `src/lib/api.ts`：GraphQL 和已有结构化动作。
2. `src/lib/scrape.ts`：PJAX、HTML、表单、表格、文件解析。
3. `src/lib/endpoint.ts`：统一 `/hydro-native/*` 同源 URL，必须幂等。
4. `src/lib/hydro-workspace.ts`：把 Hydro 路径转换成站内 `/hydro?path=...`。
5. `src/components/HydroAdminWorkspace.tsx`：在当前主题中渲染无专用页面的 Hydro 表单、表格、动作和链接。
6. `src/pages/HydroWorkspacePage.tsx`：全功能兜底页面。
7. 专用 `src/pages/*`：高频流程继续使用结构化 React 页面。

## 功能范围
覆盖登录、账户、安全、通知、题目、评测、比赛、作业、训练、讨论、用户、排名、域管理、系统管理、文件、媒体、GraphQL API，以及 801 实例实际启用的插件。插件必须先以线上菜单和路由探测确认启用，不照搬未启用模块。

## 阶段
- A：修复所有跨站 Hydro 404，统一工作区入口和同源重定向。
- B：题目、提交、记录、题解、文件。
- C：比赛、作业、训练、讨论。
- D：账户、安全、消息、用户。
- E：域、系统管理和已启用插件。
- F：生产构建、资源校验和部署后逐路由验收。

## 801 实测约束
- 匿名访问主要业务页面都会跳转登录。
- `/register` 当前 `302 /login`，该实例未开放注册；界面需保留入口但按实际接口反馈处理。
- 匿名 GraphQL introspection 开启；题目、比赛等根字段需要登录。
- OAuth、博客、VJudge、导入器、OnlyOffice 等没有匿名证据证明启用，不能标记为已迁移。
- 写操作真实验收需要普通、管理员和 root 测试账号；无账号时只能做合同测试，不能宣称线上验收完成。

## 完成标准
1. `/hydro-native/*` 能代理页面、表单、上传、下载和重定向。
2. React 中不存在指向 `https://oj.luoaowoo.cn/<Hydro路由>` 的功能入口。
3. 所有原生功能都能在 `/hydro` 工作区或专用页面完成。
4. `npm test`、`npm run build` 通过。
5. 每个模块都有路由 smoke 和动作合同测试。
