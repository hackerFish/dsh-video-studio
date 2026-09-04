# 鲸影 · 仿真人角色资产层设计（Character Assets Layer）

> 状态：设计稿 v2（2026-09，经真实资料检索校准）｜范围：纯设计文档，不改任何 `src` 代码
> 关联代码：`src/assets/library.ts`、`src/canvas/schema.ts`、`src/director/pipeline.ts`、`src/director/stages.ts`、`src/quality/review.ts`、`src/memory/style-genome.ts`、`src/provider.ts`、`src/providers/doubao.ts`
> 约束：零新依赖、纯 TS、类型可编译、画布「客户端可引用模块必须零依赖」约定照旧

---

## 0. 设计依据：2025–2026 公开实践检索摘要

本文不是闭门设计。所有"模型真能锁住什么、参考图怎么喂"的字段取舍均对齐以下公开来源（正文以 [S#] 标注）。检索时间 2026-09。

| # | 来源 | 与本文直接相关的结论 |
|---|---|---|
| S1 | [Seedance 2.0 Consistency 能力页（第三方总结，含官方示例文案）](https://www.seedanceai.cc/capabilities/consistency) | 多参考图示例用 **`@image1/@image2/@image3` 逐图指派职责**（"reference @image2 for the bag's side profile and @image3 for surface material texture"）；**参考强度 70–80% 是甜点**（>85% 僵硬、<60% 漂移）；出现漂移要**用原始参考图 re-anchor**，别用生成帧回灌；高分辨率参考保细节 |
| S2 | [AI Video Character Consistency: The Reference System (2026)](https://aivideosensei.com/guides/consistent-characters-ai-video) | 经 5 角色 12 镜实测：**可用参考组合 = 1 张干净单人正脸 + 1 张全身**；把**四格转面网格直接喂视频模型会诱发单镜多视角伪影**（网格只用于"生成/锁定形象"阶段）；多角度参考在镜头离开正面（¾/侧脸）时显著优于单肖像；**漂移三大元凶 = 在文本里反复描述角色、换掉参考图（哪怕自称"同一个人"也有可见劣化）、缺服装/道具的文字连续性注记**；**换装 = 先出新的锁定参考并对原角色 QC，再开拍**（跳过 QC 是漂移第一成因）；每个项目维护"元素库"：锁定正脸 + 全身 + 纯文本拓扑注记（服装背面等参考图没拍到的东西）；参考图"超过脸部/身体/1-2 套服装后边际递减且可能互相冲突" |
| S3 | [seevio 转 Seedance 2.0 产品页](https://seevio.ai/) | Seedance 2.0 一次最多 **9 图 + 3 视频 + 3 音频** 多模态输入；用自然语言指认任意参考（角色/场景/运镜/动作/音效） |
| S4 | [fal.ai — Seedance 2.0 reference-to-video API（真实请求 schema）](https://fal.ai/models/bytedance/seedance-2.0/reference-to-video) | 真实 API 提示词模式：正文字内嵌 **`@Image1`…`@ImageN`** 令牌绑定参考图（"matching the face and outfit from @Image1"）——@绑定是现行 API 实践而非想象 |
| S5 | [Seedance 2.0 官方页 seed.bytedance.com](https://seed.bytedance.com/en/seedance2_0) | 官方定位：统一多模态架构，支持文本/图像/音频/视频输入，"行业最全的多模态内容参考与编辑能力" |
| S6 | [invideo — Image-to-Video AI 方法（角色一致性流程）](https://invideo.io/blog/image-to-video-ai) | 五步：锁风格 → 压缩成可复用文本块 → **每个角色先建多角度定妆表（front/side/profile/back + 面部特写）再开拍**；"**模型会对定妆表上看不见的细节自行幻觉**（疤痕/配饰只在特写面板展示才跨镜头稳定）"；转面生成前清空角色手里的物体；Seedance 2.0 角色一致性 10/10（Elo≈1343–1351）；可用镜头产率约 1/3（每镜约 3 次生成） |
| S7 | [invideo — 多参考图用法 FAQ](https://invideo.io/faq/how-do-you-use-multiple-reference-images-to-improve-ai) | **每张参考图只干一件事**，分主题分批喂（不是一张 mood board）；**角色外观演进（每场换新配饰）就为该"节拍"单独出一套定妆**，别用一张万能主表；一套 2 人团队用 64 张风格帧锁项目画风 |
| S8 | [OCDevel — AI 视频生成播客：Character Consistency（LoRA vs 参考）](https://ocdevel.com/podcaster/ai-video-generation/e6d4b1b8-a0a1-425c-8680-e92ee595a6b2) | 模型**无状态**：每次生成都重新推导一张"看起来合理"的脸，必须**每次调用都重挂身份锚**；脸漂移三大已证成因 = 参考角度多样性不足、**互相冲突的参考图**、**换服装/换场景语境**；多参考并非越多越好，关键看有没有冲突 cue |
| S9 | [新华网：纳米漫剧流水线（360 集团，工业化漫剧）](https://app.xinhuanet.com/news/article.html?articleId=9c28b283dcea9196d481306b4b48f932) | 国内头部工业化流水线做法：**为角色建立"空间级三视图"、场景四视图**，保证人物/场景/道具**跨镜头、跨剧集**一致性，从根源杜绝"变脸""穿帮"——三视图建档是国内工业化标配 |
| S10 | [知乎：10 大 AI 漫剧一站式平台测评（摘要口径）](https://zhuanlan.zhihu.com/p/2014705987135747333) | 行业痛点三座山（角色一致性为核心）；平台横向：**有戏AI 自报跨集相似度 95%+**、**泡漫走"系统级三视图设定"**、360 纳米漫剧基于视频世界模型的资产记忆。注：正文被反爬，此处仅引用检索摘要可见口径 |
| S11 | [dreampixelforge — Character Turnaround 规范](https://dreampixelforge.com/blog/character-turnaround) | 传统转面标准五视图：front → ¾ front → side(profile) → ¾ back → back；**统一参照线（头顶/眼/下巴/肩/腰/膝/脚）防止转身长高**；各视图姿势/光照/尺度必须一致；逐帧并排查漂移 |
| S12 | [scriptlyai — Turnaround 与 Model Sheet](https://scriptlyai.app/blog/make-character-turnaround-sheet) | 转面只是**角色设定表的一页**；完整设定表还含**表情表（同一张脸：喜/怒/惊）、动作姿势表、细节 callout 与色板标注**——这正是"角色档案"该有的结构 |
| S13 | [CLIP STUDIO Art Rocket — Model Sheets（Julio Robledo）](https://clipstudio.net/how-to-draw/archives/164740) | 专业动画角色设定：头部转面 + 全身转面，先定 front 与 profile（二维定形），再插 ¾ 与 back；五官定位线对齐 |
| S14 | [arcaneportraits — AI 角色参考表提示词实践](https://arcaneportraits.com/learn/character-reference-sheet-ai) | 单图 AI 生成参考表：**逐视图点名**（模糊的"多个角度"会画出多个不同的人）；显式写 "same character"；宽幅构图；**单图可靠容纳 3–4 个视图，更多会互相污染** |

**提炼为六条设计铁律（下文逐条落实）：**
1. **正脸 + 全身是可用锚点组合，转面网格不是**——档案库存"逐角度单图"，给视频模型的参考永远按镜头选 1–2 张，绝不喂整张网格 [S2][S6][S11]。
2. **看不见的细节 = 会被幻觉的细节**——耳饰/疤痕/痣必须给近距离 detail 裁切 [S6][S7]。
3. **每张参考图一个职责**；参考强度落 0.7–0.8；@绑定令牌按序指图 [S1][S4][S7]。
4. **换装/换参考是头号漂移事件**——新 look/era = 先出锁定定妆 + 对原角色 QC，再允许镜头引用；同一连续场景内参考集合不可中途换 [S2][S8]。
5. **档案在剧集（而非镜头）维度存在**；形象演进（换发型/新配饰）按"节拍"建新造型期定妆，跨集复用同一档案文件 [S7][S9][S10]。
6. **模型锁得住的字段靠图，锁不住的字段当管理元数据**——年龄观感/声线这类不能靠文本锁进画面，只做归档与评审锚点（见 §5.2）[S2][S8]。

---

## 1. 背景与目标

2026 年 AI 漫剧/仿真人剧的行业头号痛点是**角色一致性**：同一角色跨镜头、跨集、跨场景必须「不换脸、不换装」，发型、耳饰这类细节点在特写里一崩就穿帮。新一代模型（Seedance 2.x 等）已把**多参考图 @绑定**变成 API 事实（[S4][S5][S3]）：角色定妆照就是生成输入，模型的角色保持能力取决于喂进去的参考图是否规范、绑定是否明确。

鲸影现有一套「资产库主图 + 逐镜变体」的粗粒度一致性机制（`assets/library.ts` + 画布 character/asset 节点复用），存在四个结构性缺口：

1. **定妆照没有结构化**：`Asset` 只有 `masterUrl + variations[]`，分不清正/侧/特写/全身；无法表达"换装锁脸"——没有"服装套(look)"维度。
2. **没有锁定/容差语义**：哪些特征全剧锁死（脸/耳饰）、哪些允许场景换（服装套）无字段承载；评审、提示词、生成三处口径不一。
3. **没有跨集角色档案与引用协议**：管线 `ScriptShot` 不携带角色表；提交给 Provider 的 spec 只有文本，多参考图无类型化通道。
4. **无漂移质检与题材风险闸门**：`reviewShot` 只比较"镜头 vs 镜头自身提示词"，不比较"镜头 vs 定妆档案"；选题时不预警高表演风险题材。

本层设计一个**仿真人角色资产层**：`CharacterProfile`（角色档案）为资产中心，向上服务画布/分镜，向下映射 Provider v2 多参考图 spec，横切一致性质检与题材风险两道闸门。命名与结构对齐行业通行的"三视图/设定表"建档范式 [S9][S10][S12]，但按"逐角度单图 + 按镜选图"落地（[S2] 反网格实证）。

---

## 2. 现状盘点（读码结论）

| 文件 | 现能力 | 与角色资产层的关系 |
|---|---|---|
| `assets/library.ts` | `Asset{id,kind:'character'\|'scene'\|'prop',name,masterUrl,variations[{shotId,url}]}`；`injectReferences()` 把参考图以**纯文本** `名字（参考图: url）` 追加进提示词 | 保留为**通用资产仓**（URL/变体唯一事实源）；角色层以 `assetId` 引用，不替换；文本注入保留为兜底，主通道升级为结构化 `refs` |
| `canvas/schema.ts` | `NodeKind` 含 `character/asset`；数据流 `storyboard → character/asset → asset → video`；`data.meta: Record<string,unknown>` 可扩展；**schema.ts 零依赖**（浏览器 bundle 共用） | 档案与 character 节点经 `data.meta.profileId` 绑定；本层所有被 client import 的模块必须零依赖 |
| `director/pipeline.ts` | 7 段管线；`ScriptShot{line,prompt,durationSec,voiceFile}`；submit spec 仅文本；已接 reviewer/scorebook/pool | 新增**可选** `registry` 注入与 `shot.cast` 解析，缺省行为与现状完全一致（零破坏） |
| `quality/review.ts` | 规则层（文件/时长/抽帧）+ LLM reviewer（`{framePaths,shotPrompt}` → `{score,issues}`）；≤2 分重拍、≥4 晋升 | 扩展 reviewer 输入为「镜头帧 + 档案期望（定妆参考图 + 锁定维度）」双轨漂移检查 |
| `memory/style-genome.ts` | 文件型 JSON 持久化范式：`createX(filePath)` + load/save + `version` + `export()`，零依赖 | **档案库照抄该范式**（`createCharacterRegistry(filePath)`），跨集共用文件 |
| `provider.ts` | `Provider.submit(stage, spec: Record<string,unknown>)`；capabilities 含 `firstLastFrame`；`route()` 按能力选路 | spec 升级为可带 `refs` 数组；capabilities 增补 `refCountMax/refBinding` |
| `providers/doubao.ts` | Seedance 适配器：content 数组 `image_url+text`、`firstLastFrame` 仅 1 张首帧 | 多参考图按「content 多 image_url 按序 + 文本 @token」映射（§6.3），逐供应商实证绑定语法 |
| `docs/` | **不存在 `provider-v2.md`**（全库检索 0 命中） | 本文 §6 的 `refs` 字段即 **v2 引用协议建议基线**；后续落 `docs/design/provider-v2.md` 须对齐 |

**总决策：扩展不替换。** `library.ts` 原地不动当底层仓库；角色资产层是叠加其上的语义层，自身只存档案元数据 + 引用 library 的 assetId 取图。

---

## 3. 核心概念与设计决策

```
┌──────────────────────── 角色资产层（新增 src/character/）────────────────────────┐
│                                                                                  │
│  CharacterProfile 角色档案（跨集唯一；对齐"设定表"结构 [S12][S13]）                    │
│   ├─ identity（硬锁：脸/性别/肤色/体型/声线；载体=单人干净正脸 + 全身锚点 [S2]）        │
│   ├─ eras[] 造型期（era 锁：发型/发色/耳饰；形象演进=新造型期新定妆 [S7]）              │
│   ├─ looks[] 服装套（scene 锁：可在册内换；换装必须先出定妆 + QC [S2]）               │
│   ├─ locks: Record<LockDimension, LockField>   ← 全剧锁定语义总表                     │
│   ├─ expressions?[] 表情基准（动画设定表"表情页"的轻量版 [S12]，特写评审锚点）           │
│   └─ 每张定妆图 = assetId → assets/library.ts（单一事实源）；存单角度图，不存网格 [S2]    │
│                                                                                  │
│  GroupLook 多人同框定妆（双人合影一拍定死，保相对站位/身高差——相对尺寸靠同框照而非文字）   │
│                                                                                  │
│  引用解析 select.ts:  ShotContext{cast,camera,episode,sceneContinuity}             │
│                        → ProviderReference[]（按镜头选 1–2 锚点 + detail + cap）       │
│                                                                                  │
│  质检 lock.ts:        规则轨 preflight + LLM 轨 expectations（帧 vs 定妆逐维判分）      │
│                       漂移落 driftLog → driftMatrix（跨集累计，防"烂账"）              │
│  风险 risk.ts:        题材风险等级 → 选题/分镜双门禁                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
        │ 画布 character 节点 data.meta.profileId / storyboard 连线角色汇入 cast
        ▼
   Provider v2 submit spec: { positive, negative, refs: ProviderReference[] }
        │ Seedance 适配器：refs → content[image_url×N 按序] + 文本 @token 指图 [S1][S4]
        ▼
   生成 → review（帧 vs 档案定妆 双轨漂移检查）→ 通过 / 带负面词重拍
```

**核心决策（摘要）**

1. **档案 = 身份(硬锁) × 造型期(era 锁) × 服装套(场景锁) 三层**，"换装不换脸"从口头约束变数据结构；形象演进按"节拍"开新 era/look，跨集复用同一档案文件（对齐 S7/S9）。
2. **逐角度单图存储 + 按镜选图**，绝不把转面网格当参考喂视频模型（对齐 S2 反网格实证）；角度集对齐行业三视图建档（S9/S10/S11）。
3. **扩展不替换 assets/library.ts**：新层以 `assetId` 引用存量资产，URL 单一事实源留库；画布零改动。
4. **引用协议 = 类型化 `refs`**：`{role,url,profileId,lookId,angle,strength,token,instruction}`；strength 默认 0.75（0.7–0.8 实证甜点 [S1]）；每图一职责 [S7]；无 registry 时行为与现状字节级一致。
5. **漂移质检双轨**：规则轨（装配正确性/换装纪律，提交前拦截）+ LLM 轨（reviewer 注入档案期望，帧 vs 定妆逐维判分）；漂移持久化跨集累计。
6. **题材风险双门禁**：选题（genre 表）+ 分镜（特写占比实测）两次评估；高表演风险题材（现代都市情感）在分镜阶段预警并给规避改写建议。
7. **真锁字段与元数据字段分离**（§5.2）：只有"有参考图可挂"的维度才进生成锁，其余当管理元数据/评审锚，防止设计出模型锁不住的假字段 [S2][S8]。

---

## 4. 类型定义（完整、可编译、纯 TS、零依赖）

> TS 片段合并后可整体编译（已用项目内 typescript `tsc --noEmit --strict` 验证，见附录）。
> 建议落盘：`src/character/types.ts`（纯类型+常量，host/client 双 bundle 可用）。

### 4.1 基础：角度与锁定档位

```ts
// src/character/types.ts（计划新增，本设计稿先行定义）
export type Gender = 'male' | 'female' | 'non_binary' | 'unknown'

/**
 * 定妆照拍摄角度。存储按"单角度单图"，不存转面网格图（网格喂视频模型会诱发
 * 单镜多视角伪影 [S2]）；网格图仅可另存为人工 QC 用 asset，不作为生成参考。
 * detail = 近距离局部裁切（耳饰/疤痕/痣）——模型对定妆上看不见的细节会自行幻觉，
 *          只有近距离展示的细节才能跨镜头稳定 [S6][S7]。
 */
export type CameraAngle =
  | 'front' // 正面平视（身份主锚 [S2]）
  | 'front_closeup' // 面部大特写，双眼清晰（对白/表情/特写镜头用）
  | 'three_quarter' // 四分之三侧（离轴镜头最常崩的角度，必须有参考 [S2]）
  | 'side' // 纯侧面（轮廓/剪影/过场）
  | 'back' // 背面（发型后脑勺/服装背面——"拓扑注记"也覆盖这块 [S2]）
  | 'full_body' // 全身（站姿：体型/服装廓形/比例第二锚 [S2]）
  | 'detail' // 近距离细节裁切（耳饰/颈饰/纹身/痣/疤痕）

export const CAMERA_ANGLES: readonly CameraAngle[] = [
  'front', 'front_closeup', 'three_quarter', 'side', 'back', 'full_body', 'detail',
]

/** 建档推荐核心组：经典转面视图 [S11][S13]。多出的角度图不强求。 */
export const TURNAROUND_CORE: readonly CameraAngle[] = ['front', 'three_quarter', 'side', 'back', 'full_body']

/**
 * 锁定档位：
 *  hard  = 全剧锁死（跨集跨镜不可变，违反即"漂移 break"）
 *  era   = 随造型期锁死（发型/发色/耳饰在一个造型期内恒定；跨期须新建 era + 重出定妆）
 *  scene = 镜头间可换但必须在册（服装套：只允许换到 profile.looks 里登记的 look）
 */
export type LockLevel = 'hard' | 'era' | 'scene'

export interface LockField {
  level: LockLevel
  /** scene 级白名单：允许取值的集合（如 lookId 列表）；空数组 = 允许 profile 内全部注册项 */
  registered?: string[]
  note?: string
}

/** 可锁定特征维度 = 质检/评审逐项检查维度（真锁/元数据见 §5.2）。 */
export type LockDimension =
  | 'face' // 脸型/五官/眼型（全剧硬锁，靠正脸锚 [S2]）
  | 'gender'
  | 'age_appearance' // 年龄观感（模型不能按文本"28岁"锁画面：属元数据维度 [S8]）
  | 'hair_style'
  | 'hair_color'
  | 'earrings'
  | 'wardrobe' // 服装（套）——scene 级可变维度
  | 'body_type'
  | 'skin_tone'
  | 'style' // 整体美术风格（写实度/画风/光影基调；风格帧 + 文本块锁 [S6]）
  | 'voice' // 声线（TTS voice id 维度，不属视频模型——元数据维度）

export const HARD_DIMENSIONS: readonly LockDimension[] = ['face', 'gender', 'skin_tone', 'body_type', 'voice']
export const ERA_DIMENSIONS: readonly LockDimension[] = ['hair_style', 'hair_color', 'earrings', 'age_appearance', 'style']
export const SCENE_DIMENSIONS: readonly LockDimension[] = ['wardrobe']

/** 各维度中文标签（重拍负面词/评审 issue 落中文提示用）。 */
export const DIMENSION_LABEL_ZH: Record<LockDimension, string> = {
  face: '脸型五官', gender: '性别特征', age_appearance: '年龄观感',
  hair_style: '发型', hair_color: '发色', earrings: '耳饰',
  wardrobe: '服装', body_type: '体型', skin_tone: '肤色',
  style: '美术风格', voice: '声线',
}

/** 建档默认锁定表：身份五维硬锁，外观随 era，服装在册可换。 */
export function defaultLocks(): Record<LockDimension, LockField> {
  return {
    face: { level: 'hard', note: '脸型/五官/眼型全剧不可变（载体：单人干净正脸）' },
    gender: { level: 'hard' },
    skin_tone: { level: 'hard' },
    body_type: { level: 'hard', note: '剧情性身材变更须新建档案' },
    voice: { level: 'hard' },
    hair_style: { level: 'era' },
    hair_color: { level: 'era' },
    earrings: { level: 'era', note: '有标志性耳饰须给 detail 近距离定妆，否则特写会幻觉变形' },
    age_appearance: { level: 'era', note: '元数据维度：跨期须开新 era + 重出定妆参考' },
    style: { level: 'era' },
    wardrobe: { level: 'scene', note: '换装须在 profile.looks 在册集合内，先定妆后引用' },
  }
}
```

### 4.2 身份 / 造型期 / 服装套

```ts
/** 年龄段观感（如跨集长大/变老，用 min~max 且随 era 演进）。仅管理/评审锚点。 */
export interface AgeAppearance {
  min: number
  max: number
  displayNote?: string // "看起来 25~28"
}

/** 身份硬锁块：全剧不可变。描述要具体可验证（结构特征 > 形容词），供评审对图比对。 */
export interface IdentityBlock {
  faceShape: string // 瓜子脸/圆脸/方下颌…
  faceFeatures: string // 眼型/鼻梁/唇形/眉骨/瞳色
  eyeShape: string // 杏眼/桃花眼/凤眼 + 眼神质感
  skinTone: string
  bodyType: string
  heightCm: number
  distinguishingMarks: string[] // 痣/疤/胎记/酒窝——评审最易抓的锚点，须有 detail 图支撑
}

/** 造型期：一个发型/发色/耳饰组合的锁定区间（含剧集范围）。形象演进=新造型期新定妆 [S7]。 */
export interface LookEra {
  id: string
  name: string // "E1·第1-3集 黑长直"
  fromEp: number
  toEp: number | null // null = 连载中未定
  hairStyle: string
  hairColor: string
  earrings: string | null // null = 本造型期无耳饰；否则给形态+颜色（特写评审按文本核对 detail 图）
  hairAccessories?: string
  note?: string
}

export interface LookImage {
  angle: CameraAngle
  assetId: string // → assets/library.ts 的 Asset.id（kind 含 'character'）
  caption?: string // 提示词/审查备注，如 "林越 常服A 正面"
  note?: string // 例如 "左耳 银色水滴耳坠"
}

/** 服装套：一个可整体调用的造型单元，含多角度定妆图。同一角色 look 之间的脸必须来自同一定妆底模。 */
export interface Look {
  id: string
  name: string // "常服A" "晚礼服" "校服"
  eraId: string // 挂到哪个造型期
  outfit: {
    name: string
    kind: string // daywear|evening|uniform|ancient|fantasy|sport|business…
    descriptor: string // 完整服装描述（提示词注入）；评审逐条可对
    palette?: string[] // 主色板，防色偏
  }
  images: LookImage[] // 建档门槛：≥1 front + ≥1 full_body；建议 front_closeup/three_quarter
  accessories?: string[] // 该套配饰清单
  /** 拓扑注记：参考图没拍到的面（服装背面/内侧/耳饰背面/道具反侧）——缺了会逐镜重置为模型默认 [S2] */
  topologyNote?: string
}

export interface CharacterVoice {
  timbre: string
  pitch?: string
  accent?: string
  ttsVoiceRef?: string // 跨集配音供应商 voice id（防声线漂移；属 TTS 域，非视频模型）
  lipSyncNote?: string
}

/** 表情基准表（动画设定表"表情页"的轻量版 [S12]）：特写/情绪戏时作为评审锚点。 */
export interface ExpressionRef {
  emotion: string // neutral/smile/anger/sorrow…
  assetId: string // front_closeup 定妆
  note?: string
}

/** 档案主接口。series 维度支持"一套档案多集复用"；nameTokens 是 @绑定别名。 */
export interface CharacterProfile {
  id: string // ch-<slug>-<rand6>，跨集不变（参考图中途换源本身即漂移事件 [S2]）
  name: string // 全剧唯一显示名
  nameTokens: string[] // @绑定别名：["林越","NingLin"]
  gender: Gender
  ageAppearance: AgeAppearance
  roleType: 'protagonist' | 'supporting' | 'antagonist' | 'featured' | 'extra'
  series: string
  description: string // 一句话人设（供写作/分镜引用；不再逐镜复述外貌 [S2]）
  identity: IdentityBlock
  voice: CharacterVoice
  eras: LookEra[]
  looks: Look[]
  expressions?: ExpressionRef[]
  locks: Record<LockDimension, LockField>
  style: {
    artGenre: string // 都市写实 / 3D 国漫写实 / 古风玄幻…
    realism: 'photoreal' | 'semi_real' | 'stylized_3d' | '2d_anime' | 'unrealistic'
    palette?: string[]
  }
  defaultLookId: string
  createdAt: string // ISO
  updatedAt: string
}
```

### 4.3 多人同框定妆（GroupLook）

```ts
/**
 * 双人/多人同框定妆：一拍定死，绑定多个档案的同框合影。
 * 依据：相对尺寸/身高差靠同框照锚定——文字级相对描述（"高他半头"）跨镜必漂 [S2]；
 *       双锁定参考同时同框是各模型有记录的断裂点 [S2][S8]。
 * 用途：同框/wide 镜头优先 group 参考 + 每人 front；无 group 且 >3 人 → 预检告警。
 */
export interface GroupLook {
  id: string // gl-<slug>-<rand6>
  name: string // "林越×陆沉 对峙"
  profileIds: string[] // ≥2，顺序=画面主次
  assetId: string // 同框合影 Asset.id
  relativeNote: string // "女 165cm / 男 185cm，站位左女右男"（生成期逐镜重复该硬 cue）
  createdAt: string
}

export const MULTI_CAST_CAP_DEFAULT = 3 // 一镜最多绑 3 个有名有姓的角色（超过转群演/通用 extras 池）
export const REFS_CAP_DEFAULT = 4 // 默认参考硬上限（实测：脸/身体/1-2 套服装之外边际递减并互相冲突 [S2][S8]）
export const REF_STRENGTH_DEFAULT = 0.75 // 参考强度甜点 0.7~0.8；>0.85 僵硬、<0.6 漂移 [S1]
```

### 4.4 引用协议：镜头上下文 → Provider v2 refs

```ts
/** 分镜/镜头声明的演员表（ScriptShot.cast / storyboard 连线角色解析产物）。 */
export interface CastRef {
  profileId: string
  lookId?: string // 缺省 → defaultLookId（或该 sceneContinuity 上一镜已用 look）
  role: 'lead' | 'support' | 'background_visible' // 同框主次
  emotion?: string // 情绪提示（命中 profile.expressions 时作评审锚）
}

export type ShotCamera =
  | 'closeup' // 面部/局部特写
  | 'medium' // 中景（腰上）
  | 'full' // 全景单人
  | 'wide' // 大远景/群像
  | 'over_shoulder' // 过肩对切
  | 'group' // 双人及以上同框

/** 镜头生成上下文：解析 refs 的唯一输入。sceneContinuity 用于拦截"同场景无声换装"。 */
export interface ShotContext {
  shotId: string
  episode?: number
  camera: ShotCamera
  subjects: CastRef[] // 有序：index 0 = 画面主体
  sceneContinuity?: string // 连续场景 id：同一 id 内参考集合不可中途更换 [S2]
  wardrobeIntent?: 'same' | 'change_announced' // 显式声明换装（跨场景合法切换，须先出定妆+QC）
  keywords?: string[] // 风险分类器输出的特写类关键词
}

/** Provider v2 参考图角色。identity/full_body 为双锚（[S2] 实证组合），其余是条件增强。 */
export type ReferenceRole =
  | 'identity' // 身份正脸锚（单人干净正脸）
  | 'face' // 面部特写参考（front_closeup）
  | 'full_body' // 全身锚（体型/服装廓形/比例 [S2]）
  | 'outfit' // 纯服装参考（与身份解耦场景：背影/虚化/服装单拍）
  | 'detail' // 近距离细节（耳饰/疤痕 detail 裁切 [S6][S7]）
  | 'group' // 同框定妆合影
  | 'first_frame' | 'last_frame' // 首/尾帧延续

export interface ProviderReference {
  role: ReferenceRole
  url: string
  profileId?: string
  lookId?: string
  angle?: CameraAngle
  /** 参考强度 0~1，默认 0.75；实测 0.7~0.8 甜点 [S1] */
  strength?: number
  /** @绑定令牌：适配器按此把图指进文本（Seedance 实况为 "@image1..N" / 名字 token [S1][S4]） */
  token?: string
  /** 该图单独任务说明（每图一职责 [S7]），如 "此图用于耳饰形态与颜色" */
  instruction?: string
  caption?: string
}

/**
 * Provider v2 提交流 spec（本设计定义；若后续落 docs/design/provider-v2.md 须对齐本字段）：
 * submit('video' | 'shot-assets', ShotGenerateSpec)
 * refs 有序：主锚在前（identity/full_body），detail/group 在后。
 */
export interface ShotGenerateSpec {
  positive: string
  negative?: string
  refs: ProviderReference[]
  width: number
  height: number
  durationSec?: number
  aspectRatio?: string
  castSignature?: string // 本镜演员签名（profileId 拼接），审计/漂移对账用
}
```

### 4.5 档案库（注册表，持久化范式同 style-genome）

```ts
export interface CharacterRegistryData {
  version: number
  series: string // 档案文件归属项目
  profiles: CharacterProfile[]
  groupLooks: GroupLook[]
  driftLog: DriftLogEntry[] // §8.3；跨集累计
}

export interface CharacterRegistry {
  readonly filePath: string
  upsert(profile: CharacterProfile): void // 校验见 validateProfile；同名 token 冲突 throw
  addGroupLook(g: GroupLook): void // profileIds 存在且 ≥2
  byId(id: string): CharacterProfile | undefined
  byNameToken(token: string): CharacterProfile | undefined
  bySeries(series: string): CharacterProfile[]
  activeEra(profile: CharacterProfile, episode: number): LookEra | undefined
  resolveCast(cast: CastRef[], episode: number): { refs: ProviderReference[]; warnings: string[] }
  logDrift(entry: DriftLogEntry): void
  export(): CharacterRegistryData
  list(): CharacterProfile[]
}
```

---

## 5. 锁定/容差总表 与「模型真能锁住什么」

### 5.1 锁定语义总表

| 维度 | 档位 | 规则 | 可变容差（允许） | 违反判定（break） |
|---|---|---|---|---|
| face 脸型五官 | hard | 全剧锁死 | 表情/角度/光影 | 五官比例、脸型轮廓改变 |
| gender 性别 | hard | 全剧锁死 | — | 性别特征漂移 |
| skin_tone 肤色 | hard | 全剧锁死 | 色温打光下的明暗 | 肤色基调改变 |
| body_type 体型 | hard | 全剧锁死 | 服装遮盖、姿势 | 胖瘦/身高比例明显改变 |
| voice 声线 | hard | 全剧锁死 | 情绪语气 | 配音音色/口音切换（TTS 域管理） |
| hair_style 发型 | era | 造型期内锁死 | 风吹/湿发等物理态 | 造型期内换发型 |
| hair_color 发色 | era | 造型期内锁死 | 光影下的明度 | 色相改变 |
| earrings 耳饰 | era | 造型期内锁死 | 视线角度下的形变 | 形状/颜色/有无改变；特写漏挂 detail → 预检告警 |
| age_appearance 年龄观感 | era | 每期恒定 | 妆容浓淡 | 跨期未开新 era 就显老/显小（元数据维度） |
| style 美术风格 | era | 每期恒定 | 场景光照 | 写实度/画风突变 |
| wardrobe 服装 | scene | 在 `looks[]` 在册内切换 | 换在册 look（须声明） | 未登记服装；同 sceneContinuity 无声换装 |

### 5.2 「模型真能锁住什么」——真锁 vs 元数据（诚实表）

按 [S2][S6][S8] 的实证口径，视频模型能锁的是"图里看得到的"，锁不住"文本里描述的"。据此把字段分成两类，避免设计出模型锁不住的假字段：

| 维度 | 锁的载体 | 类型 | 依据 |
|---|---|---|---|
| 脸型五官/性别/肤色 | 单人干净**正脸**锚图（直拍角度最好） | 真锁 | [S2][S6] |
| 发型/发色 | 正脸 + ¾ + side 多角度组（离轴镜头单肖像必崩） | 真锁 | [S2] |
| 耳饰/疤痕/痣 | **近距离 detail 裁切**（远景尺寸的细节会被幻觉） | 真锁 | [S6][S7] |
| 服装廓形/颜色/套 | 每套 **full_body** 锚 + 拓扑注记文本（服装背面等） | 真锁 | [S2][S7] |
| 体型/身高比例 | full_body 锚；同框相对尺寸靠 **GroupLook 合影** | 真锁 | [S2] |
| 画风/写实度 | 风格帧 + 可复用风格文本块 | 真锁 | [S6] |
| 参考强度 | 0.7–0.8（>0.85 僵硬、<0.6 漂移） | 参数 | [S1] |
| 年龄观感 | **锁不住**：模型不从"28 岁"文本锁画面，只能由脸/肤/全身参考间接呈现 | 元数据+评审锚 | [S8] |
| 声线 | **不属于视频模型域**：锁在 TTS voice id / 配音选角 | 元数据（voice 域） | — |
| 半秒级微表情层级/泪点/眼神戏 | **现模型失败高发带**（脸在微笑/转头/换表情时漂移有文档记录） | 题材风险规避（§9） | [S8] |

> 推论：locks 表里标"元数据"的维度不参与"生成强制锁"，只做评审期望与排期管理；参与生成锁的维度必须能解析出参考图 URL，否则 `preflight` 直接 error（宁可缺参考也别假装锁了）。

### 5.3 建档硬性门槛（`validateProfile`）

1. 每个 look ≥1 `front` + ≥1 `full_body`；面部特写多的角色建议补 `front_closeup` 与 `three_quarter` [S2][S11]。
2. 有耳饰等配饰且锁为 hard/era 的，所在 look 须含 `detail` 裁切图并 `note` 注明内容（"左耳 银色水滴耳坠"）[S6]。
3. **同 look 多角度图必须自洽**（建档评审项：各角度脸/服装一致）——转面图组要求姿势/光照/尺度统一（[S11] 参照线法），不一致的图组不得 upsert。
4. 每个 look 填 `topologyNote`（服装背面/道具反侧等图里没有的信息）[S2]。
5. 换 look/era 的纪律：**新 look 先出定妆、与 default look 的 front 过建档 QC，然后才允许被镜头引用**（QC 缺失 = 漂移第一成因 [S2]）；upsert 会检查 reference 集的稳定性并记 changelog。

---

## 6. 引用协议与 Provider v2 对接

### 6.1 三个装配层

1. **脚本/分镜声明**：`ScriptShot` 未来增可选 `cast?: CastRef[]`、`camera?: ShotCamera`、`sceneContinuity?: string`（本设计不落码，仅协议）。storyboard 经画布连到 character 节点的角色汇入 `cast`。
2. **解析层**：`resolveShotReferences(ctx, registry)` → `{refs, warnings}`。规则（全部依据见 §0）：
   - 每个主体角色**至多两张锚**：`front_closeup`/`front`（身份锚）+ `full_body`（比例/服装锚）[S2]；closeup 镜只出 face 锚。
   - closeup 且该 look 有 `detail` 图 → 追加 detail（耳饰/疤痕防幻觉 [S6]）。
   - group/wide 且 subjects ≥2：优先 GroupLook + 每人 front；无 GroupLook → warning。
   - 总数超 `min(vendor.refCountMax, REFS_CAP_DEFAULT)` → 按主次截断并 warning；**默认不因 vendor 上限大就多喂**（>4 边际递减/互冲 [S2][S8]）。
   - **同一 sceneContinuity 内参考集合不可中途更换**（换源=漂移事件 [S2]）；换装只允许经 `wardrobeIntent:'change_announced'` 且新 look 已 QC。
3. **提交层**：`ShotGenerateSpec{..., refs}` 直传 `provider.submit(stage, spec)`。

### 6.2 画布与资产库融合（不替换）

- `library.ts` 继续做 URL/变体仓库；角色层每张定妆图的 `assetId` 指向其中 `kind:'character'` 的 Asset。
- 画布 character 节点 `data.meta.profileId` 绑定档案；storyboard→character 既有连线不废。
- 换装 = 档案层换 `lookId`，不新增 asset 变体流；`AssetVariation` 仍留给场景图等用途。
- assetId 悬空 → 解析层 throw（宁可少参考也不绑错）。

### 6.3 Seedance 适配映射（对齐现有 doubao.ts content 结构 + 实测绑定语法）

现有 `doubao.ts` 已把 `s.imageUrl` 映射为 content 单个 `image_url`。多参考图版本：refs 依序展开为 content 的多个 `image_url`，文本里用 `@token` 指图（Seedance 公开示例即 `@image1/@image2/…` [S1]，fal API 实测 `@Image1..N` [S4]；`@名字` 由我方 nameTokens 注入，仍以"图序+令牌"双保险对齐 vendor）：

```ts
// 适配器内（示意，非本层代码）
const content: Array<Record<string, unknown>> = []
for (const r of refs) content.push({ type: 'image_url', image_url: { url: r.url } })
const lines = refs
  .map((r) => `${r.token ?? r.caption ?? ''}${r.instruction ? `（${r.instruction}）` : ''}`)
  .join('、')
content.push({ type: 'text', text: `${spec.positive}；角色与服装与参考图保持一致：${lines}` })
```

- **capabilities 增补建议**（Provider 层，未来实现）：`refCountMax?: number`（Seedance 2.0 实况约 9–12 图 / 2.5 多媒体上限更高 [S3][S6]，按适配器实测声明）、`refBinding?: 'image_order'|'token'|'first_frame'`、`multiChar?: boolean`。
- **参考强度**：适配器支持时透传 `refs[].strength`（默认 0.75 [S1]）；不支持则忽略并在 warnings 注明。
- **逐供应商实证门禁**：落地每个适配器前用「两张不同人脸 + @token」做 A/B，确认绑定方式与上限再放量（§12 风险 1）。

### 6.4 向后兼容

管线**未注入 registry / 镜头无 cast 时行为与现状完全一致**（spec 无 refs，Provider 忽略之）。角色资产层是纯增量协议。

---

## 7. 画布 schema 融合点（设计说明，非本次改动）

- character 节点：`data.meta.profileId: string`；`data.meta.lookIds?: string[]`（分镜可用套）。
- storyboard 节点：`data.meta.cast?: CastRef[]`；生成优先取 `meta.cast`。
- 不新增 NodeKind、不改连线规则，类型系统零冲击。
- `schema.ts` 零依赖约束：本层 `types/select/lock/risk.ts` 同为纯模块，host/client 均可 import；`registry.ts`（node:fs 持久化）限 host 侧。

---

## 8. 一致性质检：双轨漂移检测（quality/review 层）

### 8.1 轨一：规则轨（装配正确性 + 换装纪律，提交前拦截，零视觉成本）

`preflightShot(shot: ShotContext, profiles)` → `RuleFinding[]`（error 拦截、warn 记录）：

| code | 级别 | 检查 |
|---|---|---|
| `REF_PROFILE_MISSING` | error | cast.profileId 档案不存在 |
| `REF_LOOK_MISSING` | error | lookId 不在该档案 looks |
| `REF_IMAGE_MISSING` | error | 所选 look/角度无 assetId 或 asset 悬空 |
| `REF_IMAGE_UNQUALIFIED` | error | 真锁维度解析不出参考 URL（§5.2 诚实表） |
| `REF_CLOSEUP_NO_FACE_REF` | error | closeup 主体缺 front_closeup/front 参考 |
| `REF_DETAIL_MISSING` | warn | closeup + hard/era 耳饰锁但该 look 无 detail 图 [S6] |
| `REF_SET_UNSTABLE` | error | 同一 sceneContinuity 相邻镜参考集合变化且未声明 [S2] |
| `WARDROBE_SILENT_CHANGE` | error | 同 sceneContinuity 相邻镜 lookId 变化未声明 `change_announced` |
| `WARDROBE_UNREGISTERED` | error | 文本出现未登记服装描述（粗检，LLM 轨兜底） |
| `NEW_LOOK_NO_QC` | error | 引用一个从未与 default look 过建档 QC 的新 look [S2] |
| `CAST_OVER_CAP` | warn | subjects > MULTI_CAST_CAP_DEFAULT |
| `REFS_OVER_CAP` | warn | refs 超 vendor 上限（自动按主次截断） |
| `GROUP_MISSING_FOR_WIDE` | warn | ≥2 角色 wide/group 镜无 GroupLook（建议补同框定妆） |

### 8.2 轨二：LLM 视觉轨（帧 vs 定妆档案）

现状 reviewer 只拿 `{framePaths, shotPrompt}`。扩展协议（不传 expectations 则行为不变）：

```ts
/** 评审期望：把锁定维度 + 定妆参考图交给视觉评审逐项对图。 */
export interface DriftExpectation {
  profileId: string
  dims: LockDimension[] // 只放本镜要盯的维度（特写=face/hair_style/earrings…）
  refUrls: string[] // 定妆参考（该 look 的 front/closeup/detail…）
  refCaptions?: string // "林越 常服A front；左耳 银色水滴耳坠"（评审按文本核对 detail）
}

export interface DriftReviewVerdict {
  score: number // 1~5（沿用现有阈值：≤2 重拍，≥4 晋升）
  issues: { dim: LockDimension; severity: 'minor' | 'break'; message: string }[]
}

export type DriftReviewer = (opts: {
  framePaths: string[]
  shotPrompt: string
  expectations: DriftExpectation[] // 新增
}) => Promise<DriftReviewVerdict>
```

**判分规则（评审结果后处理，纯函数）：**
1. 任一 `break`（face/发型/耳饰/服装套等锁维漂移）→ **无条件重拍**，无视总分。
2. `minor` → 计入总分降权。
3. 重拍负面词自动生成：`（与定妆参考保持一致：${profile.name} 的${DIMENSION_LABEL_ZH[dim]}不可改变）`。
4. 通过后抽 1 帧与期望 refUrls 一并写 `driftLog`，供跨集趋势（§8.3）。
5. 命中 `shot.cast[].emotion` 且 profile 有对应 `ExpressionRef` → 把该表情图加入 expectations（表情表做评审锚 [S12]）。

### 8.3 漂移账本（driftLog / driftMatrix）

```ts
export type DriftSeverity = 'ok' | 'minor' | 'break'
export interface DriftLogEntry {
  at: string // ISO
  episode?: number
  shotId?: string
  profileId: string
  dim: LockDimension
  severity: DriftSeverity
  refUrls: string[]
  framePath?: string
  source: 'rule' | 'llm'
  note: string
}
/** 跨集漂移累计矩阵：profile × dim → 命中次数。季复盘/成片质检输入。 */
export interface DriftMatrixRow {
  profileId: string
  dim: LockDimension
  breaks: number
  minors: number
  lastAt: string
}
export function driftMatrix(log: DriftLogEntry[]): DriftMatrixRow[] {
  const rows = new Map<string, DriftMatrixRow>()
  for (const e of log) {
    const key = `${e.profileId}\u0000${e.dim}`
    const row = rows.get(key) ?? { profileId: e.profileId, dim: e.dim, breaks: 0, minors: 0, lastAt: e.at }
    if (e.severity === 'break') row.breaks += 1
    else if (e.severity === 'minor') row.minors += 1
    row.lastAt = e.at
    rows.set(key, row)
  }
  return [...rows.values()]
}
```

规则轨、LLM 轨、日志共用 `defaultLocks()`/`DIMENSION_LABEL_ZH` 同一枚举，口径不漂。

---

## 9. 题材风险等级（选题 / 分镜双门禁）

### 9.1 依据

- **高表演风险**：现代都市情感/家庭伦理/职场情感——面部特写、对白、微表情、眼泪戏占比高；而"脸在微笑/转头/换表情时漂移"是有文档记录的现模型失败带 [S8]，微表情层级与泪点恰是文本锁不住、参考也难逐帧锁的区域。人脸越清晰越暴露。
- **安全区**：玄幻/仙侠/神魔/大场面——法光、奇观、远景动作、长袍面具遮蔽人脸；角色辨识靠服装发饰道具（恰是参考图能锁的部分），人脸瑕疵被画面信息量稀释。
- **中间带（可控）**：都市逆袭打脸、悬疑、古装宅斗——冲突强但可压缩特写占比换取安全（鲸影默认样本即属此类，对照 `createDefaultCanvas`）。

### 9.2 风险表（genre 维度）

| genre 标签 | 等级 | faceCloseupBudget | 理由与对策 |
|---|---|---|---|
| 现代都市情感 / 家庭伦理 / 都市爱情 | high | 0.15 | 微表情对白戏占比天然高（§9.1）。中景对切、道具遮挡（酒杯/雨伞/扇）、背影/剪影替代流泪特写、台词改旁白+肢体语言 |
| 职场情感 / 都市悬疑 / 古装宅斗 | caution | 0.30 | 冲突戏可控；悬疑眼神戏用氛围光半遮（低照度稀释细节），宅斗用扇/帕遮挡 |
| 都市逆袭 / 豪门复仇 | caution | 0.30 | 打脸戏=台词+反应镜头，改双人中景对切 |
| 古风武侠 / 权谋 | caution | 0.30 | 打戏动作多，特写留给道具（剑/令牌）而非人脸 |
| 玄幻 / 仙侠 / 神魔 | safe | 0.50 | 法光大场面兜底；特写预算宽但同样用锁定参考 |
| 大场面战争 / 异界冒险 | safe | 0.50 | 远景为主 |

### 9.3 评估函数（纯逻辑，关键词粗检，无 LLM 依赖）

```ts
export type GenreRiskLevel = 'safe' | 'caution' | 'high'
export interface GenreRiskRule {
  level: GenreRiskLevel
  faceCloseupBudget: number // 0~1：特写/近景镜头上限占比
  reasons: string[]
  mitigations: string[] // 分镜改写建议
  keywords: string[] // genre 命中词
}
export const GENRE_RISK_TABLE: Record<string, GenreRiskRule> = {
  '现代都市情感': { level: 'high', faceCloseupBudget: 0.15, reasons: ['对白+微表情+眼泪戏占比高；微笑/表情/转头时的脸漂移是现模型记录在案的失败带 [S8]'], mitigations: ['中景对切为主', '道具遮挡（酒杯/雨伞/扇）', '流泪/情绪高潮用背影/剪影转场', '台词改旁白', '肢体语言强化'], keywords: ['都市', '情感', '婚姻', '家庭', '爱情'] },
  '都市职场': { level: 'caution', faceCloseupBudget: 0.3, reasons: ['冲突靠台词反应镜头，特写可控'], mitigations: ['双人中景对切', '特写留给签字/股权书等道具'], keywords: ['职场', '商战', '总裁'] },
  '都市悬疑': { level: 'caution', faceCloseupBudget: 0.3, reasons: ['眼神戏是刚需，需氛围光辅助'], mitigations: ['眼神特写加低照度/半遮', '阴影稀释细节'], keywords: ['悬疑', '推理', '刑侦'] },
  '都市逆袭': { level: 'caution', faceCloseupBudget: 0.3, reasons: ['鲸影默认样本题材（createDefaultCanvas）；打脸=台词+反应，可中景化'], mitigations: ['打脸戏双人中景', '戒指/协议等道具特写替代人脸特写'], keywords: ['逆袭', '复仇', '打脸'] },
  '玄幻': { level: 'safe', faceCloseupBudget: 0.5, reasons: ['法光大场面兜底，辨识靠服装发饰（参考图能锁的部分）'], mitigations: [], keywords: ['玄幻', '仙侠', '修仙', '神魔', '异界'] },
}

/** 关键词粗检特写类镜头数（无 LLM 兜底；后续可换语义计数）。 */
export const FACE_CLOSEUP_PATTERN = /特写|近景|面部|脸(?!红)|眼神|流泪|泪水|哭|对视|表情|微笑|皱眉|微表情|嘴/
export function countFaceCloseup(prompts: string[]): number {
  return prompts.filter((p) => FACE_CLOSEUP_PATTERN.test(String(p ?? ''))).length
}

export interface RiskAssessment {
  genre: string
  level: GenreRiskLevel
  closeupRatio: number // 实际镜头占比
  budget: number
  pass: boolean // closeupRatio <= budget
  warnings: string[]
  mitigations: string[]
}

export function assessTopicRisk(genre: string, shotPrompts: string[]): RiskAssessment {
  const rule = GENRE_RISK_TABLE[genre] ?? { level: 'safe' as GenreRiskLevel, faceCloseupBudget: 0.5, reasons: [], mitigations: [], keywords: [] }
  const closeupRatio = shotPrompts.length ? countFaceCloseup(shotPrompts) / shotPrompts.length : 0
  const pass = closeupRatio <= rule.faceCloseupBudget
  return {
    genre, level: rule.level, closeupRatio, budget: rule.faceCloseupBudget, pass,
    warnings: [
      ...(pass ? [] : [`特写镜头占比 ${(closeupRatio * 100).toFixed(0)}% 超过 ${genre} 预算 ${(rule.faceCloseupBudget * 100).toFixed(0)}%`]),
      ...rule.reasons,
    ],
    mitigations: rule.mitigations,
  }
}
```

### 9.4 门禁接入点（stages.ts 语义，不落码）

- **选题 gate（story→script）**：genre 标签跑一次 `assessTopicRisk(genre, [])`，high/caution 即警示并把 mitigations 注入写作提示词（先写戏再躲特写，成本最低）。
- **分镜 gate（storyboard→master-asset）**：用真实分镜 prompt 列表重算 closeupRatio；`!pass` 且 gate=auto → 事件带改写建议；gate=ask/manual 时询问（复用现有 gate 机制）。改写建议：「第 N 镜（特写）建议改中景+道具遮挡」「高水位角色特写后移/剪除」。

---

## 10. 多角色同框规则

同框（2+ 锁定参考同时出现）是各模型记录在案的断裂点 [S2][S8]，规则如下：

| 场景 | 参考装配 | 规则/风险 |
|---|---|---|
| 双人同框（medium/wide） | 每人 front 1 张（lead 高权重）+ 可选 GroupLook | 无同框合影时站位/身高差靠模型猜 → 优先 GroupLook [S2] |
| 对切 over_shoulder（实为单人镜） | 说话方 face/identity + 对方 front 低权重在场 | 勿把两人都上大特写（双特写=双份脸崩风险） |
| 三人及以上群像 | 每人 front，超 cap 截断；核心冲突只留 1 主体 | >MULTI_CAST_CAP_DEFAULT → 群演处理（路人不上档案，用通用 extras 池） |
| 双人特写聚焦一人 | 主体 front_closeup + detail；另一人仅 front 低权重 | 背景角色别抢参考权重 [S7 每图一职责] |
| 大远景群像 | 0 张档案参考，纯场景 | 远景人脸不可辨，绑了反而污染 |
| 相对尺寸表述 | 一律以 GroupLook 合影为准，配文字"女165/男185 站位左女右男" | 文字级相对描述跨镜必漂 [S2] |

**装配顺序（resolveShotReferences 内部）**：lead → support → group → detail；超限从 support 开始降权截断，动作全部进 warnings（管线事件可审计）。

---

## 11. 落地文件清单与实施顺序（后续执行，本文仅设计）

```
src/character/
  types.ts        # §4 全部纯类型+常量+defaultLocks()/DIMENSION_LABEL_ZH（零依赖，双 bundle）
  registry.ts     # §4.5 createCharacterRegistry(filePath)：node:fs 持久化，范式同 style-genome（host 侧）
  select.ts       # §6 引用解析：resolveShotReferences / resolveCast / 角度选择 / cap 截断（纯函数）
  lock.ts         # §8 规则轨 preflightShot / driftMatrix / validateProfile 建档校验（纯函数）
  risk.ts         # §9 assessTopicRisk / countFaceCloseup / GENRE_RISK_TABLE（纯函数）
test/
  character.test.ts      # 类型装配/角度选择/cap 截断/无声换装/换源拦截（node --test 沿用现有风格）
  character-risk.test.ts # 风险阈值 + 特写关键词计数

docs/design/
  provider-v2.md  #（建议另起）Provider v2：spec.refs + capabilities 增补 + 各供应商 @绑定 实证记录
```

依赖方向：`types ← registry/select/lock/risk`；`types` 不 import 任何 fs/网络模块；registry/select/lock/risk 不 import 画布 UI。

**落地顺序**：M0 = types.ts + registry.ts + 单测（读写/校验/在册换装约束/建档 QC 门）；M1 = select.ts + preflight 接入管线装配（registry 可选注入，零破坏）；M2 = DriftReviewer expectation 协议 + driftLog/矩阵 + 题材风险双门禁；M3 = GroupLook 拍摄流程 + Provider 各适配器 @绑定 实证。

**验收门禁（每步）**：`npm run typecheck` 与 `node --test` 通过；新模块满足"纯 TS / 零新依赖 / host-client 分层"；`refs` 空时与旧 spec 字节级等价（向后兼容单测）。

---

## 12. 风险与未决项

| # | 风险 | 缓解 |
|---|---|---|
| 1 | **供应商 @绑定语义漂移**：Seedance 2.x 的 @imageN/名字 token 绑定方式与参考数上限随版本变（2.0 ≈9–12 图，2.5 多媒体上限更高，来源口径不一 [S3][S6][S2]） | 适配器落地前用「两张不同人脸 + @token」A/B 实证；capabilities.refCountMax/refBinding 显式声明；实证结论回填 provider-v2.md |
| 2 | **建档自毒**：Seedream 生成的定妆图组本身多角度不自洽（正脸像 A 侧脸像 B），成为参考即污染源 | 建档期强制转面自洽 QC（姿势/光照/尺度统一 [S11]）+ LLM 轨对图；不过关不得 upsert |
| 3 | **LLM 视觉轨依赖注入式 reviewer**：review.ts 的 reviewer 可为空，纯规则轨抓不到"长得像不像" | expectation 协议先行；无 reviewer 如实标注"仅装配轨"，不假装已查语义 |
| 4 | 档案版本/剧集演进：era 边界依赖 ep 号，连载中 toEp=null 可能越界 | activeEra 取"fromEp ≤ ep 且 (toEp=null 或 ep ≤ toEp)"的最后一个；边界变化记 changelog |
| 5 | 无 `provider-v2.md` 先例（检索确认不存在），refs 字段是单方面基线 | 本文即 v2 字段基线，后续 provider-v2.md 必须对齐，禁止另起炉灶 |
| 6 | 同框本质是"单模型硬拼多人"，失败率高，GroupLook 需额外拍摄成本 | 装配层先锁规则（cap 3 + 优先同框合影 + 大远景零参考），把失败挡在提交前 |
| 7 | 行业情报时效（S1/S3/S6/S10 等第三方页 + 部分反爬） | 定稿前核对官方/一手来源；适配器实证结果才是最终依据 |

---

## 附录 A：来源 URL 清单

- S1 https://www.seedanceai.cc/capabilities/consistency （第三方能力总结；含官方示例文案）
- S2 https://aivideosensei.com/guides/consistent-characters-ai-video （生产实测：参考系统 2026）
- S3 https://seevio.ai/ （Seedance 2.0 多模态参考上限）
- S4 https://fal.ai/models/bytedance/seedance-2.0/reference-to-video （真实 API schema 与 @ImageN 提示词）
- S5 https://seed.bytedance.com/en/seedance2_0 （Seedance 2.0 官方）
- S6 https://invideo.io/blog/image-to-video-ai （多角度定妆表方法）
- S7 https://invideo.io/faq/how-do-you-use-multiple-reference-images-to-improve-ai （每图一职责/节拍定妆）
- S8 https://ocdevel.com/podcaster/ai-video-generation/e6d4b1b8-a0a1-425c-8680-e92ee595a6b2 （脸漂移成因）
- S9 https://app.xinhuanet.com/news/article.html?articleId=9c28b283dcea9196d481306b4b48f932 （新华网：纳米漫剧流水线，空间级三视图）
- S10 https://zhuanlan.zhihu.com/p/2014705987135747333 （10 大 AI 漫剧平台测评；正文反爬，仅检索摘要口径）
- S11 https://dreampixelforge.com/blog/character-turnaround （转面五视图与参照线规范）
- S12 https://scriptlyai.app/blog/make-character-turnaround-sheet （转面 vs 设定表：表情表/姿势表/细节标注）
- S13 https://clipstudio.net/how-to-draw/archives/164740 （CLIP STUDIO Art Rocket：专业模型表制作）
- S14 https://arcaneportraits.com/learn/character-reference-sheet-ai （AI 参考表提示词实践）

## 附录 B：验证记录

- 本文 §4/§5.3/§8.3/§9.3 的 TS 片段已合并为临时文件，用项目内 typescript 以 `tsc --noEmit --strict --target ES2022 --module ESNext --moduleResolution Bundler` 验证通过（无 import、零依赖、严格模式）。
- 全文未修改任何 `src` 代码；`docs/design/` 为本设计稿新增目录。
