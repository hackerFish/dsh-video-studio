# 鲸影开发复盘 · 2026-08-17 夜场 / Retrospective 2026-08-17 Night Session

> **English abstract**: This doc distills a 7-hour overnight build session (quota pool, credential vault, kling lip-sync adapter, preset pack, docs) into ten numbered rules. Each rule: symptom → root cause → rule → where it lands in the repo. Rule 11 covers the self-audit mechanism this doc feeds.

复盘对象：2026-08-17 凌晨 01:55–02:30 的会话（6 个 commit：账号池、凭证保险库、对口型、内容包、文档、安全修复）。
目标：把"今晚怎么错的、怎么修的"沉淀成**规则**，写进代码与文档，让后来的会话和未来的自己不再重踩。

---

## 一、这次会话干了什么

| Commit | 内容 | 测试数 |
|---|---|---|
| `ab33abd` | 账号池 AccountPool（轮换/退避/额度）+ 流水线降级重提 | 80 |
| `aaa0998` | 凭证保险库 whale.json + 账号管理 API + 「鲸影账号」UI | 87 |
| `16ea584` | 可灵官方对口型适配器（官方 API 3-13 契约） | 95 |
| `9e47fcc` | 预置漫剧内容包（5 题材）+ whale_story_presets + demo 脚本 | 101 |
| `d305646` | 双语文档同步 | 101 |
| `50d596d` | POST 去明文凭据 + 保险库跟随 DSH_HOME 隔离 | 102 |

全部推送到 GitHub，真机 boot + 账号 API 全链路验证。

## 二、十条规则（现象 → 根因 → 规则 → 落点）

### 规则 1：Node 24 直跑 .ts 不支持参数属性（parameter properties）

- **现象**：`SyntaxError [ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX]: TypeScript parameter property is not supported in strip-only mode`，两次（AccountPool、CredentialStore）。
- **根因**：项目用 Node 原生 type-stripping 直接跑 `.ts` 单测，strip-only 模式只擦类型、不转译 `constructor(private x: T)` 这类 TS 语法糖。
- **规则**：项目代码**禁用构造器参数属性**，一律写成 `private x: T` + 构造器内赋值。
- **落点**：本仓库代码现状即规范；新增代码 tsc + `node --test` 双跑即能抓住（tsc 通过不代表 node 能跑）。

### 规则 2：shell 管道会吞掉退出码

- **现象**：推送重试循环 `git push 2>&1 | tail -2 && break` 一次失败就"成功"退出，6 次重试全是空转。
- **根因**：管道的退出码是 `tail` 的，不是 `git push` 的。
- **规则**：重试循环写 `if cmd >log 2>&1; then break; else sleep; fi`，不用管道接 `&&`。
- **落点**：本机所有后台推送重试统一这个写法。

### 规则 3：端口被旧进程占着时，"启动成功"是假象

- **现象**：改完脱敏代码重启服务后，POST 响应仍带明文凭据——查了才知道旧进程（kill 没生效）还占着 3990，新进程直接 EADDRINUSE 死掉，测的是旧代码。
- **根因**：kill 未确认、启动未看日志就下结论。
- **规则**：kill 后 `ps -p` 确认；起服务后先看日志确认 `dsh web: http://…` 再 curl；日志里有 Node 栈就是没起来。
- **落点**：所有真机验证流程（见规则 10）。

### 规则 4：成功路径也必须脱敏

- **现象**：`POST /accounts` 成功响应把 `credential` 明文回显（第一次实现 `{...account}` 直接展开）。
- **根因**：只想着"列表要脱敏"，忘了边界处所有出口都算出口。
- **规则**：**边界统一脱敏**——`maskCredential()` 在 host 路由层一次做完，成功/失败路径都不允许明文过界；测试必须断言"响应字符串不含明文"。
- **落点**：`src/host/index.ts` 的 destructure 去字段写法 + `test/credential-store.test.ts` 断言 on-disk poolState 不含明文。

### 规则 5：插件写盘的目录必须跟随 DSH_HOME

- **现象**：真机 boot 时保险库写进了真实用户的 `~/.whale`，而不是隔离实验室的 home。
- **根因**：`CredentialStore.open()` 默认 `homedir()/.whale`，无视 DSH_HOME。
- **规则**：所有持久化默认路径：`$DSH_HOME` 优先，`~/.whale` 兜底；测试显式验证（`process.env.DSH_HOME` 换 tmp 目录断言落点）。
- **落点**：`src/accounts/store.ts` + `test/credential-store.test.ts`（DSH_HOME 优先用例）。

### 规则 6：git 历史分叉先比 tree，别硬 rebase

- **现象**：Contents API 应急推送造成 origin/main 与本机历史分叉，`git rebase origin/main` 在第一个 commit 就冲突。
- **根因**：两个镜像提交序列（API 推的 vs 本机的）内容相同、hash 不同，10 个 commit 逐个 rebase 必然冲突。
- **规则**：先 `git rev-parse A^{tree} B^{tree}` 比 tree——一致就 `git checkout -B main origin/main && git cherry-pick <新commit>` 重放，不一致再逐文件 diff。**永不硬 rebase 分叉历史**。
- **落点**：本会话用了这条，2 分钟收掉分叉；记入本仓库操作手册。

### 规则 7：网络波动是常态，重试要带正确退出码判断

- **现象**：github.com 间歇性 SSL 证书错/超时，push 时好时坏。
- **根因**：本机代理环境 + 远端抖动；`sslVerify=false` 是本机应急手段，不是修复。
- **规则**：后台重试循环（间隔 20-30s，8 次）+ 规则 2 的退出码判断；push 后 `ls-remote` 比对远端 head 确认。
- **落点**：所有推送工作流。

### 规则 8：适配器要 spec-first，不靠记忆猜端点

- **现象**：对口型端点/字段历史上各镜像文档不一致，凭记忆写必然返工。
- **根因**：Kling 官方文档国内访问不稳定。
- **规则**：先找**官方文档镜像**（`mcp-kling/kling-api-docs.md` 这类第三方镜像）逐字段对齐请求/响应，把契约来源写进适配器文件头注释；单测覆盖字段映射与状态机，而不是只测"能跑"。
- **落点**：`src/providers/kling-lipsync.ts` 头注释 + 8 个字段级单测。

### 规则 9：把"验证过的失败"也写进文档

- **现象**：即梦免费档 text2video 队列长期 SystemBusy（凌晨实测依然满），这是花了几轮实测才确认的真相，不能只留在聊天记录里。
- **根因**：口头结论会丢，文档结论会留存。
- **规则**：每个供应商的真实状态（协议通/实测过/被拒/等 key）进 README 矩阵；**免费策略随实测结果转向**（本会话：万相免费文生图 → 图生视频/官方 key）。
- **落点**：README 供应商矩阵 + self-audit 的供应商矩阵（单一事实源，见第三部分）。

### 规则 10：host 路由/工具变更后必须真机 boot 验证

- **现象**：路由注册、body 解析这些只有真机跑才暴露的问题，单测看不见。
- **根因**：单测测的是函数，不测 DSH 运行时装载。
- **规则**：用**最小隔离 profile**（`.lab-home2`：只挂 dsh-base + dsh-web-app + whale 本体，`file:link` 到仓库）起真实例，curl 全部路由做 round-trip；改 host 后必跑。
- **落点**：本会话真机验证抓到规则 4、规则 5 两个 bug——这条规则当晚就回了本。

## 三、这些教训如何留在项目里：自我分析机制

复盘不能只写这一次，**要让项目自己会写**：

1. **`src/selfaudit/`** —— 审计模块：
   - `matrix.ts`：供应商矩阵单一事实源（id/通道/状态/备注），health 路由与审计报告共用；
   - `audit.ts`：扫描源码模块、测试文件与用例数、工具/路由/UI tab 清单、预置题材、git 状态，拼出 `AuditFacts`；
   - `render.ts`：把事实渲染成 markdown 报告。
2. **`scripts/self-audit.ts`** —— 执行审计并把报告**写进** `docs/AUDIT-REPORT.md`（带生成时间戳的自动生成文件）。
3. **`whale_self_audit` 工具** —— 在会话里让模型直接调用：返回审计 JSON + 报告摘要，模型据此做差距分析。
4. **差距清单** —— 审计里固化的 `gaps`：口型同步真实调用、官方 key 通道实测、长片 demo、账号 UI 人眼验证、推广位——每天早上看一眼就知道下一步。

一句话回答"能做到自我分析并且编写吗"：**能**——`scripts/self-audit.ts` 是"自我分析"，它生成的 `docs/AUDIT-REPORT.md` 是"编写"，两者都进 git 历史，每天的差距变化可 diff。

## 四、明天醒来后的动作清单

1. 重启 `dsh web`，人眼验证「鲸影 / 鲸影工作台 / 鲸影账号」三个 tab；
2. 看 `docs/AUDIT-REPORT.md` 的差距清单，挑一项开工；
3. 给一个真实 key（可灵官方或 DashScope），把"等 key"状态清零；
4. 推广：官方 Discussions 2400 帖子里补一篇"鲸影上线"更新。
