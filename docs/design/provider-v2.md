# Provider v2 接口规格（鲸影 dsh-video-studio）

- 日期：2026-09-04
- 范围：Provider 接口的下一代能力规格（references 多参考输入 / 参考绑定语法 / 音画一体 / 多轮扩展 / 多镜头 / 可用率报价）
- 性质：**设计文档**。本文落地时只允许修改文档列出的文件，且**不触碰任何既有 v1 适配器的行为**；所有 v1 测试必须保持绿色。
- 约束：纯 TS、零新增依赖、向后兼容 v1（既有测试文件语义不变）、类型定义完整可编译（`tsc --noEmit` 与 `node --test` 为闸门）。

> **事实核查声明（对齐真实 API，检索日期 2026-09-04）**：本章能力字段的取舍对齐了以下可检索到的真实 API 文档，而非凭空设计——
> Seedance 2.5 / 2.0（fal 承载官方模型页 + fal 官方示例仓库）、可灵官方开放平台（kling.ai/document-api，Kling 3.0 & 3.0 Omni）、Kling Omni 文档镜像。检索结论与任务上下文声称有三处出入，**以真实文档为准**并已在 §3 标注：
> 1. 可灵 Omni 的参考绑定语法官方是 `<<<image_1>>> / <<<video_1>>> / <<<element_1>>> / <<<voice_1>>>`（配合 `image_list/video_list/element_list/voice_list`），**不是** `@image1` 形式；`@image_1` 只出现在第三方聚合商文档（GoEnhance）。
> 2. Seedance 2.5 的参考绑定是**按数组位置编号**的 `[Image1]/[Video1]/[Audio1]`（fal 承载页），另一官方示例仓库（fal-ai/seedance-2.0-api）用 `@Image1`；两种都是"位置 = 编号"。
> 3. "4K/10bit、最多 50 参考"：fal 承载的 Seedance 2.5 页只给出 480p/720p（50 参考已证实，见 fal 页原文 "up to 50 multimodal reference inputs"）；4K/10bit 未出现在可检索文档中，标注待 BytePlus/火山方舟付费文档实测。可灵 3.0 Omni 官方/镜像文档有 `mode: std|pro|4k`。
> 因此本文把"绑定语法"设计成 **canonical 记号（鲸影内部统一写法）→ 供应商方言**两层，方言差异全部收在 §5.4 一张表里，供应商侧变化只动一行。

---

## 1. 背景与动机

鲸影目前的 Provider 接口是"纯文本 submit(spec) → 拿视频"的一代抽象：

- 6 方法：`id / capabilities / quote / submit / status / fetch / health`（另可选 `ensureCredits`）。
- `capabilities` 是路由的唯一词汇表（bool/数值混合字典）。
- `route(providers, need, preferCost)` 做能力过滤 + qualityTier 排序。
- 多账号配额池（`quota/scheduler.ts`）只认 `{provider, credential, dailyQuota, qualityTier}`，spec 对池完全不透明（`pooled-provider.ts` 原样透传）。

2026 年的模型（Seedance 2.5、Kling 3.0/Omni、Vidu Q3 等）把输入输出维度整体右移了一代：

| 能力 | v1 现状 | 2026 模型（真实 API 佐证） |
|---|---|---|
| 输入 | 一段提示词文本 | Seedance 2.5：≤50 多模态参考（image_urls/video_urls/audio_urls，位置编号绑定）；Kling 3.0 Omni：image_list/video_list/element_list/voice_list + `<<<…>>>` 绑定 |
| 声音 | 外部 TTS → 外置 lip-sync 通道 | 原生音画一体：Seedance `generate_audio: true`、Kling `sound: on`，单次生成内音视频同步，单文件带音轨 |
| 时长 | 单镜头 3–10s，靠外部拼接 | Seedance 2.5 单次 4–30s（`duration: "4"…"30"`）；参考视频续写（extension 用例） |
| 结构 | 一次一镜 | Kling 3.0 `multi_shot + shot_type: customize\|intelligence`（智能分镜，≤6 镜，逐镜 prompt+duration） |
| 质量 | 按分辨率声明 | Kling 3.0 `mode: std(720p)/pro(1080p)/4k` |

现有纯文本 spec（`positive/negative/width/height/durationSec/aspectRatio`）**吃不到这些能力**，而路由字典里也没有对应的词。本设计把 Provider 接口右移一代，同时**不破坏 v1 生态**。

## 2. 现状盘点（代码事实，2026-09-04 阅读）

### 2.1 src/provider.ts（79 行）

- `ProviderCapabilities`：11 个全可选字段（`textToVideo/imageToVideo/firstLastFrame/lipSync/tts/image/maxDurationSec/resolutions/qualityTier/freeQuota/dailyQuota`）。
- `ProviderQuote { qualityTier, costEstimate, currency }`、`ProviderStatus { state, progress, error? }`、`ProviderFetchResult { outputs: string[], meta?: Record<string, unknown> }`。
- `route()`：`Object.entries(need).every(([k,v]) => !v || p.capabilities[k])` —— 纯"真值存在性"判断。
- `assertProvider<T extends Provider>`：运行时检查 7 个字段存在。

**观察 A（route 的数值语义缺陷）**：`need = { maxDurationSec: 30 }` 时，声明 `maxDurationSec: 10` 的 provider 因 `10` 为真值而被选中——"声明 ≥ 需求"没被保证。v1 测试没用过数值 need 所以没暴露；v2 引入 `maxReferences` 数值后必须修，否则 50 参考任务会被 3 参考的通道接走。

**观察 B（capabilities 声明与实现脱节）**：`kling.ts` 声明 `firstLastFrame: true`，但其 `submit` 的 body 只有 `model_name/prompt/negative_prompt/mode/duration/aspect_ratio`，从不传首尾帧图像——声明超前于实现。v2 迁移后这些旧位**不能被当真**（见 §6 降级矩阵）。

**观察 C（字典外键存在）**：`doubao-web.ts` 的 capabilities 里有 `llm: true`（靠 `as Provider` 断言绕过了对象字面量多余属性检查）。说明能力字典历来是"开放词汇"——v2 扩展字段同理，且必须容忍未知键。

### 2.2 适配器群（src/providers/，11+ 文件）

| 适配器 | 通道 | caps 要点 | spec 读取键（v1 自由格式） |
|---|---|---|---|
| mock | 本地 | 全 false 但 image/textToVideo true, tier 0 | 原样存 spec |
| jimeng | 即梦 web（sessionid，免费） | t2v 等, tier 5, freeQuota | prompt/width/height/durationMs… |
| doubao-web | 豆包网页（cookie，免费） | image/llm 只，非视频 | positive/prompt/text |
| tongyi-wanx | 通义万相 web（cookie） | t2v/i2v, tier 6 | 同族 |
| kling | 可灵官方（JWT，text2video） | t2v/i2v/firstLastFrame, tier 8 | model/prompt/mode/durationSec/aspectRatio |
| kling-dashscope / dashscope-wan | DashScope 异步任务（apiKey） | t2v/i2v/firstLastFrame, tier 7 | model/prompt/mode/aspectRatio/durationSec/audio/watermark |
| kling-lipsync | 可灵官方对口型 | lipSync/tts, tier 8 | mode/videoId/videoUrl/audioUrl/audioBase64/text/voiceId… |
| comfyui / sessionid-http / doubao | 各自通道 | 混合 | — |

三个关键事实：
1. **spec 是自由格式 `Record<string, unknown>`**，每个适配器自己约定读取键。这是 v1 的弹性，也是 v2 扩展的天然载体——新键只是新约定，不破坏任何读键方。
2. 管线（`director/pipeline.ts`）提交镜头时只写 `{ positive, negative, width, height }`（stills/视频）与 `{ mode:'audio2video', audioBase64, videoUrl|videoId }`（口型），**从不引用 capabilities 来决定 spec 形态**；供应商选择发生在账号池 `pick()` 与 `route()`。
3. 口型同步是**外置段**：TTS 先出音频 → 外置 lip-sync 通道（kling-lipsync）→ 主片轨（timeline `addAudio` 本地混音）。Seedance 2.5 / Kling 3.0 一类音画一体通道若接入，编排上存在"模型原生出对话声 + 本地再混一份"的双份成本风险（见 §7 Stage 3 编排规则）。

### 2.3 quote 现状

所有适配器的 quote 都是静态常量 `{ qualityTier, costEstimate, currency }`，spec 无关、通道可用率无关。账号池的失败统计（`consecutiveFailures/cooldownUntil`）存在 scheduler 里，但 provider 实例与池互不相见（池按账号 id 缓存 bound provider）。v2 的 `usabilityRate` 需要一条跨层取值通道（§10 风险 1）。

---

## 3. 2026 供应商真实 API 形态 → v2 字段映射（对齐来源见 §11）

| 供应商/模型 | 真实请求形态（公开文档） | v2 字段映射 |
|---|---|---|
| Seedance 2.5 / 2.0（字节；fal 承载官方模型页） | `image_urls[] / video_urls[] / audio_urls[]`（**数组顺序 = 绑定编号**，提示词用 `[Image1]/[Video1]/[Audio1]`；fal 2.0 官方仓库示例用 `@Image1`）；`generate_audio: true` 单 mp4 原生音；`duration: "4"…"30"`（2.5，2.0 为 4–15）；`resolution: 480p\|720p`；参考视频即"续写/编辑"入口（无独立 continue 参数） | references(三数组顺序序) / audioNative(=generate_audio 语义) / durationSec / multiShot 场景剪切提示（"Cut scene to…"是提示词能力，非独立字段） |
| Kling 3.0 & 3.0 Omni（快手官方 kling.ai/document-api） | `model_name: kling-v3-omni`（image2video 亦支持 `image`+`image_tail` 首尾帧）；`sound: on\|off`（原生音）；`multi_shot: bool` + `shot_type: customize\|intelligence` + `multi_prompt: [{index,prompt,duration}]`（≤6 镜，各镜时长和 = 总时长）；参考素材 = `image_list / video_list[{video_url, refer_type, keep_original_sound}] / element_list[{element_id}](元素库) / voice_list`；提示词绑定 `<<<image_1>>> <<<video_1>>> <<<element_1>>> <<<voice_1>>>`；`mode: std\|pro\|4k`；时长 3–15 | references（映射进 image_list/video_list/voice_list，元素走上传后 element_list）/ audioNative(=sound on) / multiShot(shot_type customize=手动逐镜、intelligence=自动) / firstLastFrame(首尾帧=image+image_tail) / 绑定方言翻译 |
| Kling O1（kling-video-o1，统一多模态） | 与 Omni 共享 `image_list/video_list` 参考字段（镜像/路由文档） | 同上 |
| Vidu Q3 | 智能分镜自动调度景别、主体参考锁角色（**仅见厂商宣传，官方 API 文档本次未能检索到**） | multiShot(自动)/image refs+label —— 标注：接口形态待实测，沿用鲸影"先抓包后固化"经验 |

真实形态与任务上下文出入的**已裁决项**（以真实为准）：
- 绑定语法不是统一的 `@image1`：Seedance(fal) 用位置编号 `[Image1]`，Kling 官方用 `<<<image_1>>>`。→ 设计引入 canonical 记号 + §5.4 方言表，**canonical 记号选择 `@image1` 仅作鲸影内部统一写法**，任何厂商请求体里出现的都必须是翻译后的方言（见 §5.4 测试 #12）。
- Kling 参考素材的"元素"（kling-v3 图生视频）走**元素库**（先上传建元素拿 `element_id`，再 `element_list`），不是每次请求直接塞 URL；Omni 模型（kling-v3-omni/kling-video-o1）才接受直传 `image_list/video_list`。→ 适配器职责：references → 上传/建元素 → 对应列表字段，能力门只管鲸影侧声明，上传失败在 submit 内报错。
- "多轮扩展 180s"：fal 文档中 Seedance 的扩展 = "给一段参考视频描述接下来发生什么"（单次续写），未检索到字节侧"多轮至 180s"的 API 参数；任务上下文所述能力留待 BytePlus 官方文档实测，`continuousExtend` 字段语义按"可基于上一段输出续写（≥1 轮）"定义，不过度承诺轮数与总时长。

---

## 4. 设计目标与铁律

1. **向后兼容 = 只加可选，不动必填**：既有接口的每个字段/方法签名/union 值原样保留；新东西一律可选字段、可选键、新导出。任何"删/改/收窄"都禁止。
2. **v2 不是新方法族，是同一接口上的递进声明**：方法仍是那 6 个；v2 化 = capabilities 显式声明新字段 + 对扩展后的 spec/result/quote 语义负责 + `protocolVersion: 2`。理由：方法族分裂会让调度、测试、审计全线双轨，而且真实厂商 API（§3）恰好也走"同一 endpoint + 更多可选入参"，负载进化优于协议进化。
3. **永不静默降级**：v2 意图（references / 原生音 / 续写 / 多镜头）遇到声明不足的 provider 必须 fail-fast 抛错，绝不允许"忽略引用裸跑"（那等于烧钱出废片）。纯 v1 路径对 spec 不感知，行为与今天逐字节一致。
4. **绑定语法双层化**：管线只写 canonical `@image1/@video1/@audio1`（1 基、按 kind 独立编号、= references 数组内该 kind 的序号）；各家真实记号（`[Image1]`/`<<<image_1>>>`/`<<<element_1>>>`）由适配器经 §5.4 翻译表转换。canonical 记号**永不直接发给厂商**。
5. **渐进声明**：旧适配器今天零改动也"结构上满足 v2"（薄壳 `toV2` 补默认值）；新能力随适配器逐个演进打开，闸门 = typecheck + 全量测试绿。

---

## 5. 类型规格（完整可编译）

### 5.1 src/provider.ts —— 最终形态的完整相关片段（实施时增量落地）

> 原则：以下全部是**新增或可选扩展**。v1 适配器的对象字面量（缺新字段）结构上依然可赋值，`tsc` 不报错；既有测试文件不 import 新符号，语义零变化。

```ts
// —— 新增：版本与引用基础类型 ——
export type ProviderProtocolVersion = 1 | 2

export type ReferenceKind = 'image' | 'video' | 'audio'

/**
 * 一条参考素材。name 为 canonical 短名：image1/image2…、video1…、audio1…（1 基、按 kind 独立编号，
 * 对应各家"数组顺序 = 绑定编号"的约定：Seedance 第 2 张图即 [Image2]/@Image2；Kling 即 <<<image_2>>>）。
 * 提示词里用 @image1 记号引用；references 数组与记号一一对应，由 parseSpec 校验。
 */
export interface ProviderReference {
  name: string
  kind: ReferenceKind
  /** 本地绝对路径或公网 URL。适配器负责上传/建元素（Kling 元素库）或原样透传 URL。 */
  uri: string
  /** 供应商元素体系的语义标签（角色名/景别/voice 等），仅供映射提示，不参与 canonical 绑定。 */
  label?: string
  mime?: string
}

export interface ProviderCapabilities {
  // —— v1 既有 11 字段，原样保留，禁止改动 ——
  textToVideo?: boolean
  imageToVideo?: boolean
  firstLastFrame?: boolean
  lipSync?: boolean
  tts?: boolean
  image?: boolean
  maxDurationSec?: number
  resolutions?: string[]
  qualityTier?: number
  freeQuota?: boolean
  dailyQuota?: number

  // —— v2 新增（全部可选；缺省 = 不支持，与薄壳默认值一致）——
  /** 单次任务最多可承载的 references 总数；0 / 缺省 = 不支持引用。
   *  参考 Seedance 2.5 ≤50、Seedance 2.0 ≤12、Kling Omni ≤3 视频元素 + 若干图（见 §3）。 */
  maxReferences?: number
  /** 支持的引用类型子集；缺省 / 空数组 = 不支持引用。 */
  referenceTypes?: ReferenceKind[]
  /** 音画一体：单次生成内音视频同源同步。true 时 fetch 主视频自带音轨。
   *  对应 Seedance generate_audio / Kling sound=on 语义。 */
  audioNative?: boolean
  /** 多轮扩展/续写：可基于上一段结果继续（Seedance reference-video 续写用例、BytePlus 多轮扩展口径）。 */
  continuousExtend?: boolean
  /** 单次提交产出多镜头/多景别（对应 Kling multi_shot + shot_type: customize|intelligence 智能分镜）。 */
  multiShot?: boolean
  /** 版本号。纯 v1 适配器可以不写（按 1 处理）；声明 2 即承诺兑现 v2 字段语义。 */
  protocolVersion?: ProviderProtocolVersion
}

export interface ProviderQuoteUpgrade {
  /** 升级目标档（质量更高/成本更高）。 */
  toQualityTier: number
  costEstimate: number
  currency: string
  reason?: string
  /** 升级通道对同一 spec 的预估可用率（0..1）。 */
  usabilityRate?: number
}

export interface ProviderQuote {
  qualityTier: number
  costEstimate: number
  currency: string
  // —— v2 可选 ——
  /** 可用率估算 0..1：本次 spec 走该通道能被流水线直接使用的概率
   *  （风控拒绝 / 高峰 SystemBusy / 内容审核 / 时长利用率）。缺省 = 1（v1：不做估算）。 */
  usabilityRate?: number
  /** 失败升级提示：质检/风控失败后建议升到的高成本档与预估成本。 */
  upgrade?: ProviderQuoteUpgrade
  /** 预估产出时长（秒），spec 无显式 durationSec 时供管线评估适配。
   *  注：Seedance 类按"输入视频秒数 + 输出秒数"计费，引用视频越长越贵——本字段与 §10 计费提示配套。 */
  estimatedDurationSec?: number
}

export type AudioCarrier = 'embedded' | 'separate-track' | 'none' | 'unknown'

export interface ProviderTrack {
  kind: 'video' | 'audio' | 'image'
  url: string
  mime?: string
  role?: 'main' | 'audio-only' | 'reference'
  durationSec?: number
  width?: number
  height?: number
  /** video 轨内嵌音轨（embedded）时为 true。 */
  hasAudio?: boolean
}

export interface ProviderStatusDetail {
  /** multi-shot 的子镜头总数/已完成数（对应 Kling multi_prompt ≤6）。 */
  shotCount?: number
  doneShots?: number
  /** 服务端是否还允许继续扩展（多轮余量提示）。 */
  extendable?: boolean
  /** 预计排队秒数。 */
  etaSec?: number
}

export interface ProviderStatus {
  state: 'running' | 'done' | 'failed' | 'unknown'
  progress: number | null
  error?: string
  // —— v2 可选 ——
  detail?: ProviderStatusDetail
}

export interface ProviderSubmitResult {
  jobId: string
}

export interface ProviderFetchResult {
  /** v1 契约：outputs[0] 恒为主视频 URL（Seedance 单 mp4 即此；多镜头/多轨扩展见 tracks）。 */
  outputs: string[]
  meta?: Record<string, unknown>
  // —— v2 可选（v1 适配器不返回，由 summarizeResult 兜底推导）——
  /** 音轨载体：embedded=主视频内嵌 / separate-track=另返回独立音轨 / none / unknown。 */
  audio?: AudioCarrier
  durationSec?: number
  resolution?: string
  tracks?: ProviderTrack[]
}

// Provider 接口本体零改动（方法签名不变）；上述类型全部可选扩展，v1 适配器结构上依然满足。
export interface Provider {
  id: string
  capabilities: ProviderCapabilities
  quote(stage: string, spec: Record<string, unknown>): Promise<ProviderQuote>
  submit(stage: string, spec: Record<string, unknown>): Promise<ProviderSubmitResult>
  status(jobId: string): Promise<ProviderStatus>
  fetch(jobId: string): Promise<ProviderFetchResult>
  health(): Promise<ProviderHealth>
  ensureCredits?(): Promise<CreditEnsureResult>
}
```

`route()` 的数值/数组语义修正（完整替换函数体；行为差异只在新键被使用时出现，v1 测试不受影响）：

```ts
const NUMERIC_MIN_CAPS = new Set(['maxDurationSec', 'maxReferences', 'dailyQuota'])

/** 单键能力匹配：bool/字符串=真值存在性；数值="声明 ≥ 需求"；referenceTypes=需求子集。 */
export function capMatches(key: string, need: unknown, have: unknown): boolean {
  if (!need) return true
  if (key === 'referenceTypes' && Array.isArray(need)) {
    if (!Array.isArray(have)) return false
    return need.every((t) => (have as unknown[]).includes(t))
  }
  if (NUMERIC_MIN_CAPS.has(key) && typeof need === 'number') {
    return typeof have === 'number' && have >= need
  }
  return Boolean(have)
}

export function route(providers: Provider[], need: ProviderCapabilities, preferCost = false): Provider | null {
  const ok = providers.filter((p) =>
    Object.entries(need).every(([k, v]) => capMatches(k, v, p.capabilities[k as keyof ProviderCapabilities])),
  )
  if (!ok.length) return null
  ok.sort((a, b) => {
    const ta = a.capabilities.qualityTier ?? 5
    const tb = b.capabilities.qualityTier ?? 5
    return preferCost ? ta - tb : tb - ta
  })
  return ok[0] ?? null
}
```

> 向后兼容证明：既有测试的 `need` 只含布尔键（`imageToVideo: true` 等）——`capMatches` 走真值分支，排序逻辑原样；数值分支只会在传入数值 need 或 `referenceTypes` 时触发。

### 5.2 新文件 src/provider-v2.ts —— 语义层全文草案

```ts
// Provider v2 语义层：能力收窄类型、spec 解析与绑定校验、能力门（fail-fast）、
// v1 薄壳包装、fetch 结果规范化、厂商方言翻译。
// 依赖：仅 src/provider.ts；零第三方依赖。本文件不要求任何 v1 适配器改动。
import type {
  Provider,
  ProviderFetchResult,
  ProviderQuote,
  ProviderReference,
  ProviderSubmitResult,
  ReferenceKind,
} from './provider.ts'

// ---------- 1. v2 能力收窄与薄壳 ----------

export interface ProviderCapabilitiesV2 extends ProviderCapabilities {
  protocolVersion: 2
  maxReferences: number
  referenceTypes: ReferenceKind[]
  audioNative: boolean
  continuousExtend: boolean
  multiShot: boolean
}

export interface ProviderV2 extends Provider {
  capabilities: ProviderCapabilitiesV2
}

/** v1 适配器薄壳补的保守默认值：引用/音画/续写/多镜头全部"不支持"。 */
const V1_DEFAULTS = {
  protocolVersion: 2 as const,
  maxReferences: 0,
  referenceTypes: [],
  audioNative: false,
  continuousExtend: false,
  multiShot: false,
}

export function isV2Capable(p: Provider): p is ProviderV2 {
  const c = p.capabilities
  return c.protocolVersion === 2 || typeof c.maxReferences !== 'undefined'
}

/**
 * v1 → v2 薄壳：返回补全默认能力的新对象。
 * 绝不改写入参（capabilities 浅拷贝）：同一 v1 适配器实例可能被多处持有/包装。
 */
export function toV2(p: Provider): ProviderV2 {
  if (isV2Capable(p)) return p as ProviderV2
  return { ...p, capabilities: { ...p.capabilities, ...V1_DEFAULTS } } as ProviderV2
}

/** 能力自洽性静态校验：防止"声明了引用数却没声明类型"一类谎言。 */
export function v2CapabilityIssues(caps: ProviderCapabilitiesV2): string[] {
  const out: string[] = []
  const maxRefs = typeof caps.maxReferences === 'number' ? caps.maxReferences : 0
  const kinds = Array.isArray(caps.referenceTypes) ? caps.referenceTypes : []
  if (maxRefs > 0 && kinds.length === 0) out.push('maxReferences>0 但 referenceTypes 为空（无法兑现任何引用）')
  if (maxRefs === 0 && kinds.length > 0) out.push('referenceTypes 非空但 maxReferences=0')
  if (kinds.length > maxRefs && maxRefs > 0) out.push(`referenceTypes(${kinds.length} 类) 超过 maxReferences(${maxRefs}) 承载量`)
  return out
}

// ---------- 2. spec 的 v2 约定键 ----------

/** spec（仍是 Record<string, unknown> 自由格式）里鲸影约定的 v2 键。 */
export const V2_SPEC_KEYS = {
  references: 'references',
  audioNative: 'audioNative',
  continueFrom: 'continueFrom',
  multiShot: 'multiShot',
} as const

// ---------- 3. canonical 绑定记号与 spec 解析 ----------

/**
 * canonical 绑定记号：@image1 / @video2 / @audio1（1 基，按 kind 独立编号，只在鲸影内部流转，
 * 提交前必须经 translatePrompt 转成目标厂商方言——Seedance=[Image1]、Kling=<<<image_1>>>）。
 */
const BINDING_RE = /@(image|video|audio)([1-9][0-9]*)/g

export class V2SpecError extends Error {
  constructor(message: string, readonly specKey?: string) {
    super(message)
    this.name = 'V2SpecError'
  }
}

export class CapabilityMismatchError extends Error {
  constructor(readonly providerId: string, readonly missing: string[]) {
    super(`provider ${providerId} 能力不足，无法兑现 v2 spec 意图: ${missing.join('; ')}`)
    this.name = 'CapabilityMismatchError'
  }
}

export interface V2Spec {
  prompt: string
  negative?: string
  references: ProviderReference[]
  audioNative: boolean
  continueFrom?: string
  multiShot?: { shots?: number; automatic?: boolean }
  durationSec?: number
  aspectRatio?: string
  width?: number
  height?: number
  model?: string
  seed?: number
  /** 原始 spec 透传（含 videoId/audioBase64 等 v1 自由键，供适配器按需读取）。 */
  raw: Record<string, unknown>
}

function num(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined
}
function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined
}

/**
 * 把自由格式 spec 解析成类型化视图 + 校验绑定完整性与 references 结构。
 * - references 元素缺 name 时自动按 kind 顺序编名（image1…）——与各家"数组序=编号"对齐；
 * - 提示词中出现 @imageN 但 references 无同名元素 → V2SpecError（悬空引用）；
 * - 重复 name / 非法 kind / 缺 uri → V2SpecError。
 * 宽松性：允许引用存在而未被 @（作全局风格/主体参考或首帧）。
 */
export function parseSpec(spec: Record<string, unknown>, stage?: string): V2Spec {
  void stage
  const s = spec ?? {}
  const rawRefs = Array.isArray(s[V2_SPEC_KEYS.references]) ? (s[V2_SPEC_KEYS.references] as unknown[]) : []
  const references: ProviderReference[] = []
  const seen = new Set<string>()
  for (const item of rawRefs) {
    if (!item || typeof item !== 'object') throw new V2SpecError('references 元素必须是对象', V2_SPEC_KEYS.references)
    const o = item as Record<string, unknown>
    const kind = o.kind
    if (kind !== 'image' && kind !== 'video' && kind !== 'audio') {
      throw new V2SpecError(`references[].kind 非法: ${String(kind)}（image|video|audio）`, V2_SPEC_KEYS.references)
    }
    const auto = `${kind}${references.filter((r) => r.kind === kind).length + 1}`
    const name = str(o.name) ?? auto
    if (seen.has(name)) throw new V2SpecError(`引用名重复: ${name}`, V2_SPEC_KEYS.references)
    seen.add(name)
    const uri = str(o.uri)
    if (!uri) throw new V2SpecError(`引用 ${name} 缺 uri`, V2_SPEC_KEYS.references)
    references.push({ name, kind: kind as ReferenceKind, uri, label: str(o.label), mime: str(o.mime) })
  }
  const prompt = str(s.positive) ?? str(s.prompt) ?? ''
  for (const m of prompt.matchAll(BINDING_RE)) {
    const name = `${m[1]}${m[2]}`
    if (!seen.has(name)) throw new V2SpecError(`提示词 @${name} 悬空：references 需包含 ${m[1]} 类第 ${m[2]} 个素材`)
  }
  const ms = s[V2_SPEC_KEYS.multiShot]
  const multiShot =
    ms && typeof ms === 'object'
      ? {
          shots: num((ms as Record<string, unknown>).shots),
          automatic: (ms as Record<string, unknown>).automatic === true,
        }
      : undefined
  const audioNative = s[V2_SPEC_KEYS.audioNative] === true
  return {
    prompt,
    negative: str(s.negative),
    references,
    audioNative,
    continueFrom: str(s[V2_SPEC_KEYS.continueFrom]),
    multiShot,
    durationSec: num(s.durationSec),
    aspectRatio: str(s.aspectRatio),
    width: num(s.width),
    height: num(s.height),
    model: str(s.model),
    seed: num(s.seed),
    raw: s,
  }
}

// ---------- 4. 厂商方言翻译（对齐 §3 真实 API 形态） ----------

export type VendorPromptDialect =
  | 'seedance-positional' // [Image1]/[Video1]/[Audio1]（fal 承载 Seedance 2.5 参考页：数组位置 = 编号）
  | 'seedance-at' // @Image1/@Video1/@Audio1（fal-ai/seedance-2.0-api 官方示例仓库形态；BytePlus 侧待实测）
  | 'kling-omni' // <<<image_1>>>/<<<video_1>>>/<<<voice_1>>>（可灵官方 Omni 绑定语法）
  | 'kling-element' // <<<element_1>>>（元素库 element_list；适配器负责上传建元素）

const KIND_CAP: Record<ReferenceKind, string> = { image: 'Image', video: 'Video', audio: 'Audio' }

function kindIndex(name: string, kind: ReferenceKind): number {
  const n = Number(name.slice(kind.length))
  return Number.isFinite(n) ? n : 0
}

/** 生成 canonical 记号 → 厂商方言的映射（@image1 → 对应方言形态）。 */
export function buildBindingMap(dialect: VendorPromptDialect, refs: ProviderReference[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const r of refs) {
    const canonical = `@${r.name}`
    const i = kindIndex(r.name, r.kind) || 1
    switch (dialect) {
      case 'seedance-positional':
        map.set(canonical, `[${KIND_CAP[r.kind]}${i}]`) // [Image1]
        break
      case 'seedance-at':
        map.set(canonical, `@${KIND_CAP[r.kind]}${i}`) // @Image1
        break
      case 'kling-omni':
        map.set(canonical, `<<<${r.kind}_${i}>>>`) // <<<image_1>>>
        break
      case 'kling-element':
        map.set(canonical, `<<<element_${i}>>>`) // 元素库第 i 个上传元素（element_list 顺序对应）
        break
    }
  }
  return map
}

/** 把提示词里的 canonical 记号替换成厂商方言（未命中的记号原样保留）。 */
export function translatePrompt(prompt: string, binding: ReadonlyMap<string, string>): string {
  return prompt.replace(BINDING_RE, (tok) => binding.get(tok) ?? tok)
}

/**
 * 素材 → 厂商列表字段的映射模板（各适配器按自己的 endpoint 实现，下面给三种真实形态的对照）：
 * - Seedance：references 按 kind 拆进 image_urls / video_urls / audio_urls（上传后 URL），
 *   顺序即编号：第 k 张图 = [Imagek] 或 @Imagek；
 * - Kling Omni：video 参考 → video_list[{video_url, refer_type, keep_original_sound}]，
 *   image 参考 → image_list 或 element 上传；audio 对话参考 → voice_list + <<<voice_k>>>（sound=on）；
 * - Kling 元素流：每个"角色/物体"参考先调元素管理 API 上传建元素 → element_list[{element_id}]，
 *   提示词用 <<<element_k>>>，与 kling-v3 image2video 的官方示例一致。
 */

// ---------- 5. 能力门（fail-fast，永不静默忽略） ----------

export interface SpecDemand {
  references: ProviderReference[]
  referenceKinds: ReferenceKind[]
  audioNative: boolean
  multiShot: boolean
  continueFrom?: string
  durationSec?: number
}

export function specDemand(spec: Record<string, unknown>): SpecDemand {
  const v = parseSpec(spec)
  return {
    references: v.references,
    referenceKinds: [...new Set(v.references.map((r) => r.kind))],
    audioNative: v.audioNative,
    multiShot: v.multiShot !== undefined,
    continueFrom: v.continueFrom,
    durationSec: v.durationSec,
  }
}

/** 返回 provider 无法兑现 spec 意图的缺失项列表（空 = 可安全提交）。 */
export function checkCapabilities(p: Provider, demand: SpecDemand): string[] {
  const c = toV2(p).capabilities
  const maxRefs = typeof c.maxReferences === 'number' ? c.maxReferences : 0
  const kinds: ReferenceKind[] = Array.isArray(c.referenceTypes) ? c.referenceTypes : []
  const missing: string[] = []
  if (demand.references.length > 0) {
    if (maxRefs <= 0) missing.push(`references(${demand.references.length} 个素材)——该通道不支持引用`)
    else if (demand.references.length > maxRefs) missing.push(`references(需 ${demand.references.length} ≤ 声明 ${maxRefs})`)
    for (const k of demand.referenceKinds) if (!kinds.includes(k)) missing.push(`referenceTypes 缺 '${k}'`)
  }
  if (demand.audioNative && c.audioNative !== true) missing.push('audioNative(音画一体)')
  if (demand.continueFrom && c.continuousExtend !== true) missing.push('continuousExtend(多轮扩展)')
  if (demand.multiShot && c.multiShot !== true) missing.push('multiShot(单次多镜头)')
  if (demand.durationSec && typeof c.maxDurationSec === 'number' && demand.durationSec > c.maxDurationSec) {
    missing.push(`maxDurationSec(需 ≥${demand.durationSec}, 声明 ${c.maxDurationSec})`)
  }
  return missing
}

/** 提交前能力门：能力不足直接抛错，宁可重路由也不裸跑烧钱。 */
export function assertSpecSupported(p: Provider, spec: Record<string, unknown>): void {
  const missing = checkCapabilities(p, specDemand(spec))
  if (missing.length) throw new CapabilityMismatchError(p.id, missing)
}

/** 能力感知的提交入口：路由后、落库前必须走这里（v1 直接 submit 的旧路径不受影响）。 */
export async function submitV2(p: Provider, stage: string, spec: Record<string, unknown>): Promise<ProviderSubmitResult> {
  assertSpecSupported(p, spec)
  return p.submit(stage, spec)
}

// ---------- 6. quote 与 fetch 规范化 ----------

/** quote 兜底默认值：v1 报价视为可用率 1、无升级提示。 */
export function quoteWithDefaults(q: ProviderQuote): Required<Pick<ProviderQuote, 'usabilityRate'>> & ProviderQuote {
  return { ...q, usabilityRate: q.usabilityRate ?? 1 }
}

const AUDIO_SUFFIX = /\.(mp3|wav|m4a|aac|flac|ogg)(\?|$)/i

/** 由 outputs/meta 兜底推导音轨载体与时长/分辨率。
 *  真实返回对照：Seedance/Kling 音画一体 = outputs[0] 单 mp4（audio:'embedded'）；
 *  可灵/外部对口型 = 单视频轨；本地混音或双输出则 separate-track。 */
export function summarizeResult(r: ProviderFetchResult): {
  audio: 'embedded' | 'separate-track' | 'none' | 'unknown'
  durationSec?: number
  resolution?: string
  tracks: ProviderTrack[]
} {
  const meta = (r.meta ?? {}) as Record<string, unknown>
  const durationSec = num(r.durationSec) ?? num(meta.durationSec) ?? num(meta.duration)
  const resolution = str(r.resolution) ?? str(meta.resolution)
  let audio: 'embedded' | 'separate-track' | 'none' | 'unknown' = 'unknown'
  if (r.audio) audio = r.audio
  else {
    const m = meta.audio
    if (m === 'embedded' || m === 'separate-track' || m === 'none') audio = m
    else if (r.outputs.length >= 2 && AUDIO_SUFFIX.test(r.outputs[1] ?? '')) audio = 'separate-track'
    else if (r.outputs.length === 1) audio = 'unknown'
  }
  const tracks: ProviderTrack[] = r.tracks ? r.tracks : []
  if (!tracks.length) {
    tracks.push({ kind: 'video', url: r.outputs[0] ?? '', role: 'main', hasAudio: audio === 'embedded', durationSec })
    if (audio === 'separate-track' && r.outputs[1]) {
      tracks.push({ kind: 'audio', url: r.outputs[1], role: 'audio-only', durationSec })
    }
  }
  return { audio, durationSec, resolution, tracks }
}
```

> 类型说明：`ProviderCapabilities` 等扩展后仍是**全可选 + 既有字段不变**，因此 src/provider.ts 的既有导出与全部 v1 适配器编译行为不变；`provider-v2.ts` 里的错误类/门函数是运行时新增，不改变任何既有调用。以上两个文件的类型片段合并后可直接编译（`tsc --noEmit`）。

### 5.3 spec 键速查（管线侧书写约定）

| 键 | 类型 | 含义 | 缺省 |
|---|---|---|---|
| `references` | `ProviderReference[]` | 参考素材（图/视频/音频），name 可省略自动编名 | `[]` |
| `audioNative` | `boolean` | 要求原生音画一体（对话声与画面同生成；Seedance `generate_audio` / Kling `sound:on`） | `false` |
| `continueFrom` | `string` | 上一段结果（jobId 或 URL），做续写/扩展 | 无 |
| `multiShot` | `{shots?, automatic?}` | 单次多镜头；shots 数量、automatic=智能分镜（Kling `shot_type: intelligence`） | 无 |

管线侧组装示例（写入 spec 的形态；**canonical 记号只在此层出现**）：

```ts
spec.references = [
  { name: 'image1', kind: 'image', uri: shot.characterAssetPath, label: '女主' },
  { name: 'audio1', kind: 'audio', uri: shot.dialogueTtsPath, label: '对话' },
]
spec.positive = '@image1 保持角色外貌，@audio1 让台词口型与语气同步：她转身望向窗外……'
spec.audioNative = true
```

适配器侧消费范式（v2 适配器统一走 parseSpec + translatePrompt）：

```ts
const v = parseSpec(spec)
// Seedance 2.5 承载形态（fal）：参考按 kind 拆数组、位置即编号
const binding = buildBindingMap('seedance-positional', v.references)
const prompt = translatePrompt(v.prompt, binding) // @image1 → [Image1]
// 上传 v.references 得到 vendor urls → image_urls/video_urls/audio_urls + generate_audio: v.audioNative
// Kling Omni：binding('kling-omni') → <<<image_1>>>，image→image_list，audio(对话)→voice_list
```

---

## 6. 运行时行为契约与降级矩阵

| 场景 | provider 状态 | 行为 |
|---|---|---|
| 纯 v1 管线提交 v1 spec（无 v2 键） | 任意 | 与今天完全一致，新代码零介入 |
| spec 带 references/audioNative 等 v2 意图 | v2 显式声明（protocolVersion 2 且字段齐全） | `submitV2` 放行，适配器兑现（先 translatePrompt 再组厂商 body） |
| spec 带 v2 意图 | v1 适配器（或 v2 但声明不足） | `CapabilityMismatchError` fail-fast；由上层重路由 |
| spec 带 v2 意图 | v1 适配器但直接 `provider.submit`（绕过 submitV2 的旧路径） | 适配器不认键 → 行为同 v1 现状（不保证）。**文档明确**：今后凡"能力路由 + 能力感知提交"必须走 `route → submitV2` 通道 |
| 旧位声明（如 v1 kling `firstLastFrame:true`）被 v2 语义当真 | — | **不成立**：v2 路由只信 `protocolVersion:2` 或新键的显式声明；`toV2` 不给任何旧键附加引用/音频含义（见观察 B） |
| fetch 单文件 mp4（Seedance/Kling 音画一体） | audioNative | outputs[0]，summarize → `audio:'embedded'`, tracks[0].hasAudio=true |
| fetch 双文件（video + 独立音轨） | — | outputs[0]=video, outputs[1]=audio；summarize → `audio:'separate-track'` |
| multi-shot 返回（Kling multi_shot） | multiShot | outputs[0..n-1] 按镜序；tracks 逐轨带 duration/resolution |

能力不足时**宁可 `route` 返回 null / 抛错**，也不允许自动"剥掉引用降级为纯文本"——静默降级会把用户已经付过钱的参考意图悄悄丢掉，且让免费通道烧掉无谓额度。

---

## 7. v1 → v2 迁移策略（分阶段，每阶段以 typecheck + 全量测试为闸门）

**Stage 0 —— 现状冻结（本次设计不改任何代码）**
全部既有测试文件全绿；本文即 Stage 1 的执行依据。

**Stage 1 —— 类型与语义层落地（改 2 个文件 + 新增 1 个测试文件）**
- `src/provider.ts`：按 §5.1 增量（新增类型 + route 数值语义）；既有测试回归通过。
- 新增 `src/provider-v2.ts`（§5.2 全文）：toV2 / parseSpec / 能力门 / submitV2 / summarizeResult / 方言。
- 新增 `test/provider-v2.test.ts`：§9 契约测试 12 条。
- 验证：`npx tsc --noEmit` 绿 + `node --test` 全绿（既有 + 1 新文件）。
- 此阶段**不接线**：没有任何既有调用改走 submitV2。

**Stage 2 —— 能力感知接线（可选开关）**
- `director/pipeline.ts`：当 spec 含 references/audioNative（未来"多参考镜头/原生对话镜头"路径）时走 `route`（need 含 `referenceTypes/audioNative/maxReferences`）→ `submitV2`；纯文本镜头路径不动。
- 该开关默认关闭时，v1 行为逐字节不变；打开后能力不足场景由门抛错暴露而非静默。

**Stage 3 —— 适配器渐进 v2 化（新文件优先，不碰被测试钉住的 v1 文件）**
1. 新增 `src/providers/seedance.ts`：对齐 fal/BytePlus Seedance 2.5 reference-to-video 形态——image_urls/video_urls/audio_urls（上传后 URL，顺序即编号）、generate_audio、duration 4–30、参考视频续写=continuousExtend。capabilities：`maxReferences:50, referenceTypes:['image','video','audio'], audioNative:true, continuousExtend:true, multiShot:false(提示词剪切场景不单列), protocolVersion:2`（分辨率/额度以实际开通的渠道实测校准）。
2. 新增 `src/providers/kling-v3.ts`：对齐可灵官方 image2video/Omni 形态——`<<<image_N>>>`/`<<<element_N>>>` 方言、首尾帧(image+image_tail)、sound=on、multi_shot+shot_type+multi_prompt（≤6 镜）、元素上传(element_list)。capabilities：`maxReferences:按实测元素上限, referenceTypes:['image','video','audio'], audioNative:true, multiShot:true, firstLastFrame:true, protocolVersion:2`。
3. 老适配器**逐个**追加 v2 字段（如 dashscope-wan 可加 `maxReferences:1, referenceTypes:['image']` 兑现其图生视频）——每加一个跑一遍 `v2CapabilityIssues` + 对应 live 测试背书"声明可兑现"。
4. `host/account-providers.ts` / `host/tools.ts` / `selfaudit/matrix.ts` 注册新 id（matrix 与 account-providers 有一一对应测试，须同步）。

**Stage 3 编排规则（音画一体 vs 外置口型段）**：当镜头走 audioNative 通道且对话意图以 audio 引用给出（非本地 TTS 文件）时，跳过外置 lip-sync 段与本地对话 addAudio，用模型原生音轨（`summarizeResult` 得 `embedded`）；质检仍按既有 review 闸门跑。**避免"模型出对话 + 本地再混一份"双份计费**。

**Stage 4 —— 可用率进入调度（可选）**
- quote 的 `usabilityRate` 数据源 = 池内该账号的 `consecutiveFailures / cooldownUntil` 统计（scheduler 已具备）。跨层取值通道见 §10 风险 1。此阶段不动 scheduler 既有选路语义，只在 `PickOptions` 上做可选加权（默认 off）。

---

## 8. 改动点文件级清单

### 8.1 本设计（Stage 1）实际改动

| 文件 | 类型 | 改动内容 | 影响既有测试 |
|---|---|---|---|
| `src/provider.ts` | 修改（纯增量） | 新增 `ProviderProtocolVersion/ReferenceKind/ProviderReference/ProviderQuoteUpgrade/AudioCarrier/ProviderTrack/ProviderStatusDetail`；`ProviderCapabilities` +5 可选；`ProviderQuote` +3 可选；`ProviderStatus` +`detail?`；`ProviderFetchResult` +4 可选；`route()` 换用 `capMatches`（数值/数组语义，布尔路径不变） | `test/provider.test.ts` 回归通过（need 全布尔）；`kling/dashscope-wan/kling-lipsync/jimeng/mock/doubao-web` 各测试构造的 caps/quote/fetch 字面量不受可选扩展影响 |
| `src/provider-v2.ts` | 新增 | §5.2 语义层（约 280 行） | 无（无人 import） |
| `test/provider-v2.test.ts` | 新增 | §9 的 12 条契约测试 | 无（新增文件） |

### 8.2 后续阶段规划改动（本文只记录，不实施）

| 文件 | 阶段 | 改动内容 |
|---|---|---|
| `src/providers/seedance.ts` | 3 | 新增：Seedance 2.5 reference-to-video 适配器（references/audioNative/续写） |
| `src/providers/kling-v3.ts` | 3 | 新增：可灵 3.0 Omni 适配器（<<<>>> 绑定/元素/音画/多镜头） |
| `src/providers/dashscope-wan.ts` 等旧适配器 | 3 | 逐个追加可选 v2 字段（声明必须可兑现） |
| `src/host/account-providers.ts` | 3 | `providerForAccount` switch 注册新 id |
| `src/host/tools.ts` | 3 | gen 工具 `provider` enum 加新 id |
| `src/selfaudit/matrix.ts` | 3 | 供应商矩阵加行（与 account-providers 交叉测试同步） |
| `src/director/pipeline.ts` | 2/3 | v2 spec 镜头走 `route→submitV2`；音画一体编排规则；quote.upgrade 用于质检失败升级 |
| `src/quota/pooled-provider.ts` | 4 | 不改透传语义；可选暴露账号统计供 quote 估算 |
| `src/quota/scheduler.ts` | 4 | 不改 v1 语义；可选 `PickOptions` 加可用率加权（默认 off） |
| `src/accounts/store.ts` | — | 明确不改（账号 schema 与 v2 无涉） |
| `package.json` | — | 明确不改（零新增依赖） |
| `docs/ARCHITECTURE.md` | 1 | Provider 示例块与 capabilities 清单同步 v2 可选字段 |
| `docs/design/provider-v2.md` | — | 本文 |

---

## 9. 契约测试用例清单（node --test 风格，12 条）

目标文件 `test/provider-v2.test.ts`，导入风格与既有测试一致（`node:test` + `node:assert/strict` + `../src/provider.ts` 带 .ts 后缀）。既有测试文件不删不改。

| # | 用例 | 断言要点 |
|---|---|---|
| 1 | **v1 适配器薄壳过 v2 断言**：`toV2(createMockProvider())` | `isV2Capable` 为 true；caps 补全 `maxReferences:0, referenceTypes:[], audioNative:false, continuousExtend:false, multiShot:false, protocolVersion:2`；原 provider 的 caps 引用未被改写（浅拷贝） |
| 2 | **纯 v1 provider 遇 v2 意图 fail-fast**：mock.submit 前跑 `assertSpecSupported(mock, {positive, references:[{kind:'image',uri:'a.png'}]})` | 抛 `CapabilityMismatchError`，missing 含 `references`；**不静默忽略** |
| 3 | **v1 回归**：`submitV2(mock, 'stills', {prompt:'x'})`（无 v2 键） | 正常返回 jobId，status/fetch 与 v1 语义一致 |
| 4 | **绑定解析**：references 2 图 1 音频 + prompt 含 `@image1 @audio1` | `parseSpec` 通过；references 自动编名按 kind 独立（image1/image2/audio1） |
| 5 | **悬空/越界绑定**：prompt 含 `@video2` 而只有 video1 | 抛 `V2SpecError`；重复 name、非法 kind、缺 uri 各有对应断言 |
| 6 | **能力路由（引用类型）**：providers = [Kling 类(image refs only), Seedance 类(image+audio+video, audioNative)]，need `{referenceTypes:['image','audio'], audioNative:true, maxReferences:5}` | 只选 Seedance 类；v1 图文通道被排除 |
| 7 | **能力路由（数值阈值）**：need `{maxReferences:50}` 时声明 50 命中、声明 12 落选（capMatches 数值"声明≥需求"） | route 结果 id 正确；无候选时返回 null（不静默降级） |
| 8 | **路由排序回归**：boolean need 下 qualityTier 高优先、preferCost 反转 | 与 v1 语义一致（旧测试等价场景在本文件复刻） |
| 9 | **能力自洽校验**：`v2CapabilityIssues` 对 `{maxReferences:3, referenceTypes:[]}` / `{maxReferences:0, referenceTypes:['image']}` | 返回对应问题文案；合法声明返回空数组 |
| 10 | **fetch 规范化**：Seedance 形态 `{outputs:[mp4], audio:'embedded', durationSec:30, resolution:'720p'}` 与 Kling 形态 `{outputs:[mp4], meta:{duration:5}}` 各过 `summarizeResult` | 前者 `audio:'embedded', tracks[0].hasAudio=true`；后者 `audio:'unknown', durationSec:5`；双输出（video+audio 后缀）推导 `separate-track` |
| 11 | **quote 扩展与兜底**：v2 quote 返回 `{usabilityRate:0.72, upgrade:{...}}` 经 `quoteWithDefaults` 原样；v1 报价（无新字段）兜底 `usabilityRate:1` | 数值、结构断言 |
| 12 | **厂商方言翻译（对齐真实语法）**：`buildBindingMap` × `translatePrompt`：canonical `@image1 @video1 @audio1` → `seedance-positional` 方言 `[Image1] [Video1] [Audio1]`、`seedance-at` 方言 `@Image1 @Video1 @Audio1`、`kling-omni` 方言 `<<<image_1>>> <<<video_1>>> <<<audio_1>>>` | 逐 token 断言；未命中记号原样保留 |

三条关键用例骨架（其余按表填）：

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createMockProvider } from '../src/providers/mock.ts'
import {
  toV2, isV2Capable, assertSpecSupported, parseSpec, translatePrompt, buildBindingMap,
  CapabilityMismatchError,
} from '../src/provider-v2.ts'

test('v1 适配器薄壳过 v2 断言，且不改写原对象', () => {
  const v1 = createMockProvider()
  const before = v1.capabilities
  const v2 = toV2(v1)
  assert.equal(isV2Capable(v2), true)
  assert.equal(v2.capabilities.maxReferences, 0)
  assert.deepEqual(v2.capabilities.referenceTypes, [])
  assert.equal(v2.capabilities.audioNative, false)
  assert.equal(v1.capabilities === before, true) // 原 caps 引用未被改写
  assert.equal(v1.capabilities.maxReferences, undefined) // 原对象无 v2 键
})

test('纯 v1 provider 遇 v2 意图 fail-fast，不静默忽略', () => {
  const v1 = createMockProvider()
  assert.throws(
    () => assertSpecSupported(v1, { positive: 'x', references: [{ kind: 'image', uri: 'a.png' }] }),
    CapabilityMismatchError,
  )
  assert.throws(() => assertSpecSupported(v1, { positive: 'x', audioNative: true }), CapabilityMismatchError)
  assert.doesNotThrow(() => assertSpecSupported(v1, { positive: 'x' })) // 纯文本依旧放行
})

test('绑定解析与悬空引用拒绝', () => {
  const v = parseSpec({
    positive: '@image1 保持发型，@audio1 对齐台词',
    references: [{ kind: 'image', uri: 'c.png' }, { kind: 'audio', uri: 'd.mp3' }],
  })
  assert.equal(v.references[0]?.name, 'image1')
  assert.equal(v.references[1]?.name, 'audio1')
  assert.throws(() => parseSpec({ positive: '@video2 运镜', references: [{ kind: 'video', uri: 'v.mp4' }] }), /悬空/)
})

test('canonical 记号翻译成真实厂商方言', () => {
  const refs = [
    { name: 'image1', kind: 'image' as const, uri: 'a.png' },
    { name: 'video1', kind: 'video' as const, uri: 'v.mp4' },
    { name: 'audio1', kind: 'audio' as const, uri: 'd.mp3' },
  ]
  const p = '让 @image1 的人物做 @video1 的动作，并 @audio1 说话'
  assert.equal(translatePrompt(p, buildBindingMap('seedance-positional', refs)), '让 [Image1] 的人物做 [Video1] 的动作，并 [Audio1] 说话')
  assert.equal(translatePrompt(p, buildBindingMap('seedance-at', refs)), '让 @Image1 的人物做 @Video1 的动作，并 @Audio1 说话')
  assert.equal(translatePrompt(p, buildBindingMap('kling-omni', refs)), '让 <<<image_1>>> 的人物做 <<<video_1>>> 的动作，并 <<<audio_1>>> 说话')
})
```

运行方式：`node --test test/provider-v2.test.ts`；全量闸门 `node --test`（既有文件全绿）。

---

## 10. 风险与开放问题

1. **能力声明真实性 / 可用率失真（最高风险）**：免费/网页通道（jimeng、doubao-web、tongyi-wanx）的引用上传与风控参数轮换频繁；一旦适配器"声明可兑现"而实际通道不稳，v2 路由会把带 references 的任务导给会烧额度的失效通道。缓解：a) v2 声明必须以 live 测试背书（契约 #9 只查结构自洽，真实兑现靠每适配器实测）；b) 新能力声明默认保守（先 maxReferences=1/2 小步放量）；c) 能力门 fail-fast + quote.upgrade 兜底升级；d) `usabilityRate` 上线前不做路由权重（Stage 4 默认 off）。
2. **旧位声明误导**（观察 B）：v1 若干 caps（kling `firstLastFrame:true` 等）声明超前于实现。v2 语义层必须只信显式 v2 声明，`toV2` 不给旧键附加引用/音频含义——测试 #1/#2 已把这条钉死，但后续适配器作者仍需纪律。
3. **真实厂商方言漂移**：`[Image1]`（fal/Seedance 2.5）、`@Image1`（fal 2.0 仓库）、`<<<…>>>`（可灵官方）并存且文档可能更新落后；BytePlus 官方付费文档本次检索失败（搜索后端两次不可用），Seedance 走字节官方通道时的确切语法与"4K/10bit/多轮至 180s"待实测。缓解：方言全部收在 §5.4 一张表 + 契约 #12 逐 token 钉死，官方文档更新只改一处；适配器上线前用真实 key 小样验证（鲸影既有经验法）。
4. **跨层可用率取值通道未定**：scheduler 有 `consecutiveFailures` 统计，provider 实例与池互不相见。quote 的 usabilityRate 若由 provider 自报，需设计"bound provider ←→ 池统计"的读取口（或先由管线层按账号历史在 quote 外层合成）。本文把该通道留为 Stage 4 开放项，不阻塞 Stage 1–3。
5. **原生音画一体 vs 外置口型段重复计费**：audioNative 通道与既有 TTS→lipSync→addAudio 段的编排重叠（§7 Stage 3 编排规则已给出裁决，落地时需对照真实成本实测确认"跳过外置段"不缺口型质量）。另注意 Seedance 类按"输入视频秒 + 输出秒"计费，引用视频越长越贵——quote 应体现（`estimatedDurationSec`/成本提示），管线默认裁剪参考视频到所需片段。

---

## 11. 附录：真实 API 佐证来源（检索日期 2026-09-04）

- **Seedance 2.5 Reference to Video（fal 承载官方模型页）**：`https://fal.ai/models/bytedance/seedance-2.5/reference-to-video` — "up to 50 multimodal references"、"Reference inputs are addressed positionally in the prompt as `[Image1]` `[Video1]` `[Audio1]`"、`image_urls/video_urls/audio_urls` 数组顺序即编号、`generate_audio`、`duration "4"–"30"`、`resolution 480p/720p`、输入视频按秒计费公式、单 mp4 输出。
- **Seedance 2.5 Image to Video（fal）**：`https://fal.ai/models/bytedance/seedance-2.5/image-to-video` — `image_url`+`end_image_url` 首尾帧、duration 4–30、native audio 说明。
- **Seedance 2.0 API（fal 官方示例仓库）**：`https://github.com/fal-ai/seedance-2.0-api` — reference-to-video 输入 `image_urls/video_urls/audio_urls`（≤9 图/3 视频/3 音频，总 ≤12），提示词 `@Image1/@Video1/@Audio1` 语法、音视频口型/多场景剪切示例。
- **可灵官方开放平台文档（Kling 3.0 & 3.0 Omni / 2.6）**：`https://kling.ai/document-api/`（Get Started Overview：Kling 3.0 & 3.0 Omni = "Synchronized audio-video generation, intelligent storyboarding and element reference"）与 Omni Video Generation / Image to Video 页：`model_name(kling-v3-omni)`、`sound on/off`、`multi_shot + shot_type(customize/intelligence) + multi_prompt(≤6 镜、逐镜 index/prompt/duration、各镜时长和=总时长)`、`image`+`image_tail` 首尾帧、`element_list[{element_id}]` 元素库、`voice_list`、提示词绑定 `<<<element_1>>>/<<<image_1>>>/<<<video_1>>>/<<<voice_1>>>`（≤2500 字）、`mode std/pro`。
- **Kling Omni 文档镜像（语法佐证）**：`https://docs.apimart.ai/en/api-reference/videos/kling-v3-omni/generation` — `<<<image_N>>>` 引用语法与 `image_urls`、`video_list[{video_url, refer_type, keep_original_sound}]`、`multi_shot/shot_type/multi_prompt`、4k 模式。
- **聚合商口径（仅佐证能力存在，不作字段依据）**：GoEnhance `kling-v3-omni` 页（`@image_1/@video_1` 记号）、OrcaRouter 提交说明（`kling/kling-video-o1` 与 `kling/kling-v3-omni` 接受 multi-source 参考字段）。
- **Vidu Q3**：官方 API 文档本次未能检索到；仅见厂商宣传口径（智能分镜/主体参考锁角色）——表中该行标注"待实测"。
- **明确未证实项（任务上下文 vs 真实文档的出入，已在 §3 裁决）**：① Kling Omni 官方绑定是 `<<<…>>>` 而非 `@`；② Seedance fal 侧分辨率只见 480p/720p（"4K/10bit"未见于 fal 文档，疑为 BytePlus 高配档口径）；③ BytePlus/火山方舟官方 Seedance 付费文档本次检索失败（两次搜索后端故障），其"多轮扩展至 180s"确切换口待真实 key 实测。
