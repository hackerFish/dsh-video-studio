// src/host/tools.ts
import { existsSync as existsSync2, readFileSync } from "fs";
import { join } from "path";

// src/prompts/style-dna.ts
function mergePromptLayers({ dna = "", shotTemplate = "", manual = "", injections = "" } = {}) {
  const parts = [dna, shotTemplate, manual].map((s) => String(s ?? "").trim()).filter(Boolean);
  return { positive: parts.join("\uFF0C"), negative: String(injections ?? "").trim() };
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
    }
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
        shots: shots.map((s) => ({ ...s, prompt: mergePromptLayers({ dna: args.style ?? "", manual: "" }).positive || "\uFF08\u672A\u6307\u5B9A\u98CE\u683C\uFF09" }))
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
      if (args.provider === "mock" || args.provider === "auto" && cfg.mock && !cfg.jimengSessionId) {
        const p2 = createMockProvider();
        const { jobId } = await p2.submit("video", { positive: args.prompt });
        return { ok: true, status: "submitted", jobId, message: "mock provider accepted (placeholder output; configure a real provider for actual generation)" };
      }
      if (!cfg.jimengSessionId) {
        return { ok: false, status: "no-provider", message: 'No jimeng sessionid configured: write {"jimengSessionId":"..."} to $DSH_HOME/whale.json. Peak hours may SystemBusy \u2014 retry off-peak.' };
      }
      const p = createJimengProvider({ sessionId: cfg.jimengSessionId });
      try {
        const { jobId } = await p.submit("video", { positive: args.prompt, width: w, height: h, durationSec });
        let st = { state: "running", progress: null };
        for (let i = 0; i < 8; i++) {
          await new Promise((r) => setTimeout(r, 1e4));
          st = await p.status(jobId);
          if (st.state === "done" || st.state === "failed") break;
        }
        if (st.state === "done") {
          const out = await p.fetch(jobId);
          return { ok: true, status: "done", jobId, message: `Video ready: ${out.outputs[0]}` };
        }
        if (st.state === "failed") return { ok: false, status: "failed", jobId, message: `Server failed: ${st.error ?? "unknown"} (free tier SystemBusy at peak consumes 0 credits \u2014 retry off-peak)` };
        return { ok: true, status: "processing", jobId, message: "Still generating (free tier is slow) \u2014 call this tool again to check" };
      } catch (e) {
        return { ok: false, status: "failed", message: String(e instanceof Error ? e.message : e).slice(0, 300) };
      }
    }
  });
  ctx.tools.register({
    name: "whale_quality_review",
    description: "Rule-level QC for a finished video: existence, duration. LLM frame review is honestly marked pending.",
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
          stages: ["parse", "storyboard", "stills", "video", "voice", "final-cut"],
          providers: ["mock", "jimeng", "tongyi-wanx", "kling", "kling-dashscope", "doubao", "comfyui", "sessionid-http"],
          quotaAccounts: 0
        });
      }
    }), "dsh-video-studio: http route");
  });
}
export {
  apply,
  name
};
