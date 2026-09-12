# Hydro 功能迁移清单

## 认证与账户
| 功能 | Hydro 路由 | 现状 | 目标 |
|---|---|---|---|
| 登录/退出 | `/login` `/logout` | 已覆盖 | 保持 |
| 注册/邀请码注册 | `/register` `/register/:code` | 待迁移 | 工作区；801 当前关闭注册 |
| 找回/重置密码 | `/lostpass` `/lostpass/:code` | 待迁移 | 工作区 |
| TFA/WebAuthn/sudo | `/user/tfa` `/user/webauthn` `/user/sudo` | 部分覆盖 | 完整安全管理页 |
| 账户偏好/头像 | `/home/settings/:category` `/home/avatar` | 部分覆盖 | 专用表单 |
| 会话/改密/改邮箱/注销 | `/home/security` `/user/delete` | 部分覆盖 | 专用安全页 |
| 消息 | `/home/messages` | 部分覆盖 | 已读、发送、删除 |

## 题目与评测
| 功能 | Hydro 路由 | 现状 | 目标 |
|---|---|---|---|
| 列表/随机/分类 | `/p` `/problem/random` `/p/category/:category` | 已覆盖/工作区 | 站内筛选 |
| 详情/提交/自测/Hack | `/p/:pid` `/p/:pid/submit` `/p/:pid/hack/:rid` | 已覆盖 | 保持 |
| 创建/编辑/配置 | `/problem/create` `/p/:pid/edit` `/p/:pid/config` | 工作区 | 专用表单后续扩展 |
| 测试数据和附加文件 | `/p/:pid/files` | 部分覆盖 | 上传、重命名、删除、下载 |
| 题解 | `/p/:pid/solution` | 部分覆盖 | 列表、CRUD、回复、投票 |
| 统计 | `/p/:pid/stat` | 已覆盖 | 保持 |
| 评测列表/详情 | `/record` `/record/:rid` | 已覆盖/工作区 | 下载、重测、取消、版本 |
| 实时连接 | record WebSocket | 已覆盖 | 保持 |

## 比赛、作业、训练
| 功能 | Hydro 路由 | 现状 | 目标 |
|---|---|---|---|
| 比赛列表/详情/报名/榜单 | `/contest` `/contest/:tid` `/contest/:tid/scoreboard` | 已覆盖 | 保持 |
| 比赛创建/编辑/管理 | `/contest/create` `/contest/:tid/edit` `/contest/:tid/management` | 工作区 | 专用管理 UI |
| 答疑/代码/打印/气球/用户 | `/contest/:tid/{clarification,code,print,balloon,user}` | 工作区 | 专用组件 |
| 作业列表/详情/参加/榜单 | `/homework` `/homework/:tid` | 已覆盖/工作区 | 保持 |
| 作业创建/编辑/代码/文件 | `/homework/create` `/homework/:tid/{edit,code,file}` | 工作区 | 专用表单 |
| 训练列表/详情/加入 | `/training` `/training/:tid` | 已覆盖 | 保持 |
| 训练创建/编辑/文件 | `/training/create` `/training/:tid/{edit,file}` | 工作区 | DAG 编辑器和文件管理 |

## 讨论与用户
| 功能 | Hydro 路由 | 现状 | 目标 |
|---|---|---|---|
| 讨论列表/节点 | `/discuss` `/discuss/:type/:name` | 部分覆盖/工作区 | 节点筛选 |
| 发布讨论 | `/discuss/:type/:name/create` | 工作区 | Markdown 编辑器 |
| 详情/回复/编辑/删除/反应 | `/discuss/:did` | 已覆盖/部分覆盖 | 补齐 reaction/lock/star |
| 用户资料/排名 | `/user/:uid` `/ranking` | 已覆盖 | 保持 |
| 管理员切换账号 | `/account/:uid` | 工作区 | root 专属 |

## 域与系统
| 功能 | Hydro 路由 | 现状 | 目标 |
|---|---|---|---|
| 域资料/成员/权限/角色/用户组 | `/domain/{edit,user,permission,role,group}` | 工作区 | 专用表格和权限编辑器 |
| 入域申请/搜索/加入/创建域 | `/domain/{join_applications,search,join}` `/home/domain/create` | 工作区 | 完整流程 |
| 管理首页/仪表盘/设置/配置 | `/manage/{,dashboard,setting,config}` | 工作区 | 图表和类型化表单 |
| 脚本/用户导入/用户权限 | `/manage/{script,userimport,userpriv}` | 工作区 | 结果、批量导入、权限编辑 |
| 比赛模式 | `/contestmode` | 工作区 | root 专属 |

## 文件、公共页面和插件
- `/file`、`/file/:uid/:filename`：列表、上传、删除、下载。
- `/media`：Marked/DOM 媒体批量渲染。
- `/wiki/help`、`/wiki/about`、`/api`：帮助、关于、GraphQL。
- 字体、Markdown、KaTeX、Monaco、流式下载：复用现有前端能力。
- OAuth、博客、VJudge、OnlyOffice、各导入器和搜索插件：以 801 登录态实际菜单为准，待探测。
