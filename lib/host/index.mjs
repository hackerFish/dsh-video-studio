// src/host/tools.ts
import { existsSync as existsSync2, readFileSync } from "fs";
import { join } from "path";

// src/prompts/style-dna.ts
function mergePromptLayers({ dna = "", shotTemplate = "", manual = "", injections = "" } = {}) {
  const parts = [dna, shotTemplate, manual].map((s) => String(s ?? "").trim()).filter(Boolean);
  return { positive: parts.join("\uFF0C"), negative: String(injections ?? "").trim() };
}

// src/prompts/templates.ts
var QUALITY_BOOSTERS = {
  // 渲染画质
  ultra: "8K \u8D85\u6E05\uFF0COC \u6E32\u67D3\uFF0C\u6B21\u4E16\u4EE3\u5EFA\u6A21\uFF0C\u7535\u5F71\u7EA7\u67D4\u548C\u8F6E\u5ED3\u5149\uFF0C\u7EDF\u4E0085mm\u7126\u8DDD\uFF0C\u65E0\u7578\u53D8",
  material: "\u7EC6\u817B\u5E03\u6599\u7EB9\u7406\uFF0C\u53D1\u4E1D\u5206\u5C42\u7CBE\u81F4\uFF0CPBR \u6750\u8D28\uFF0C\u6B21\u8868\u9762\u6563\u5C04",
  // 背景
  clean: "\u7EAF\u8272\u7A7A\u767D\u80CC\u666F\uFF0C\u65E0\u9634\u5F71\u65E0\u6742\u7269\uFF0C\u65E0\u591A\u4F59\u5143\u7D20",
  cleanGray: "\u65E0\u591A\u4F59\u5143\u7D20\u7684\u6D45\u7070\u8272\u80CC\u666F\uFF0C\u89D2\u8272\u65E0\u9634\u5F71",
  // 姿态表情
  neutral: "\u4E2D\u6027\u8868\u60C5\uFF08\u65E0\u559C\u6012\u54C0\u4E50\uFF09\uFF0C\u773C\u795E\u5E73\u9759\uFF0C\u81EA\u7136\u7AD9\u7ACB\uFF0C\u53CC\u624B\u81EA\u7136\u4E0B\u5782\uFF0C\u7A7A\u624B\uFF08\u65E0\u624B\u6301\u7269\uFF09\uFF0C\u8EAB\u4E0A\u65E0\u4EFB\u4F55\u80CC\u8D1F\u7269",
  plain: "\u65E0\u591A\u4F59\u52A8\u4F5C\u3001\u65E0\u5938\u5F20\u8868\u60C5\uFF0C\u5E73\u89C6",
  // 负面
  noText: "\u4E25\u7981\u753B\u9762\u51FA\u73B0\u4E0D\u76F8\u5173\u7684\u6587\u5B57",
  // 一致性（三重锁，分别声明）
  consistentFace: "\u6240\u6709\u89C6\u56FE\u9762\u90E8\u7279\u5F81\u4E00\u81F4",
  consistentBody: "\u6240\u6709\u89C6\u56FE\u8EAB\u4F53\u6BD4\u4F8B\u4E00\u81F4",
  consistentOutfit: "\u6240\u6709\u89C6\u56FE\u670D\u88C5\u4E0E\u914D\u9970\u4E00\u81F4"
};
var DEFAULT_BOOSTERS = ["ultra", "material", "neutral", "noText"];
var CHARACTER_SHEET_NEGATIVE = [
  "\u89C6\u56FE\u878D\u5408",
  "\u9762\u677F\u95F4\u7279\u5F81\u6F02\u79FB",
  "\u98CE\u666F\u80CC\u666F\u6C61\u67D3",
  "\u591A\u4F59\u80A2\u4F53",
  "\u624B\u90E8\u7578\u5F62",
  "\u9762\u90E8\u7578\u5F62",
  "\u6C34\u5370",
  "\u7B7E\u540D",
  "\u6587\u5B57",
  "\u4F4E\u5206\u8FA8\u7387",
  "\u8FC7\u5EA6\u9510\u5316",
  "\u80F6\u7247\u9897\u7C92"
];
var GENERIC_NEGATIVE = [
  "\u4F4E\u5206\u8FA8\u7387",
  "\u6A21\u7CCA",
  "\u7578\u53D8",
  "\u591A\u4F59\u80A2\u4F53",
  "\u6C34\u5370",
  "\u7B7E\u540D",
  "\u6587\u5B57",
  "\u8FC7\u5EA6\u9971\u548C"
];
function sections(...blocks) {
  return blocks.map(([label, v]) => v ? `${label}\uFF1A${v}` : null).filter((x) => Boolean(x)).join("\uFF0C");
}
var TEMPLATES = {
  /** 角色设定三视图（v2）：版式标签 + 三重一致性锁 + 可度量锚点 */
  "character-sheet": {
    id: "character-sheet",
    name: "\u89D2\u8272\u8BBE\u5B9A\u4E09\u89C6\u56FE",
    ratios: "16:9 \u6A2A\u7248\u4E09\u89C6\u56FE / 3:4 \u7AD6\u7248\u5806\u53E0 / 1:1 \u8868\u60C5\u7F51\u683C",
    negative: CHARACTER_SHEET_NEGATIVE,
    build: (v) => sections(
      ["\u4E3B\u4F53", "\u5168\u8EAB\u5B8C\u6574\u7ACB\u7ED8\uFF0C" + (v.style ?? "3D \u56FD\u6F2B\u4ED9\u4FA0\u6B21\u4E16\u4EE3\u5EFA\u6A21")],
      ["\u5916\u89C2", [v.hair, v.face, v.body, v.outfit, v.accessory, v.description].filter(Boolean).join("\uFF0C") || void 0],
      ["\u6E32\u67D3", QUALITY_BOOSTERS.ultra + "\uFF0C" + QUALITY_BOOSTERS.material],
      ["\u59FF\u6001", [QUALITY_BOOSTERS.neutral, QUALITY_BOOSTERS.plain, v.pose].filter(Boolean).join("\uFF0C")],
      ["\u5149\u5F71", v.lighting ?? "\u7535\u5F71\u7EA7\u67D4\u548C\u8F6E\u5ED3\u5149"],
      ["\u955C\u5934", v.camera ?? "\u7EDF\u4E0085mm\u7126\u8DDD\uFF0C\u65E0\u7578\u53D8\uFF0C\u5E73\u89C6"],
      ["\u80CC\u666F", QUALITY_BOOSTERS.cleanGray],
      ["\u7248\u5F0F", "\u5DE6\u533A\uFF1A\u89D2\u8272\u6B63\u8138\u7279\u5199\uFF0C\u9762\u90E8\u5360\u6EE1\u5DE6\u533A\uFF0C\u65E0\u8EAB\u4F53\u5165\u955C\uFF1B\u53F3\u533A\uFF1A\u6807\u51C6\u89D2\u8272\u8BBE\u5B9A\u4E09\u89C6\u56FE\uFF0C\u6A2A\u5411\u4F9D\u6B21\u6392\u5217\u4FA7\u89C6\u56FE\u3001\u6B63\u89C6\u56FE\u3001\u80CC\u89C6\u56FE\uFF0C\u4ECE\u5934\u5230\u811A\u5B8C\u6574\u65E0\u906E\u6321"],
      ["\u5EA6\u91CF", "\u4E09\u89C6\u56FE\u89D2\u8272\u9AD8\u5EA6\u4E3A\u753B\u9762\u9AD8\u5EA6\u7684 80%\uFF0C\u4E09\u89C6\u56FE\u9AD8\u5EA6\u7EDF\u4E00"],
      ["\u4E00\u81F4\u6027", [QUALITY_BOOSTERS.consistentFace, QUALITY_BOOSTERS.consistentBody, QUALITY_BOOSTERS.consistentOutfit].join("\uFF1B")],
      ["\u8D1F\u9762", QUALITY_BOOSTERS.noText],
      ["\u753B\u5E45", v.aspectRatio ?? "9:16"]
    )
  },
  /** 场景主图（v2）：环境资产 */
  "scene-master": {
    id: "scene-master",
    name: "\u573A\u666F\u4E3B\u56FE",
    ratios: "16:9 \u7535\u5F71\u5BBD\u5E45",
    negative: GENERIC_NEGATIVE,
    build: (v) => sections(
      ["\u4E3B\u4F53", v.description ?? "\u7A7A\u73AF\u5883"],
      ["\u98CE\u683C", v.style ?? "\u56FD\u98CE\u4ED9\u4FA0\uFF0C\u7535\u5F71\u611F"],
      ["\u6E32\u67D3", QUALITY_BOOSTERS.ultra],
      ["\u5149\u5F71", v.lighting ?? "\u81EA\u7136\u4F53\u79EF\u5149"],
      ["\u6784\u56FE", v.composition ?? "\u7EB5\u6DF1\u900F\u89C6\uFF0C\u4E3B\u6B21\u5206\u660E"],
      ["\u7EA6\u675F", "\u65E0\u4EBA\u7269\u5165\u955C\uFF0C" + QUALITY_BOOSTERS.noText],
      ["\u753B\u5E45", v.aspectRatio ?? "16:9"]
    )
  },
  /** 单镜画面（v2）：分镜提示词 */
  "shot-scene": {
    id: "shot-scene",
    name: "\u5355\u955C\u753B\u9762",
    ratios: "9:16 \u7AD6\u5C4F / 16:9 \u6A2A\u5C4F",
    negative: GENERIC_NEGATIVE,
    build: (v) => sections(
      ["\u4E3B\u4F53", v.description ?? ""],
      ["\u98CE\u683C", v.style ?? ""],
      ["\u6E32\u67D3", QUALITY_BOOSTERS.ultra],
      ["\u5149\u5F71", v.lighting ?? ""],
      ["\u955C\u5934", v.camera ?? ""],
      ["\u6784\u56FE", v.composition ?? "\u666F\u522B\u660E\u786E\uFF0C\u6784\u56FE\u4E3B\u6B21\u5206\u660E\uFF0C\u52A8\u6001\u81EA\u7136"],
      ["\u8D1F\u9762", QUALITY_BOOSTERS.noText],
      ["\u753B\u5E45", v.aspectRatio ?? "9:16"]
    )
  }
};
function applyTemplate(templateId, vars = {}) {
  const t = TEMPLATES[templateId];
  if (!t) throw new Error(`\u672A\u77E5\u6A21\u677F: ${templateId}\uFF08\u53EF\u9009 ${Object.keys(TEMPLATES).join("/")}\uFF09`);
  return t.build(vars);
}
function templateNegative(templateId) {
  const t = TEMPLATES[templateId];
  if (!t) throw new Error(`\u672A\u77E5\u6A21\u677F: ${templateId}`);
  return [...t.negative];
}
function listTemplates() {
  return Object.values(TEMPLATES).map((t) => ({ id: t.id, name: t.name, ratios: t.ratios }));
}

// src/prompts/optimizer.ts
function optimizePrompt(draft, opts = {}) {
  const parts = [String(draft ?? "").trim()];
  const boosters = opts.boosters ?? [...DEFAULT_BOOSTERS];
  const applied = [];
  for (const key of boosters) {
    const b = QUALITY_BOOSTERS[key];
    if (b) {
      parts.push(b);
      applied.push(key);
    }
  }
  if (opts.style && !parts[0].includes(opts.style)) parts.push(`\u98CE\u683C\uFF1A${opts.style}`);
  if (opts.aspectRatio) parts.push(opts.aspectRatio);
  const negative = opts.template ? templateNegative(opts.template) : [...GENERIC_NEGATIVE];
  return { optimized: parts.filter(Boolean).join("\uFF0C"), appliedBoosters: applied, negative };
}

// src/providers/jimeng.ts
import { randomUUID } from "crypto";

// src/provider.ts
function assertProvider(p) {
  for (const m of ["id", "capabilities", "quote", "submit", "status", "fetch", "health"]) {
    if (typeof p[m] === "undefined") {
      throw new Error(`provider ${p?.id ?? "?"} \u7F3A\u5C11\u65B9\u6CD5/\u5B57\u6BB5: ${m}`);
    }
  }
  return p;
}

// src/providers/jimeng.ts
var BASE = "https://jimeng.jianying.com";
var MODEL_KEYS = [
  "dreamina_ic_generate_video_model_vgfm_lite",
  // 免费档（2026-08-16 实测可用）
  "dreamina_ic_generate_video_model_vgfm_3.0",
  // 已退役（ret 2061）
  "dreamina_ic_generate_video_model_vgfm_3.0_pro",
  // 需付费积分（ret 1006）
  "dreamina_ic_generate_video_model_vgfm1.0"
];
var DEFAULT_MODEL_KEY = MODEL_KEYS[0] ?? "";
var DRAFT_VERSION = "3.2.8";
var UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
var uuid = () => randomUUID().replace(/-/g, "");
var gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
function buildJimengDraftContent({ prompt, width, height, resolution = "720p", durationMs = 5e3, modelKey = DEFAULT_MODEL_KEY }) {
  const componentId = uuid();
  const divisor = gcd(width, height);
  const aspectRatio = `${width / divisor}:${height / divisor}`;
  const metricsExtra = JSON.stringify({ enterFrom: "click", isDefaultSeed: 1, promptSource: "custom", isRegenerate: false, originSubmitId: uuid() });
  return {
    extend: {
      root_model: modelKey,
      m_video_commerce_info: { benefit_type: "basic_video_operation_vgfm_v_three", resource_id: "generate_video", resource_id_type: "str", resource_sub_type: "aigc" },
      m_video_commerce_info_list: [{ benefit_type: "basic_video_operation_vgfm_v_three", resource_id: "generate_video", resource_id_type: "str", resource_sub_type: "aigc" }]
    },
    submit_id: uuid(),
    metrics_extra: metricsExtra,
    draft_content: JSON.stringify({
      type: "draft",
      id: uuid(),
      min_version: "3.0.5",
      is_from_tsn: true,
      version: DRAFT_VERSION,
      main_component_id: componentId,
      component_list: [{
        type: "video_base_component",
        id: componentId,
        min_version: "1.0.0",
        metadata: { type: "", id: uuid(), created_platform: 3, created_platform_version: "", created_time_in_ms: Date.now(), created_did: "" },
        generate_type: "gen_video",
        aigc_mode: "workbench",
        abilities: { type: "", id: uuid(), gen_video: {
          id: uuid(),
          type: "",
          text_to_video_params: {
            type: "",
            id: uuid(),
            model_req_key: modelKey,
            priority: 0,
            seed: Math.floor(Math.random() * 1e8) + 25e8,
            video_aspect_ratio: aspectRatio,
            video_gen_inputs: [{ duration_ms: durationMs, first_frame_image: void 0, end_frame_image: void 0, fps: 24, id: uuid(), min_version: "3.0.5", prompt, resolution, type: "", video_mode: 2 }],
            video_task_extra: metricsExtra
          }
        } }
      }]
    }),
    http_common_info: { aid: Number("513695") }
  };
}
var VIDEO_URL_RE = /https:\/\/v[0-9]+-artist\.vlabvod\.com\/[^"\s\\]+/;
function createJimengProvider({ sessionId, timeoutMs = 6e4, fetchImpl = fetch } = {}) {
  if (!sessionId) throw new Error("jimeng: \u7F3A\u5C11 sessionId");
  const headers = {
    Cookie: `sessionid=${sessionId}; sessionid_ss=${sessionId}`,
    Origin: BASE,
    Referer: `${BASE}/ai-tool/video/generate`,
    "Content-Type": "application/json",
    "User-Agent": UA
  };
  const req = async (method, path, data, opts = {}) => {
    let last = {};
    const retryBusy = opts.retryBusy ?? 3;
    for (let attempt = 0; attempt <= retryBusy; attempt++) {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 3e3 * attempt));
      const res = await fetchImpl(`${BASE}${path}`, { method, headers, body: data ? JSON.stringify(data) : void 0, signal: AbortSignal.timeout(timeoutMs) });
      if (!res.ok) throw new Error(`jimeng HTTP ${res.status} ${path}`);
      const j = await res.json();
      last = j;
      if (!(j && j.ret !== void 0 && String(j.ret) !== "0")) return j;
      if (String(j.ret) !== "1014") throw new Error(`jimeng ret=${j.ret} ${j.errmsg ?? ""} ${path}`);
    }
    throw new Error(`jimeng ret=1014 \u91CD\u8BD5\u8017\u5C3D ${path}`);
  };
  const poll = async (jobId) => {
    const j = await req("POST", "/mweb/v1/get_history_by_ids", { history_ids: [jobId] });
    const entry = j?.data?.[String(jobId)] ?? j?.history_list?.[0] ?? null;
    const raw = JSON.stringify(j);
    const url = raw.match(VIDEO_URL_RE)?.[0] ?? null;
    const videoUrl = url ?? entry?.item_list?.find((x) => x?.item_urls || x?.video?.url)?.["item_urls"]?.[0] ?? entry?.item_list?.[0]?.video?.url ?? entry?.video_url ?? null;
    const failed = entry?.failed_item_list?.[0]?.gen_result_data ?? null;
    const status = entry?.task?.status ?? entry?.status ?? (videoUrl ? 30 : 20);
    if (videoUrl) return { state: "done", progress: 1, videoUrl, rawItem: entry };
    if (failed?.result_msg) return { state: "failed", progress: 1, error: String(failed.result_msg), retryable: failed.result_msg === "SystemBusy", videoUrl: null, rawItem: entry };
    if (status === 30) return { state: "done", progress: 1, videoUrl: null, rawItem: entry };
    return { state: "running", progress: null, videoUrl: null, rawItem: entry };
  };
  return assertProvider({
    id: "jimeng",
    capabilities: { textToVideo: true, imageToVideo: true, firstLastFrame: true, lipSync: false, tts: false, image: true, maxDurationSec: 5, resolutions: ["720p"], qualityTier: 3, freeQuota: true, dailyQuota: 66 },
    async quote() {
      return { qualityTier: 3, costEstimate: 0, currency: "jimeng-credits" };
    },
    async health() {
      try {
        const j = await req("POST", "/commerce/v1/benefits/user_credit", {}, { retryBusy: 1 });
        const c = j?.data ?? {};
        return { ok: true, quotaRemaining: (c.gift_credit ?? 0) + (c.purchase_credit ?? 0) + (c.vip_credit ?? 0), detail: c };
      } catch (e) {
        return { ok: false, quotaRemaining: null, error: String(e instanceof Error ? e.message : e).slice(0, 120) };
      }
    },
    async ensureCredits() {
      try {
        const h = await this.health();
        if (h.quotaRemaining !== null && h.quotaRemaining !== void 0 && h.quotaRemaining <= 0) {
          const r = await req("POST", "/commerce/v1/benefits/credit_receive", {});
          return { received: true, remaining: r?.data?.cur_total_credits ?? null };
        }
        return { received: false, remaining: h.quotaRemaining ?? null };
      } catch (e) {
        return { received: false, remaining: null, note: String(e instanceof Error ? e.message : e).slice(0, 100) };
      }
    },
    async submit(_stage, spec) {
      const s = spec ?? {};
      const { positive, negative, width = 720, height = 1280, resolution = "720p", durationSec = 5, modelKey } = s;
      await this.ensureCredits?.();
      const prompt = [positive, negative ? `\uFF08\u907F\u514D\uFF1A${negative}\uFF09` : ""].filter(Boolean).join(" ");
      const body = buildJimengDraftContent({ prompt, width, height, resolution, durationMs: Math.round(durationSec * 1e3), modelKey: modelKey ?? DEFAULT_MODEL_KEY });
      const j = await req("POST", `/mweb/v1/aigc_draft/generate?aigc_features=app_lip_sync&web_version=6.6.0&da_version=${DRAFT_VERSION}`, body);
      const historyId = j?.data?.aigc_data?.history_record_id ?? j?.aigc_data?.history_record_id;
      if (!historyId) throw new Error("jimeng: \u54CD\u5E94\u7F3A\u5C11 history_record_id: " + JSON.stringify(j).slice(0, 300));
      return { jobId: String(historyId) };
    },
    async status(jobId) {
      const p = await poll(jobId);
      return { state: p.state, progress: p.progress, error: p.state === "failed" ? p.error : void 0 };
    },
    async fetch(jobId) {
      const p = await poll(jobId);
      if (!p.videoUrl) throw new Error("jimeng: \u5C1A\u672A\u5B8C\u6210\u6216\u672A\u627E\u5230\u89C6\u9891\u5730\u5740");
      return { outputs: [p.videoUrl], meta: { status: "success" } };
    },
    poll
  });
}

// src/providers/mock.ts
var counter = 0;
var jobs = /* @__PURE__ */ new Map();
function createMockProvider(_opts = {}) {
  return assertProvider({
    id: "mock",
    capabilities: { textToVideo: true, imageToVideo: true, firstLastFrame: false, lipSync: false, tts: false, image: true, maxDurationSec: 5, resolutions: ["720p"], qualityTier: 0 },
    async quote() {
      return { qualityTier: 0, costEstimate: 0, currency: "mock" };
    },
    async submit(_stage, spec) {
      const jobId = `mock-${++counter}`;
      jobs.set(jobId, { state: "done", progress: 1, spec });
      return { jobId };
    },
    async status(jobId) {
      return jobs.get(jobId) ?? { state: "unknown", progress: null };
    },
    async fetch(jobId) {
      const j = jobs.get(jobId);
      if (!j) throw new Error(`mock: unknown job ${jobId}`);
      return { outputs: [], meta: { note: "mock \u8F93\u51FA\uFF0C\u4EC5\u4F9B\u94FE\u8DEF\u9A8C\u8BC1", ...j.spec } };
    },
    async health() {
      return { ok: true, quotaRemaining: Infinity };
    }
  });
}

// src/finalcut/render-ffmpeg.ts
import { spawn } from "child_process";
import { existsSync } from "fs";
import { fileURLToPath } from "url";
function locateFfmpeg() {
  const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
  const base = `${repoRoot}/../_tools/ffmpeg/node_modules/@ffmpeg-installer`;
  const candidates = [
    process.env.DSH_FFMPEG,
    `${base}/darwin-x64/ffmpeg`,
    `${base}/darwin-arm64/ffmpeg`,
    `${base}/linux-x64/ffmpeg`,
    `${base}/linux-arm64/ffmpeg`,
    `${base}/win32-x64/ffmpeg.exe`,
    "ffmpeg"
  ].filter((c) => Boolean(c));
  for (const c of candidates) {
    if (c === "ffmpeg" || existsSync(c)) return c;
  }
  return null;
}
async function probeDurationSec(src) {
  const bin = locateFfmpeg();
  if (!bin) throw new Error("\u672A\u627E\u5230 ffmpeg");
  const p = spawn(bin, ["-i", src], { stdio: ["ignore", "ignore", "pipe"] });
  let err = "";
  p.stderr.on("data", (d) => {
    err += d.toString();
  });
  await new Promise((r) => p.on("close", r));
  const m = err.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!m) throw new Error(`\u65E0\u6CD5\u8BFB\u53D6\u65F6\u957F: ${src}`);
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

// src/host/runs.ts
var runs = /* @__PURE__ */ new Map();
var MAX_RUNS = 20;
function createRun(opts) {
  const rec = {
    id: `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    prompt: opts.prompt,
    provider: opts.provider,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    status: "running",
    events: []
  };
  runs.set(rec.id, rec);
  if (runs.size > MAX_RUNS) {
    const oldest = runs.keys().next().value;
    if (oldest) runs.delete(oldest);
  }
  return rec;
}
function appendEvent(runId, stage, type, detail = null) {
  const rec = runs.get(runId);
  if (!rec) return;
  rec.events.push({ stage, type, detail, at: (/* @__PURE__ */ new Date()).toISOString() });
}
function finishRun(runId, status) {
  const rec = runs.get(runId);
  if (rec) rec.status = status;
}
function listRuns() {
  return [...runs.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
function getRun(id) {
  return runs.get(id);
}

// src/host/tools.ts
function loadConfig() {
  const dshHome = process.env.DSH_HOME ?? join(process.env.HOME ?? "", ".dsh");
  const file = join(dshHome, "whale.json");
  if (existsSync2(file)) {
    try {
      return JSON.parse(readFileSync(file, "utf8"));
    } catch {
    }
  }
  return {
    jimengSessionId: process.env.DSH_JIMENG_SESSIONID ?? null,
    wanx: process.env.DSH_WANX_COOKIE ? { cookieStr: process.env.DSH_WANX_COOKIE, xsrfToken: process.env.DSH_WANX_XSRF ?? "", wanUid: process.env.DSH_WANX_UID ?? "" } : null,
    mock: process.env.WHALE_MOCK === "1"
  };
}
function splitShots(outline, shots) {
  const parts = outline.split(/(?<=[。！？!?])\s*|\n+/).map((s) => s.trim()).filter(Boolean);
  const list = parts.length ? parts : [outline];
  const n = Math.max(1, Math.min(Number(shots) || 5, 12));
  const out = [];
  for (let i = 0; i < n; i++) out.push({ index: i, line: list[i % list.length] ?? "", durationSec: 3 });
  return out;
}
function registerTools(ctx) {
  ctx.tools.register({
    name: "whale_storyboard",
    description: "Split a story outline into a shot list with per-shot prompts (pure local, no quota).",
    parameters: {
      outline: { type: "string", required: true, description: "Story outline/script (shots separated by \u3002 or newlines)" },
      style: { type: "string", required: false, description: 'Style DNA, e.g. "cinematic, deep-sea blue"' },
      shots: { type: "integer", required: false, description: "Target shot count 3-12, default 5" }
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          shots: { type: "array", required: true, items: {
            type: "object",
            additionalProperties: false,
            properties: {
              index: { type: "integer", required: true },
              line: { type: "string", required: true },
              prompt: { type: "string", required: true },
              durationSec: { type: "integer", required: true }
            }
          } }
        }
      },
      render: (_args, value) => [{ type: "text", text: `Storyboard done: ${value.shots.length} shots.` }]
    },
    execute(args) {
      const shots = splitShots(String(args.outline ?? ""), args.shots ?? 5);
      return Promise.resolve({
        shots: shots.map((s) => {
          const base = mergePromptLayers({ dna: args.style ?? "", manual: "" }).positive;
          const opt = base ? optimizePrompt(base, { style: args.style }) : optimizePrompt("\u901A\u7528\u753B\u9762", { style: args.style });
          return { ...s, prompt: opt.optimized };
        })
      });
    }
  });
  ctx.tools.register({
    name: "whale_generate_video",
    description: "Submit a video generation task (jimeng free tier / mock; more providers on the way). Peak hours may return SystemBusy (0 credits consumed) \u2014 retry off-peak.",
    parameters: {
      prompt: { type: "string", required: true, description: "Video prompt" },
      aspect_ratio: { type: "string", required: false, enum: ["16:9", "9:16", "1:1"], description: "Default 9:16" },
      duration_sec: { type: "integer", required: false, description: "3-5 seconds (free tier max 5), default 5" },
      provider: { type: "string", required: false, enum: ["auto", "mock", "jimeng"], description: "Default auto (jimeng when a sessionid is configured)" }
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          ok: { type: "boolean", required: true },
          status: { type: "string", required: true },
          jobId: { type: "string", required: false },
          message: { type: "string", required: true }
        }
      },
      render: (_args, value) => [{ type: "text", text: value.ok ? `Task ${value.jobId ?? ""} ${value.status}: ${value.message}` : `Generation failed: ${value.message}` }]
    },
    timeoutMs: 13e4,
    async execute(args) {
      const cfg = loadConfig();
      const aspect = args.aspect_ratio ?? "9:16";
      const dims = { "16:9": [1280, 720], "9:16": [720, 1280], "1:1": [1024, 1024] };
      const [w, h] = dims[aspect] ?? [720, 1280];
      const durationSec = Math.min(Math.max(Number(args.duration_sec) || 5, 3), 5);
      const run = createRun({ prompt: args.prompt, provider: args.provider ?? "auto" });
      appendEvent(run.id, "story", "prompt", args.prompt);
      appendEvent(run.id, "script", "prompt", args.prompt);
      appendEvent(run.id, "storyboard", "single-shot", { aspect, durationSec });
      if (args.provider === "mock" || args.provider === "auto" && cfg.mock && !cfg.jimengSessionId) {
        const p2 = createMockProvider();
        const { jobId } = await p2.submit("video", { positive: args.prompt });
        appendEvent(run.id, "master-asset", "primary", 0);
        appendEvent(run.id, "shot-assets", "submitted", { jobId, provider: "mock" });
        finishRun(run.id, "done");
        return { ok: true, status: "submitted", jobId, message: "mock provider accepted (placeholder output; configure a real provider for actual generation)" };
      }
      if (!cfg.jimengSessionId) {
        finishRun(run.id, "failed");
        return { ok: false, status: "no-provider", message: 'No jimeng sessionid configured: write {"jimengSessionId":"..."} to $DSH_HOME/whale.json. Peak hours may SystemBusy \u2014 retry off-peak.' };
      }
      const p = createJimengProvider({ sessionId: cfg.jimengSessionId });
      try {
        const { jobId } = await p.submit("video", { positive: args.prompt, width: w, height: h, durationSec });
        appendEvent(run.id, "master-asset", "primary", 0);
        appendEvent(run.id, "shot-assets", "submitted", { jobId, provider: "jimeng" });
        let st = { state: "running", progress: null };
        for (let i = 0; i < 8; i++) {
          await new Promise((r) => setTimeout(r, 1e4));
          st = await p.status(jobId);
          appendEvent(run.id, "video", "polling", { attempt: i + 1, state: st.state });
          if (st.state === "done" || st.state === "failed") break;
        }
        if (st.state === "done") {
          const out = await p.fetch(jobId);
          appendEvent(run.id, "final-cut", "done", { url: out.outputs[0] });
          finishRun(run.id, "done");
          return { ok: true, status: "done", jobId, message: `Video ready: ${out.outputs[0]}` };
        }
        if (st.state === "failed") {
          finishRun(run.id, "failed");
          return { ok: false, status: "failed", jobId, message: `Server failed: ${st.error ?? "unknown"} (free tier SystemBusy at peak consumes 0 credits \u2014 retry off-peak)` };
        }
        return { ok: true, status: "processing", jobId, message: "Still generating (free tier is slow) \u2014 call this tool again to check" };
      } catch (e) {
        finishRun(run.id, "failed");
        return { ok: false, status: "failed", message: String(e instanceof Error ? e.message : e).slice(0, 300) };
      }
    }
  });
  ctx.tools.register({
    name: "whale_optimize_prompt",
    description: "\u628A\u8349\u7A3F\u63D0\u793A\u8BCD\u4F18\u5316\u6210\u4E13\u4E1A\u7EA7\uFF08\u8FFD\u52A0 8K/\u65E0\u9634\u5F71/\u4E2D\u6027\u8868\u60C5/\u4E25\u7981\u6587\u5B57\u7B49\u8D28\u91CF\u589E\u76CA\uFF0C\u53EF\u6307\u5B9A\u98CE\u683C\u4E0E\u753B\u5E45\uFF09\uFF1B\u4E5F\u63D0\u4F9B\u4E13\u4E1A\u6A21\u677F\uFF08\u89D2\u8272\u4E09\u89C6\u56FE/\u573A\u666F\u4E3B\u56FE/\u5355\u955C\u753B\u9762\uFF09\u3002\u7EAF\u672C\u5730\uFF0C\u4E0D\u6D88\u8017\u989D\u5EA6\u3002",
    parameters: {
      prompt: { type: "string", required: true, description: "\u8349\u7A3F\u63D0\u793A\u8BCD" },
      style: { type: "string", required: false, description: '\u98CE\u683C\uFF0C\u5982"3D \u56FD\u6F2B\u4ED9\u4FA0"' },
      aspect_ratio: { type: "string", required: false, enum: ["9:16", "16:9", "1:1"], description: "\u753B\u5E45" },
      template: { type: "string", required: false, enum: ["character-sheet", "scene-master", "shot-scene"], description: "\u53EF\u9009\uFF1A\u5957\u7528\u4E13\u4E1A\u6A21\u677F\uFF08\u89D2\u8272\u4E09\u89C6\u56FE\u7B49\uFF09" }
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          optimized: { type: "string", required: true },
          appliedBoosters: { type: "array", required: true, items: { type: "string" } },
          negative: { type: "array", required: true, items: { type: "string" } },
          templates: { type: "array", required: true, items: {
            type: "object",
            additionalProperties: false,
            properties: { id: { type: "string", required: true }, name: { type: "string", required: true } }
          } }
        }
      },
      render: (_args, value) => [{ type: "text", text: `\u5DF2\u4F18\u5316\uFF08\u589E\u76CA ${value.appliedBoosters.length} \u9879\uFF09\uFF1A${value.optimized.slice(0, 200)}` }]
    },
    execute(args) {
      let draft = String(args.prompt ?? "");
      if (args.template) draft = applyTemplate(args.template, { description: draft, style: args.style, aspectRatio: args.aspect_ratio });
      const r = optimizePrompt(draft, { style: args.style, aspectRatio: args.aspect_ratio });
      return Promise.resolve({ optimized: r.optimized, appliedBoosters: r.appliedBoosters, negative: r.negative, templates: listTemplates() });
    }
  });
  ctx.tools.register({
    name: "whale_quality_review",
    description: "Rule-level QC for a finished video: existence, duration. LLM frame review is not wired up yet.",
    parameters: {
      video_path: { type: "string", required: true, description: "Local path of the finished video" }
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          ok: { type: "boolean", required: true },
          checks: { type: "array", required: true, items: {
            type: "object",
            additionalProperties: false,
            properties: {
              item: { type: "string", required: true },
              status: { type: "string", required: true },
              detail: { type: "string", required: true }
            }
          } },
          note: { type: "string", required: true }
        }
      },
      render: (_args, value) => [{ type: "text", text: value.ok ? "QC passed (rule level)" : `QC failed: ${value.checks.filter((c) => c.status !== "pass").map((c) => c.item).join(", ")}` }]
    },
    async execute(args) {
      const p = String(args.video_path ?? "");
      if (!p) return { ok: false, checks: [{ item: "\u6587\u4EF6\u5B58\u5728", status: "fail", detail: "\u672A\u63D0\u4F9B\u8DEF\u5F84" }], note: "LLM \u62BD\u5E27\u8BC4\u5BA1\u5F85\u63A5\u5165" };
      if (!existsSync2(p)) return { ok: false, checks: [{ item: "\u6587\u4EF6\u5B58\u5728", status: "fail", detail: p }], note: "LLM \u62BD\u5E27\u8BC4\u5BA1\u5F85\u63A5\u5165" };
      const checks = [{ item: "\u6587\u4EF6\u5B58\u5728", status: "pass", detail: p }];
      try {
        const dur = await probeDurationSec(p);
        checks.push({ item: "\u65F6\u957F", status: dur >= 0.5 ? "pass" : "fail", detail: `${dur.toFixed(1)}s` });
      } catch (e) {
        checks.push({ item: "\u65F6\u957F", status: "fail", detail: String(e instanceof Error ? e.message : e).slice(0, 80) });
      }
      return { ok: checks.every((c) => c.status === "pass"), checks, note: "LLM \u62BD\u5E27\u8BC4\u5BA1\u5F85\u63A5\u5165\uFF08\u8BA1\u5212 P2 \u5BFC\u6F14\u558A\u5361\uFF09" };
    }
  });
}

// src/host/index.ts
var name = "dsh-video-studio";
function sendJson(response, status, payload) {
  response.writeHead(status, { "cache-control": "no-store", "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}
function apply(ctx) {
  ctx.inject(["tools"], (toolsCtx) => {
    registerTools(toolsCtx);
  }, "dsh-video-studio: tools");
  ctx.inject(["webServer"], (host) => {
    host.effect(() => host.webServer.register({
      kind: "exact",
      path: "/dsh-video-studio/health",
      handler: async (request, response) => {
        if (request.method !== "GET") {
          response.writeHead(405, { allow: "GET" });
          response.end();
          return;
        }
        sendJson(response, 200, {
          ok: true,
          version: "0.2.0",
          stages: ["story", "script", "storyboard", "master-asset", "shot-assets", "video", "final-cut"],
          providers: ["mock", "jimeng", "tongyi-wanx", "kling", "kling-dashscope", "doubao", "comfyui", "sessionid-http"],
          quotaAccounts: 0
        });
      }
    }), "dsh-video-studio: http route");
    host.effect(() => host.webServer.register({
      kind: "exact",
      path: "/dsh-video-studio/runs",
      handler: async (request, response) => {
        if (request.method !== "GET") {
          response.writeHead(405, { allow: "GET" });
          response.end();
          return;
        }
        const url = new URL(request.url ?? "/", "http://localhost");
        const id = url.searchParams.get("id");
        sendJson(response, 200, id ? getRun(id) ?? { ok: false, error: "run not found" } : { ok: true, runs: listRuns() });
      }
    }), "dsh-video-studio: runs route");
  });
}
export {
  apply,
  name
};
