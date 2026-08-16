# Discussions #2400 更新稿（草稿，醒来审阅后发）/ Draft update for official DSH Discussions #2400

> 发布前检查：单测数字以当天 `docs/AUDIT-REPORT.md` 为准；不要出现"敬请期待/后续"类空话；每条能力都对应仓库里可运行的东西。

## 鲸影 dsh-video-studio：一周内从 0 到"可演示的漫剧流水线"

帖子里很多人问 DSH 生态缺生成式视频插件。这是我们的答案：**鲸影**（@hackerfish/dsh-video-studio），DSH 原生漫剧/视频插件，行业公认的七段工作流在 DSH 里落地：

```
故事(会话模型) → 剧本 → 分镜 → 资产主图 → 资产图 → 视频 → 成片(剪映草稿/ffmpeg)
```

**现在就能跑的（无 key）：**

- `whale_story_presets`：5 套预置漫剧题材（都市逆袭/仙侠/悬疑/甜宠/科幻），双语角色卡+场景卡+分镜，一条命令出完整流水线脚本；
- `node scripts/demo-presets.ts <id>`：mock 供应商全链路出片（真实 mp4，ffmpeg 合成）；
- `whale_optimize_prompt`：草稿提示词一键升级专业级（模板库+增益库+负面清单）；
- `whale_comfyui_workflow`：分镜决策直接生成 ComfyUI workflow JSON（有 GPU 就是免费本地引擎）。

**免费额度工程（"薅羊毛"的正经做法）：**

- 账号池：多账号轮换 + 日额度 + 失败指数退避 + 流水线内自动降级重提；
- 凭证保险库：本机 whale.json（0600），API 全脱敏，设置页「鲸影账号」管理；
- 供应商矩阵：万相免费文生图 ✅实测、豆包网页版 SSE ✅抓包回放、即梦免费档的真相（text2video 队列长期 SystemBusy）如实写进 README。

**工程纪律（为什么敢发出来）：**

- 116 单测全绿（额度池/保险库/对口型契约/剪映草稿结构/ffmpeg 端到端），构建链自带客户端包 12 项断言自测；
- 自我审计：`whale_self_audit` 工具扫描项目自身，`docs/AUDIT-REPORT.md` 是生成物，每天 diff 就是进度；
- 复盘文化：`docs/RETROSPECTIVE-2026-08-17.md` 把踩过的 11 个坑规则化（Node type-stripping 参数属性、管道吞退出码、DSH_HOME 隔离、git 分叉回放……）。

**下一步（差 key 就能清零）：** 可灵官方/百炼/豆包 ARK/万相视频/对口型五个适配器全部就绪，等一个真实 key 跑真片。

仓库：https://github.com/hackerFish/dsh-video-studio
安装：`dsh plugin --profile web add github:hackerFish/dsh-video-studio --ignore-workspace-root-check`

*（本插件与 DeepSeek 无隶属关系；sessionid/cookie 类通道请遵守各平台条款）*
