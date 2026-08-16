# 鲸影自我审计报告 / Whale Self-Audit Report

> 自动生成于 2026-08-16T18:43:24.696Z —— `node scripts/self-audit.ts` 或 `whale_self_audit` 工具。
> 本文件是生成物，勿手改；每天重跑一次，差异见 git diff（这正是"自我分析"的用法）。

## 概览

- 包: **@hackerfish/dsh-video-studio** v0.2.0
- git: `main` · 131 commits
- 最近提交: runtime: UI 账号→账号池→供应商全链路接线（whale_generate_video 走池；loadPool 新账号种子；116 单测全绿）
- 测试: 28 个文件 / 116 个用例（静态计数；权威数字跑 `node --test`）
- 源码: 40 个 TS 模块 / 4295 行
- 供应商: 11 个（实测 4 · 适配器待 key 7 · 其中纯 key 型 3）

## 供应商矩阵

| 供应商 | 通道 | 状态 | 免费额度 | 备注 |
|---|---|---|---|---|
| mock | 本地占位 | ✅ 实测 | ✅ | 零凭证链路自测；demo 与单测用 |
| jimeng | sessionid 免费档 | ✅ 实测 | ✅ | 协议全通；文生视频队列长期 SystemBusy（实测凌晨依然满），免费路线改为万相出图 → 图生视频 |
| tongyi-wanx | cookie+xsrf 免费档 | ✅ 实测 | ✅ | 实测出过真图（1.28MB 鲸鱼图）；免费档为文生图，视频需会员 |
| doubao-web | cookie 网页版 | ✅ 实测 | ✅ | 真实抓包回放：SSE 聊天做 LLM 三段 + 图片 bot 出资产图；Pro 免费额度 7 天窗口 |
| comfyui | 本地 /prompt | 🔧 适配器就绪 | ✅ | /prompt→/history→/view 协议 mock 服务器级验证；workflow JSON 生成器就绪，真 GPU 待测 |
| kling | JWT 官方 | 🔧 适配器就绪 | — | text2video 适配器+单测就绪，等真实 key |
| kling-dashscope | DashScope sk- | 🔧 适配器就绪 | ✅ | 官方免费额度通道（视频合成异步协议），等 key |
| kling-lipsync | JWT 官方对口型 | 🔧 适配器就绪 | — | 官方 API 3-13 契约逐字段对齐，audio2video/text2video 双模式，8 单测，等 key |
| doubao | 火山方舟 ARK key | 🔧 适配器就绪 | — | Seedance 视频 + Seedream 图像接入，等 key |
| dashscope-wan | DashScope sk- | 🔧 适配器就绪 | ✅ | 万相视频官方免费额度通道，模型 id 待首个真实 key 确认 |
| sessionid-http | sessionid 通用 | 🔧 适配器就绪 | ✅ | 多平台 sessionid 预设的通用适配器（jimeng 之外的可灵等） |

## 能力清单

- 模型工具 (7): `whale_storyboard` `whale_generate_video` `whale_comfyui_workflow` `whale_optimize_prompt` `whale_story_presets` `whale_self_audit` `whale_quality_review`
- HTTP 路由 (3): `/dsh-video-studio/health` `/dsh-video-studio/runs` `/dsh-video-studio/accounts`
- 设置页 tab (3): `whale` `whale-workbench` `whale-accounts`
- 预置题材 (5): comeback-latte(5镜) xianxia-sword(4镜) suspense-last-train(4镜) sweet-reunion(4镜) scifi-ark(4镜)

## 差距清单（下一步）

- [🔑 等 key] **口型同步真实调用** — 适配器+8 单测就绪，差一个可灵 key 跑真片
- [🔑 等 key] **可灵官方/百炼/豆包 ARK/万相视频真实生成** — 五个适配器就绪，全部等真实 key
- [⬜ 待办] **真实长片漫剧成片** — 现有 demo 为 mock/短镜；需先通一个视频通道
- [⬜ 待办] **三个设置页 tab 人眼验证** — boot 与 API 已验证；UI 观感需用户在浏览器确认
- [⬜ 待办] **推广位（Discussions #2400 更新/发布说明）** — 能力已就绪，差内容更新

## 源码模块（按行数）

- `src/host/tools.ts` — 417 行
- `src/director/pipeline.ts` — 289 行
- `src/client/index.ts` — 258 行
- `src/content/presets.ts` — 248 行
- `src/accounts/store.ts` — 224 行
- `src/quota/scheduler.ts` — 202 行
- `src/providers/jimeng.ts` — 168 行
- `src/prompts/templates.ts` — 140 行
- `src/providers/doubao-web.ts` — 128 行
- `src/finalcut/render-ffmpeg.ts` — 126 行
- `src/finalcut/jianying-draft.ts` — 124 行
- `src/host/index.ts` — 121 行
