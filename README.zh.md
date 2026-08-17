# 🐳 dsh-video-studio（鲸影）

**DeepSeek Harness 原生视频/漫剧生成插件：七段导演流水线 × 多账号额度池（失败自动换号）× 凭证保险库 × 四层提示词 + 评分回写闭环。**

> 生态现状：DSH 已有 1000+ 插件，但**没有一个生成式视频插件**；外部有工业级漫剧平台（waoowaoo / LumenX / MangaV / ArcReel），但都是独立软件，不是 DSH 插件。鲸影把这条已验证的流水线做成 **DSH 原生、热拔插、可每步接管** 的插件。

## 一句话定位

**质量第一，省钱第二**：免费额度优先试生成 → 质检不达标自动升档重拍 → 全部消耗可追溯。

## 七段工作流（行业公认管线）

```
故事（豆包等 LLM 写小说）→ 剧本（LLM 拆剧）→ 分镜（LLM 出分镜）
→ 资产主图（MJ 等出主视觉）→ 资产图（图像模型出变体，万相/豆包）
→ 视频（Seedance/即梦/可灵）→ 成片（剪映草稿/ffmpeg）
```

- **前三个阶段是 LLM 阶段**：在 DSH 里由会话模型直接完成——你对话用的模型（豆包/DeepSeek 都可以）就是"写小说/拆剧本/出分镜"的大脑，插件不再调外部 LLM

**与公认工作流的对照**：

| 公认流程 | 鲸影落点 |
|---|---|
| 豆包写小说/拆剧本/出分镜 | = DSH 会话模型直做 story/script/storyboard 三段（换豆包模型即"豆包写"） |
| MJ 出资产主图 | = master-asset 段（MJ 官方 API 适配器待写；万相/Seedream 可替） |
| image 出资产图 | = shot-assets 段（万相✅实测 / **豆包 Seedream✅已接入**） |
| Seedance 出视频 | = video 段（**豆包 Seedance✅** / 即梦 / 可灵 / ComfyUI） |
| 剪映剪辑成片 | = final-cut 段（剪映草稿导出✅ / ffmpeg✅） |
- **每段都有 gate**（auto 全自动 / ask 每步询问 / manual 人工提供）
- **一致性资产库**：角色/场景主图 + 逐镜变体登记，参考图自动注入提示词（漫剧行业一致性标准做法）
- **并行分镜**：资产图与视频批量提交、并发轮询
- **额度池**：每供应商多账号轮换 + 按日额度 + 失败指数退避 + 流水线内自动降级重提（坏号立刻冷却，换下一个健康号继续跑）+ 全程审计
- **凭证保险库**：账号存在 `~/.whale/whale.json`（0600 权限、原子写入），API 只回脱敏提示，设置页「鲸影账号」tab 直接增删管理
- **评分回写闭环**：每次评审把得分+增益组合写回评分簿，优化器按真实历史得分选增益
- **风格基因（记忆）**：风格 DNA、模板评分演化、重拍反馈，跨会话沉淀
- **提示词工程**：专业模板库（角色三视图/场景主图/单镜画面，参数化）+ 质量增益库（8K/无阴影/中性表情/严禁文字…可组合）+ 优化器；`whale_optimize_prompt` 工具把草稿一键优化成专业级
## 四层提示词（深度自由 + 自优化）

1. **风格 DNA**（全局）：画风/色调/节奏/一致性 token
2. **分镜模板**：景别、运镜、时长结构
3. **逐镜提示词**：可全手写，自动注入模板变量
4. **负向/一致性注入**：自动生成、可覆盖

**自优化闭环**：生成 → 评审打分（LLM 评审 + 你的点赞/重拍记录）→ 得分与增益组合写回评分簿 → 下次同风格自动按历史真实表现选增益。你的每一次"重拍"都在训练你的风格基因。

## 多账号与免费额度调度

- 供应商两种接入：**API Key 型**（可灵/百炼/Veo/Replicate…）与 **sessionid 型**（即梦等官网免费额度，sessionid 由你在官网登录后自取）
- **额度池（AccountPool）**：每个账号登记每日配额 → 自动轮换 → 失败指数退避（60s 起翻倍封顶 30min）→ 免费额度耗尽降级到付费 key → 提交失败当场换下一个健康账号重提，坏号不会被反复拖死
- 账号凭证通过设置页「鲸影账号」或 `POST /dsh-video-studio/accounts` 管理，明文只落本机 vault，接口只回脱敏
- **运行时接线**：UI 里加的账号直接喂给 `whale_generate_video`——保险库 → 池选号（轮换/退避）→ 按账号构造供应商（`src/host/account-providers.ts`：单字段凭证明文、多字段凭证 JSON）→ 额度与健康状态写回保险库
- 费用追踪：每次生成记录供应商/账号/消耗，随时可查

> ⚠️ 合规声明：本插件支持**你自有的多账号**按各平台官方规则轮换额度；**不提供**批量注册、绕过风控等违反平台条款的功能——那会封号且不专业。请遵守各平台服务条款。

## 架构原则

- **薄抽象**：供应商 = 一个 6 方法接口（submit/status/fetch/capabilities/quote/health），新增模型只需一个适配器文件
- **能力路由**：导演引擎按供应商声明的 capabilities（文生视频/图生视频/首尾帧/口型/时长/分辨率）自动选路
- **热拔插**：插件本身 `dsh plugin add` 即装即用；供应商与流水线阶段运行时热切换，不重启
- 详见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## 现在能做什么

- 七段流水线、四层提示词合并、额度池调度（退避/降级）、质检重拍（导演喊卡）、评分回写、自我审计、**口型同步段**（配音镜头自动跑对口型，失败回退原片）：**120 个单测，全绿**
- 剪映草稿导出（结构校验器盯着）；ffmpeg 自动剪辑（真实成片、时长校验过）
- **口型同步段已接入成片**：配置 `capabilities.lipSync` 供应商后，每个有配音的镜头自动跑对口型（源视频引用 + 音频 base64），对口型片替换原片；失败不致命，回退原片继续出片。分镜脚本还支持 `voiceFile` 直接挂外部配音（真人录音/云 TTS），跳过本地 TTS
- 本地中文配音：macOS `say`，零 key 零费用
- 无 key 也能跑完整 demo：`node scripts/demo.ts`，成片在 `demos/`
- **预置漫剧内容包**：5 套题材（都市逆袭/仙侠/悬疑/甜宠/科幻），每套含双语角色卡+场景卡+分镜，`node scripts/demo-presets.ts <id>` 无 key 全链路出片；`whale_story_presets` 工具一键出流水线脚本
- **自我分析**：`whale_self_audit` 工具 / `npm run self-audit` 扫描项目自身（源码模块/测试数/供应商矩阵/能力清单/差距清单），自动生成 `docs/AUDIT-REPORT.md`——每天 diff 这份报告就是进度日志；本次会话的踩坑复盘沉淀在 [docs/RETROSPECTIVE-2026-08-17.md](docs/RETROSPECTIVE-2026-08-17.md)
- 真插件：装进 DSH 启动无报错；`/dsh-video-studio/health`、`/runs`、`/accounts` 三个路由在线；七个模型工具（whale_story_presets / whale_storyboard / whale_generate_video / whale_optimize_prompt / whale_quality_review / whale_comfyui_workflow / whale_self_audit）；设置页「鲸影」+「鲸影工作台」+「鲸影账号」三个 tab
- 即梦免费档：协议全通，但**文生视频队列长期 SystemBusy**（实测凌晨依然满）——免费策略改为：万相免费文生图出资产图（✅ 实测出真图）→ 即梦图生视频/官方 API 免费额度出视频
- 通义万相免费文生图：实测出过真图（1.28MB 鲸鱼图在 `demos/`）
- 可灵官方、可灵百炼、豆包 Seedance、万相视频（DashScope 官方免费额度）四个适配器写好了，手头没 key，还没跑过真实生成
- **可灵对口型（lip-sync）**：官方 API 3-13 契约适配器写好（audio2video 贴 TTS 音频 / text2video 官方音色），8 个单测覆盖字段映射与状态机——真实调用等 key
- **ComfyUI 本地引擎**：`/prompt→/history→/view` 协议已通（mock 服务器级验证），导演层能把分镜决策直接生成 **ComfyUI workflow JSON**（变量替换+占位校验）——有 GPU 装个 ComfyUI 就是免费无限生成的本地引擎；`whale_comfyui_workflow` 工具离线可见
- **豆包网页版**：真实抓包回放成功——SSE 聊天接口可做 LLM 三段（写小说/拆剧本/分镜），图片 bot 可出资产图；专业版免费额度按 7 天窗口（额度耗尽时图片停、文本继续）
- 可灵网页版：反爬是一次性令牌，协议已存档，自动化需要抓包桥——先搁着

## 安装

```bash
dsh plugin --profile web add github:hackerFish/dsh-video-studio --ignore-workspace-root-check
```

## 许可证

[MIT](LICENSE)
