# 2026-09-12 验证记录

## 已完成

- `npm test`：5/5 通过。
  - Hydro native URL 幂等。
  - 工作区路径拒绝外部和协议相对地址。
  - 工作区链接与查询参数可以往返解析。
  - 比赛个人时间覆盖和题目顺序测试通过。
- `npm run build`：通过。
- `dist/index.html` 引用的 5 个 JS/CSS 资源全部存在，无缺失。
- 主 bundle 不再包含旧的 `https://oj.luoaowoo.cn/register` 写法，包含 `/hydro-native`。
- Playwright 本地 smoke：`/`、`/login`、`/problems`、`/records`、`/contests`、`/training`、`/homework`、`/discuss`、`/ranking`、`/about` 均正常渲染，无 404。
- `/hydro?path=%2Flostpass` 正常在当前主题中渲染“忘记密码”表单。
- React 页面中已无 `target="_blank"` 打开 Hydro 原生功能页。
- 剩余 `hydroPublicUrl()` 只用于代码下载和题目文件下载，属于同源资源下载，不进入 Hydro 主题页面。

## 当前限制

- 801 实例的匿名用户无法访问主要业务页面，且 `/register` 当前返回 `302 /login`。
- 没有可用测试账号，因此普通用户、管理员、root 的真实写操作尚未做线上验收。
- 已完成 URL、解析、组件和构建级合同测试；权限写入测试必须使用测试账号继续执行。

## 提交

- `2adc6b2`：主题化 Hydro 工作区与迁移文档。
- `8e38278`：账户和讨论动作迁入站内工作区。
- `ea3b7f0`：题目和记录动作迁入站内工作区。
- `479d16b`：比赛、作业、训练动作迁入站内工作区。
- `47a196f`：完整 Hydro 动作覆盖。
- `86a16c6`：保留 Hydro 链接动作的 GET 方法。
