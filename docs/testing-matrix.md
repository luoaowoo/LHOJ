# Hydro 迁移测试矩阵

## 自动检查
- `npm test`：URL 幂等、工作区路径校验、比赛状态和题目顺序。
- `npm run build`：TypeScript 和 Vite 生产构建。
- 静态扫描：不得出现按钮指向 `https://oj.luoaowoo.cn/<Hydro路由>`。
- 静态扫描：缺失 `/assets/*` 必须 404，不返回 SPA 首页。

## 路由 smoke
在 guest 环境逐页访问现有 React 路由，确认不是 `页面不存在`：
`/`、`/login`、`/problems`、`/problem/:id`、`/problem/:id/solutions`、`/problem/:id/stats`、`/problem/:id/files`、`/records`、`/records/:rid`、`/contests`、`/contests/:id`、`/training`、`/training/:id`、`/homework`、`/homework/:id`、`/discuss`、`/discuss/:id`、`/ranking`、`/user`、`/user/:uid`、`/settings`、`/management`、`/status`、`/messages`、`/security`、`/account-settings/:category`、`/about`、`/hydro?path=%2Flostpass`。

## 动作合同测试
每个动作记录方法、路径、Content-Type、字段、成功状态、失败消息、回跳和刷新行为：
- 登录、退出、密码重置、TFA、WebAuthn、sudo。
- 提交、文件提交、自测、Hack。
- 题目创建、编辑、配置、文件、题解。
- 重测、取消、代码下载、版本。
- 比赛创建、编辑、报名、答疑、打印、气球、管理。
- 作业创建、编辑、参加、文件、榜单。
- 训练创建、编辑、加入、DAG、文件。
- 讨论创建、编辑、回复、删除、反应、锁定。
- 头像、偏好、安全、消息、用户文件。
- 域资料、成员、权限、角色、用户组、申请。
- 系统设置、配置、脚本、用户导入、用户权限。

## 权限矩阵
- guest：登录、找回密码、公开 wiki。
- 普通用户：提交、消息、账户、报名、讨论。
- 题目/活动管理员：题目、比赛、作业、训练管理。
- 域管理员：域资料、成员、权限、角色、用户组。
- root：系统管理、用户权限、比赛模式、切换账号。

801 当前匿名访问全部主要业务均要求登录，且注册关闭。真实写操作验收必须有测试账号；没有账号时只能标记为合同测试，不得标记线上通过。

## 放行条件
功能对应清单完成、无必需原生跳转、读写/错误/权限路径已测、构建和测试通过、部署后资源状态与 MIME 正常。
