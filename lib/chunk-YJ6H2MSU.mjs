// src/provider.ts
function assertProvider(p) {
  for (const m of ["id", "capabilities", "quote", "submit", "status", "fetch", "health"]) {
    if (typeof p[m] === "undefined") {
      throw new Error(`provider ${p?.id ?? "?"} \u7F3A\u5C11\u65B9\u6CD5/\u5B57\u6BB5: ${m}`);
    }
  }
  return p;
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

// src/providers/jimeng.ts
import { randomUUID } from "crypto";
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

// src/providers/tongyi-wanx.ts
var BASE2 = "https://wanx.biz.aliyun.com/wanx/api";
function createTongyiWanxProvider({ cookieStr, xsrfToken, wanUid, bxUa = "", bxUmidToken = "", baseUrl = BASE2, timeoutMs = 6e4, fetchImpl = fetch } = {}) {
  if (!cookieStr) throw new Error("tongyi-wanx: \u7F3A\u5C11 cookieStr");
  if (!xsrfToken) throw new Error("tongyi-wanx: \u7F3A\u5C11 xsrfToken");
  if (!wanUid) throw new Error("tongyi-wanx: \u7F3A\u5C11 wanUid");
  const api = async (path, data, opts = {}) => {
    const headers = {
      "content-type": "application/json",
      origin: "https://tongyi.aliyun.com",
      referer: "https://tongyi.aliyun.com/wan/generate/image/generate",
      "x-platform": "web",
      "x-wan-uid": String(wanUid),
      "x-xsrf-token": String(xsrfToken),
      "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36",
      cookie: cookieStr
    };
    if (opts.withBx) {
      if (bxUa) headers["bx-ua"] = bxUa;
      if (bxUmidToken) headers["bx-umidtoken"] = bxUmidToken;
    }
    const res = await fetchImpl(`${baseUrl}${path}`, { method: "POST", headers, body: JSON.stringify(data), signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) throw new Error(`wanx HTTP ${res.status} ${path}`);
    const text = await res.text();
    if (!text) throw new Error(`wanx \u7A7A\u54CD\u5E94 ${path}\uFF08\u53EF\u80FD\u7F3A\u5C11 bx-ua \u6216\u7AEF\u70B9\u9519\u8BEF\uFF09`);
    const j = JSON.parse(text);
    if (j?.success !== true) throw new Error(`wanx \u5931\u8D25: ${JSON.stringify(j).slice(0, 200)}`);
    return j;
  };
  return assertProvider({
    id: "tongyi-wanx",
    capabilities: { textToVideo: false, imageToVideo: false, firstLastFrame: false, lipSync: false, tts: false, image: true, maxDurationSec: 0, resolutions: ["1:1", "16:9", "9:16"], qualityTier: 5, freeQuota: true },
    async quote() {
      return { qualityTier: 5, costEstimate: 0, currency: "wanx-free-credit" };
    },
    async health() {
      try {
        await api("/common/task/list", { taskTypes: ["text_to_image"] });
        return { ok: true, quotaRemaining: null };
      } catch (e) {
        return { ok: false, error: String(e instanceof Error ? e.message : e).slice(0, 120) };
      }
    },
    async submit(_stage, spec) {
      const s = spec ?? {};
      const j = await api("/common/imageGen", {
        deductMode: "credit_mode",
        taskType: "text_to_image",
        taskInput: {
          subType: s?.subType ?? "basic",
          modelVersion: s?.modelVersion ?? "2_1_max",
          generationMode: s?.generationMode ?? "imaginative",
          modelIds: [],
          prompt: s?.positive ?? s?.prompt ?? "",
          ratio: s?.ratio ?? "1:1"
        }
      }, { withBx: true });
      const taskId = j?.data;
      if (!taskId) throw new Error("wanx: \u7F3A\u5C11 taskId");
      return { jobId: String(taskId) };
    },
    async status(jobId) {
      const j = await api("/common/task/list", { taskTypes: ["text_to_image"] });
      const item = (j?.data ?? []).find((x) => String(x?.taskId) === String(jobId));
      if (!item) return { state: "running", progress: null };
      if (item.status === 2 && (item.taskRate ?? 0) >= 100) return { state: "done", progress: 1 };
      if (item.status === 3 || item.status === 4) return { state: "failed", progress: 1, error: `wanx status=${item.status}` };
      return { state: "running", progress: item.taskRate ?? null };
    },
    async fetch(jobId) {
      const j = await api("/common/task/list", { taskTypes: ["text_to_image"] });
      const item = (j?.data ?? []).find((x) => String(x?.taskId) === String(jobId));
      const url = item?.taskResult?.[0]?.url;
      if (!url) throw new Error("wanx: \u65E0\u56FE\u7247\u5730\u5740");
      return { outputs: [String(url)], meta: { status: "success", taskRate: item.taskRate } };
    }
  });
}

// src/providers/kling.ts
import { createHmac } from "crypto";
var DEFAULT_BASE = "https://api-beijing.klingai.com";
var DEFAULT_MODEL = "kling-v2-6";
function base64url(input) {
  return Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function generateKlingJwt(accessKey, secretKey, nowMs = Date.now()) {
  const now = Math.floor(nowMs / 1e3);
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64url(JSON.stringify({ iss: accessKey, exp: now + 1800, nbf: now - 5, iat: now }));
  const sig = base64url(createHmac("sha256", secretKey).update(`${header}.${payload}`).digest());
  return `${header}.${payload}.${sig}`;
}
function parseKlingKey(apiKey) {
  const sep = apiKey.indexOf(":");
  if (sep <= 0) throw new Error('\u53EF\u7075 key \u683C\u5F0F\u5E94\u4E3A "accessKey:secretKey"');
  return { accessKey: apiKey.slice(0, sep), secretKey: apiKey.slice(sep + 1) };
}
function createKlingProvider({ apiKey, baseUrl = DEFAULT_BASE, model = DEFAULT_MODEL, timeoutMs = 12e4, fetchImpl = fetch } = {}) {
  if (!apiKey) throw new Error("kling: \u7F3A\u5C11 apiKey");
  const { accessKey, secretKey } = parseKlingKey(apiKey);
  let cachedToken = null;
  const token = () => cachedToken ??= generateKlingJwt(accessKey, secretKey);
  const api = async (method, path, data) => {
    const res = await fetchImpl(`${baseUrl}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
      body: data ? JSON.stringify(data) : void 0,
      signal: AbortSignal.timeout(timeoutMs)
    });
    if (!res.ok) throw new Error(`kling HTTP ${res.status} ${path}: ${String((await res.text()).slice(0, 200))}`);
    const j = await res.json();
    if (j?.code !== void 0 && j.code !== 0) throw new Error(`kling code=${j.code} ${j.message ?? ""} ${path}`);
    return j;
  };
  return assertProvider({
    id: "kling",
    capabilities: { textToVideo: true, imageToVideo: true, firstLastFrame: true, lipSync: false, tts: false, image: false, maxDurationSec: 10, resolutions: ["720p", "1080p"], qualityTier: 8 },
    async quote() {
      return { qualityTier: 8, costEstimate: 0, currency: "kling-credits" };
    },
    async health() {
      try {
        await api("GET", "/v1/videos/text2video/connectivity-test");
        return { ok: true, quotaRemaining: null };
      } catch (e) {
        return { ok: false, error: String(e instanceof Error ? e.message : e).slice(0, 120) };
      }
    },
    async submit(_stage, spec) {
      const s = spec ?? {};
      const body = {
        model_name: s?.model ?? model,
        prompt: s?.positive ?? s?.prompt ?? "",
        negative_prompt: s?.negative ?? "",
        mode: s?.mode ?? "pro",
        ...s?.durationSec ? { duration: String(s.durationSec) } : {},
        ...s?.aspectRatio ? { aspect_ratio: s.aspectRatio } : {}
      };
      const j = await api("POST", "/v1/videos/text2video", body);
      const taskId = j?.data?.task_id;
      if (!taskId) throw new Error("kling: \u7F3A\u5C11 task_id: " + JSON.stringify(j).slice(0, 200));
      return { jobId: String(taskId) };
    },
    async status(jobId) {
      const j = await api("GET", `/v1/videos/text2video/${jobId}`);
      const st = String(j?.data?.task_status ?? "unknown");
      if (st === "succeed") return { state: "done", progress: 1 };
      if (st === "failed") return { state: "failed", progress: 1, error: String(j?.data?.task_status_msg ?? "failed") };
      return { state: "running", progress: null };
    },
    async fetch(jobId) {
      const j = await api("GET", `/v1/videos/text2video/${jobId}`);
      const url = j?.data?.task_result?.videos?.[0]?.url;
      if (!url) throw new Error("kling: \u65E0\u89C6\u9891\u5730\u5740");
      return { outputs: [String(url)], meta: { status: "success", duration: j.data.task_result.videos[0].duration } };
    }
  });
}

// src/providers/kling-lipsync.ts
var DEFAULT_BASE2 = "https://api-beijing.klingai.com";
function createKlingLipsyncProvider({ apiKey, baseUrl = DEFAULT_BASE2, timeoutMs = 12e4, fetchImpl = fetch } = {}) {
  if (!apiKey) throw new Error("kling-lipsync: \u7F3A\u5C11 apiKey");
  const { accessKey, secretKey } = parseKlingKey(apiKey);
  let cachedToken = null;
  const token = () => cachedToken ??= generateKlingJwt(accessKey, secretKey);
  const api = async (method, path, data) => {
    const res = await fetchImpl(`${baseUrl}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
      body: data ? JSON.stringify(data) : void 0,
      signal: AbortSignal.timeout(timeoutMs)
    });
    if (!res.ok) throw new Error(`kling-lipsync HTTP ${res.status} ${path}: ${String((await res.text()).slice(0, 200))}`);
    const j = await res.json();
    if (j?.code !== void 0 && j.code !== 0) throw new Error(`kling-lipsync code=${j.code} ${j.message ?? ""} ${path}`);
    return j;
  };
  return assertProvider({
    id: "kling-lipsync",
    capabilities: { lipSync: true, tts: true, textToVideo: false, imageToVideo: false, maxDurationSec: 10, resolutions: ["720p", "1080p"], qualityTier: 8 },
    async quote() {
      return { qualityTier: 8, costEstimate: 0, currency: "kling-credits" };
    },
    async health() {
      try {
        await api("GET", "/v1/videos/text2video/connectivity-test");
        return { ok: true, quotaRemaining: null };
      } catch (e) {
        return { ok: false, error: String(e instanceof Error ? e.message : e).slice(0, 120) };
      }
    },
    async submit(_stage, spec) {
      const s = spec ?? {};
      const mode = s?.mode ?? (s?.audioUrl || s?.audioBase64 ? "audio2video" : "text2video");
      const input = { mode };
      if (s?.videoId) input.video_id = String(s.videoId);
      else if (s?.videoUrl) input.video_url = String(s.videoUrl);
      else throw new Error("kling-lipsync: \u9700\u8981 videoId \u6216 videoUrl\uFF082-10s\uFF0C720p/1080p\uFF09");
      if (mode === "audio2video") {
        if (s?.audioUrl) {
          input.audio_type = "url";
          input.audio_url = String(s.audioUrl);
        } else if (s?.audioBase64) {
          input.audio_type = "file";
          input.audio_file = String(s.audioBase64);
        } else throw new Error("kling-lipsync: audio2video \u9700\u8981 audioUrl \u6216 audioBase64\uFF08mp3/wav/m4a/aac \u22645MB\uFF09");
      } else if (mode === "text2video") {
        if (!s?.text) throw new Error("kling-lipsync: text2video \u9700\u8981 text\uFF08\u2264120 \u5B57\uFF09");
        if (!s?.voiceId) throw new Error("kling-lipsync: text2video \u9700\u8981 voiceId\uFF08\u53EF\u7075\u63A7\u5236\u53F0\u97F3\u8272\u5217\u8868\uFF09");
        input.text = String(s.text).slice(0, 120);
        input.voice_id = String(s.voiceId);
        input.voice_language = String(s.voiceLanguage ?? "zh");
        input.voice_speed = Number(s.voiceSpeed ?? 1);
      } else {
        throw new Error(`kling-lipsync: \u672A\u77E5 mode ${String(mode)}\uFF08text2video/audio2video\uFF09`);
      }
      const body = { input };
      if (s?.callbackUrl) body.callback_url = String(s.callbackUrl);
      const j = await api("POST", "/v1/videos/lip-sync", body);
      const taskId = j?.data?.task_id;
      if (!taskId) throw new Error("kling-lipsync: \u7F3A\u5C11 task_id: " + JSON.stringify(j).slice(0, 200));
      return { jobId: String(taskId) };
    },
    async status(jobId) {
      const j = await api("GET", `/v1/videos/lip-sync/${jobId}`);
      const st = String(j?.data?.task_status ?? "unknown");
      if (st === "succeed") return { state: "done", progress: 1 };
      if (st === "failed") return { state: "failed", progress: 1, error: String(j?.data?.task_status_msg ?? "failed") };
      return { state: "running", progress: null };
    },
    async fetch(jobId) {
      const j = await api("GET", `/v1/videos/lip-sync/${jobId}`);
      const url = j?.data?.task_result?.videos?.[0]?.url;
      if (!url) throw new Error("kling-lipsync: \u65E0\u89C6\u9891\u5730\u5740");
      return { outputs: [String(url)], meta: { status: "success", duration: j.data.task_result.videos[0].duration } };
    }
  });
}

// src/providers/kling-dashscope.ts
var DEFAULT_BASE3 = "https://dashscope.aliyuncs.com";
function createDashScopeVideoProvider({ apiKey, model, baseUrl = DEFAULT_BASE3, timeoutMs = 12e4, fetchImpl = fetch, id = "dashscope-video", qualityTier = 7 } = {}) {
  if (!apiKey) throw new Error(`${id}: \u7F3A\u5C11 apiKey`);
  if (!model) throw new Error(`${id}: \u7F3A\u5C11 model`);
  const api = async (method, path, data) => {
    const res = await fetchImpl(`${baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...path.endsWith("video-synthesis") ? { "X-DashScope-Async": "enable" } : {}
      },
      body: data ? JSON.stringify(data) : void 0,
      signal: AbortSignal.timeout(timeoutMs)
    });
    if (!res.ok) throw new Error(`${id} HTTP ${res.status} ${path}: ${String((await res.text()).slice(0, 200))}`);
    return res.json();
  };
  return assertProvider({
    id,
    capabilities: { textToVideo: true, imageToVideo: true, firstLastFrame: true, lipSync: false, tts: false, image: false, maxDurationSec: 10, resolutions: ["720p", "1080p"], qualityTier },
    async quote() {
      return { qualityTier, costEstimate: 0, currency: "dashscope-quota" };
    },
    async health() {
      try {
        await api("GET", "/api/v1/tasks/nonexistent-probe");
        return { ok: true, quotaRemaining: null };
      } catch (e) {
        const m = String(e instanceof Error ? e.message : e);
        return { ok: m.includes("404") || m.includes("401") || m.includes("403"), quotaRemaining: null, note: m.slice(0, 80) };
      }
    },
    async submit(_stage, spec) {
      const s = spec ?? {};
      const body = {
        model: s?.model ?? model,
        input: { prompt: s?.positive ?? s?.prompt ?? "" },
        parameters: {
          mode: s?.mode ?? "std",
          aspect_ratio: s?.aspectRatio ?? "16:9",
          duration: s?.durationSec ?? 5,
          audio: s?.audio ?? false,
          watermark: s?.watermark ?? true,
          ...s?.negative ? { negative_prompt: s.negative } : {}
        }
      };
      const j = await api("POST", "/api/v1/services/aigc/video-generation/video-synthesis", body);
      const taskId = j?.output?.task_id;
      if (!taskId) throw new Error(`${id}: \u54CD\u5E94\u7F3A\u5C11 task_id: ` + JSON.stringify(j).slice(0, 200));
      return { jobId: String(taskId) };
    },
    async status(jobId) {
      const j = await api("GET", `/api/v1/tasks/${jobId}`);
      const st = String(j?.output?.task_status ?? "UNKNOWN").toUpperCase();
      if (st === "SUCCEEDED") return { state: "done", progress: 1 };
      if (st === "FAILED") return { state: "failed", progress: 1, error: String(j?.output?.message ?? j?.output?.code ?? "FAILED") };
      return { state: "running", progress: null };
    },
    async fetch(jobId) {
      const j = await api("GET", `/api/v1/tasks/${jobId}`);
      const url = j?.output?.video_url ?? j?.output?.video?.url;
      if (!url) throw new Error(`${id}: \u672A\u627E\u5230 video_url: ` + JSON.stringify(j?.output ?? {}).slice(0, 200));
      return { outputs: [String(url)], meta: { status: "success", requestId: j?.request_id } };
    }
  });
}
function createKlingDashScopeProvider(opts) {
  return createDashScopeVideoProvider({ ...opts, model: "kling/kling-v3-video-generation", id: "kling-dashscope", qualityTier: 7 });
}

// src/providers/dashscope-wan.ts
var WAN_VIDEO_MODELS = ["wan2.2-t2v-plus", "wan2.1-t2v-plus"];
function createDashScopeWanProvider(opts = {}) {
  return createDashScopeVideoProvider({
    ...opts,
    model: opts.model ?? WAN_VIDEO_MODELS[0] ?? "wan2.2-t2v-plus",
    id: "dashscope-wan",
    qualityTier: 7
  });
}

// src/providers/doubao.ts
var DEFAULT_BASE4 = "https://ark.cn-beijing.volces.com/api/v3";
var DOUBAO_MODELS = ["doubao-seedance-1-5-pro-251215", "doubao-seedance-1-0-pro-250528", "doubao-seedance-1-0-lite-t2v-250428"];
var DOUBAO_IMAGE_MODELS = ["doubao-seedream-5-0-lite-260128", "doubao-seedream-5-0-260128", "doubao-seedream-4-5-251128", "doubao-seedream-4-0-250828"];
var SEEDANCE_RATIOS = ["adaptive", "16:9", "4:3", "1:1", "3:4", "9:16", "21:9"];
var SEEDANCE_DURATIONS = [5, 10];
function extractTaskId(j) {
  const id = j?.id ?? j?.data?.id ?? j?.task_id ?? j?.data?.task_id;
  return typeof id === "string" && id ? id : null;
}
function extractVideoUrl(j) {
  const url = j?.content?.video_url ?? j?.data?.content?.video_url ?? j?.video_url ?? j?.data?.video_url;
  return typeof url === "string" && url ? url : null;
}
function createDoubaoProvider({ apiKey, model = DOUBAO_MODELS[0] ?? "", imageModel = DOUBAO_IMAGE_MODELS[0] ?? "", baseUrl = DEFAULT_BASE4, timeoutMs = 12e4, fetchImpl = fetch } = {}) {
  if (!apiKey) throw new Error("doubao: \u7F3A\u5C11 apiKey\uFF08\u706B\u5C71\u65B9\u821F API Key \u6216 ep-xxx \u63A8\u7406\u63A5\u5165\u70B9\uFF09");
  const api = async (method, path, data) => {
    const res = await fetchImpl(`${baseUrl}${path}`, {
      method,
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: data ? JSON.stringify(data) : void 0,
      signal: AbortSignal.timeout(timeoutMs)
    });
    if (!res.ok) throw new Error(`doubao HTTP ${res.status} ${path}: ${String((await res.text()).slice(0, 200))}`);
    return res.json();
  };
  return assertProvider({
    id: "doubao",
    capabilities: { textToVideo: true, imageToVideo: true, firstLastFrame: true, lipSync: false, tts: false, image: true, maxDurationSec: 10, resolutions: ["720p", "1080p"], qualityTier: 6 },
    async quote() {
      return { qualityTier: 6, costEstimate: 0, currency: "ark-credits" };
    },
    async health() {
      try {
        await api("GET", "/contents/generations/tasks/nonexistent-probe");
        return { ok: true, quotaRemaining: null };
      } catch (e) {
        const m = String(e instanceof Error ? e.message : e);
        return { ok: m.includes("404") || m.includes("401") || m.includes("403"), quotaRemaining: null, note: m.slice(0, 80) };
      }
    },
    async submit(stage, spec) {
      const s = spec ?? {};
      if (stage === "shot-assets" || stage === "master-asset") {
        const j2 = await api("POST", "/images/generations", {
          model: s?.model ?? imageModel,
          prompt: s?.positive ?? s?.prompt ?? "",
          size: s?.size ?? "1024x1024",
          n: s?.n ?? 1,
          response_format: "url"
        });
        const url = j2?.data?.[0]?.url ?? j2?.data?.[0]?.b64_json;
        if (!url) throw new Error("doubao-image: \u65E0\u56FE\u7247\u8F93\u51FA: " + JSON.stringify(j2).slice(0, 200));
        const out = typeof url === "string" && url.startsWith("http") ? url : `data:image/png;base64,${url}`;
        return { jobId: String(out) };
      }
      const content = [];
      if (s?.imageUrl) content.push({ type: "image_url", image_url: { url: String(s.imageUrl) } });
      content.push({ type: "text", text: [s?.positive, s?.negative ? `\uFF08\u907F\u514D\uFF1A${s.negative}\uFF09` : ""].filter(Boolean).join(" ") || (s?.prompt ?? "") });
      const duration = SEEDANCE_DURATIONS.includes(Number(s?.durationSec)) ? Number(s.durationSec) : 5;
      const ratio = SEEDANCE_RATIOS.includes(s?.aspectRatio ?? "") ? s.aspectRatio : "adaptive";
      const body = {
        model: s?.model ?? model,
        content,
        ratio,
        duration,
        generate_audio: s?.generateAudio ?? true,
        watermark: s?.watermark ?? false
      };
      if (s?.callbackUrl) body.callback_url = String(s.callbackUrl);
      const j = await api("POST", "/contents/generations/tasks", body);
      const taskId = extractTaskId(j);
      if (!taskId) throw new Error("doubao: \u7F3A\u5C11\u4EFB\u52A1 id: " + JSON.stringify(j).slice(0, 200));
      return { jobId: String(taskId) };
    },
    async status(jobId) {
      if (/^https?:|^data:/.test(jobId)) return { state: "done", progress: 1 };
      const j = await api("GET", `/contents/generations/tasks/${jobId}`);
      const st = String(j?.status ?? j?.data?.status ?? "unknown").toLowerCase();
      if (st === "succeeded") return { state: "done", progress: 1 };
      if (st === "failed" || st === "cancelled" || st === "expired") {
        return { state: "failed", progress: 1, error: String(j?.error?.message ?? st) };
      }
      return { state: "running", progress: null };
    },
    async fetch(jobId) {
      if (/^https?:/.test(jobId)) return { outputs: [jobId], meta: { status: "success" } };
      if (/^data:/.test(jobId)) return { outputs: [jobId], meta: { status: "success", note: "Seedream b64 \u515C\u5E95" } };
      const j = await api("GET", `/contents/generations/tasks/${jobId}`);
      const url = extractVideoUrl(j);
      if (!url) throw new Error("doubao: \u65E0 video_url: " + JSON.stringify(j?.content ?? j ?? {}).slice(0, 150));
      return { outputs: [String(url)], meta: { status: "success" } };
    }
  });
}

// src/providers/doubao-web.ts
import { randomUUID as randomUUID2 } from "crypto";
var DEFAULT_BASE5 = "https://www.doubao.com";
var IMAGE_BOT_ID = "7338286299411103781";
function parseSse(text) {
  const events = [];
  for (const block of text.split(/\n\n+/)) {
    let event = "";
    const dataLines = [];
    for (const line of block.split("\n")) {
      if (line.startsWith("event: ")) event = line.slice(7).trim();
      else if (line.startsWith("data: ")) dataLines.push(line.slice(6));
    }
    if (!event && !dataLines.length) continue;
    const raw = dataLines.join("\n");
    let data = raw;
    try {
      data = JSON.parse(raw);
    } catch {
    }
    events.push({ event, data });
  }
  return { events };
}
function createDoubaoWebProvider(opts = {}) {
  const { cookieStr = "", msToken = "", deviceId = "", fp = "", aBogus = "", baseUrl = DEFAULT_BASE5, timeoutMs = 12e4, fetchImpl = fetch } = opts;
  if (!cookieStr) throw new Error("doubao-web: \u7F3A\u5C11 cookieStr\uFF08F12 \u590D\u5236 doubao.com \u8BF7\u6C42\u7684 Cookie \u6574\u884C\uFF09");
  const buildUrl = () => {
    const params = new URLSearchParams({
      aid: "497858",
      channel: "baidu_pz",
      device_id: deviceId,
      device_platform: "web",
      doubao_device_platform: "web",
      doubao_pc_version: "3.32.8",
      fp,
      language: "zh",
      pc_version: "3.32.8",
      pkg_type: "release_version",
      real_aid: "497858",
      region: "CN",
      samantha_web: "1",
      sys_region: "CN",
      tea_uuid: deviceId,
      tz_name: "Asia/Shanghai",
      "use-olympus-account": "1",
      version_code: "20800",
      web_id: deviceId,
      web_platform: "browser",
      web_tab_id: randomUUID2(),
      msToken,
      a_bogus: aBogus
    });
    return `${baseUrl}/chat/completion?${params.toString()}`;
  };
  const chatOnce = async (text, { image = false } = {}) => {
    const localMessageId = randomUUID2();
    const content = image ? `\u751F\u6210\u56FE\u7247\uFF1A${text}` : text;
    const body = {
      client_meta: { conversation_id: opts.conversationId ?? "", bot_id: IMAGE_BOT_ID, last_section_id: "", last_message_index: 0 },
      messages: [{ local_message_id: localMessageId, content_block: [{ block_type: 1e4, content: { text_block: { text: content, icon_url: "", icon_url_dark: "", summary: "" }, pc_event_block: "" } }], block_id: randomUUID2(), parent_id: "", meta_info: [], append_fields: [] }],
      message_status: 0,
      option: { send_message_scene: "", create_time_ms: Date.now(), collect_id: "", is_audio: false, answer_with_suggest: false, agent_mode: 1, tts_switch: false, need_deep_think: 4, click_clear_context: false, from_suggest: false, is_regen: false, is_replace: false, is_from_click_option: false, is_from_click_softlink: false, disable_sse_cache: false, select_text_action: "", is_select_text: false, resend_for_regen: false, scene_type: 0, unique_key: randomUUID2(), start_seq: 0, need_create_conversation: false, regen_query_id: [], edit_query_id: [], regen_instruction: "", no_replace_for_regen: false, message_from: 0, shared_app_name: "", shared_app_id: "", sse_recv_event_options: { support_chunk_delta: true }, is_ai_playground: false, is_old_user: true, general_task_param: { action: 0, thread_local_message_id: [localMessageId], selected_skills: [], skill_selections: [] }, recovery_option: { is_recovery: false, req_create_time_sec: Math.floor(Date.now() / 1e3), append_sse_event_scene: 0 }, message_storage_type: 0, related_deleted_message_ids: {}, connector_info_list: [], model_config: { model_item_key: "4", model_extra_params: { total_window_size: "256000" } }, aggregate_params: { model_item_key: "4", provider_id: "" } },
      user_context: [],
      ext: { use_deep_think: "4", collection_id: "", commerce_credit_config_enable: "0" }
    };
    const res = await fetchImpl(buildUrl(), {
      method: "POST",
      headers: {
        accept: "*/*",
        "accept-language": "zh-CN,zh;q=0.9",
        "agw-js-conv": "str, str",
        "content-type": "application/json",
        cookie: cookieStr,
        origin: baseUrl,
        referer: `${baseUrl}/chat/`,
        "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36"
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs)
    });
    if (!res.ok) throw new Error(`doubao-web HTTP ${res.status}`);
    const raw = await res.text();
    const { events } = parseSse(raw);
    let textOut = "";
    let questionId;
    const imageUrls = [];
    for (const e of events) {
      const d = e.data;
      if (d && typeof d === "object") {
        const rec = d;
        if (rec.question_id) questionId = String(rec.question_id);
        const str2 = JSON.stringify(rec);
        const t = rec.text ?? rec.content ?? rec.msg;
        if (typeof t === "string" && t) textOut += t;
        for (const m of str2.matchAll(/https?:\/\/[^"\\\s]+\.(?:png|jpg|jpeg|webp)[^"\\\s]*/g)) {
          const u = m[0];
          if (!/bytednsdoc\.com|static/.test(u)) imageUrls.push(u);
        }
      }
    }
    return { text: textOut, imageUrls: [...new Set(imageUrls)], questionId };
  };
  return assertProvider({
    id: "doubao-web",
    capabilities: { textToVideo: false, imageToVideo: false, firstLastFrame: false, lipSync: false, tts: false, image: true, maxDurationSec: 0, resolutions: ["9:16", "1:1"], qualityTier: 4, freeQuota: true, llm: true },
    async quote() {
      return { qualityTier: 4, costEstimate: 0, currency: "doubao-web-free" };
    },
    async health() {
      return { ok: true, quotaRemaining: null, note: "\u514D\u8D39\u989D\u5EA6\u6309 7 \u5929\u7A97\u53E3\uFF08\u4E13\u4E1A\u7248\u989D\u5EA6\u8017\u5C3D\u65F6\u56FE\u7247 bot \u6682\u505C\uFF0C\u6587\u672C\u4ECD\u53EF\u7528\uFF09" };
    },
    async submit(stage, spec) {
      const s = spec ?? {};
      const text = String(s?.positive ?? s?.prompt ?? s?.text ?? "");
      const image = stage === "shot-assets" || stage === "master-asset";
      const jobId = randomUUID2();
      (async () => {
        try {
          await chatOnce(text, { image });
        } catch {
        }
      })();
      return { jobId };
    },
    async status() {
      return { state: "done", progress: 1 };
    },
    async fetch() {
      return { outputs: [], meta: { status: "success", note: "doubao-web \u662F\u6D41\u5F0F\u901A\u9053\uFF1A\u8BF7\u4F7F\u7528 runOnce \u83B7\u53D6\u6587\u672C\u4E0E\u56FE\u7247" } };
    },
    async runOnce(stage, spec) {
      const s = spec ?? {};
      const text = String(s?.positive ?? s?.prompt ?? s?.text ?? "");
      const image = stage === "shot-assets" || stage === "master-asset";
      const r = await chatOnce(text, { image });
      return { text: r.text, imageUrls: r.imageUrls, questionId: r.questionId };
    }
  });
}

// src/providers/comfyui.ts
import { randomUUID as randomUUID3 } from "crypto";
function createComfyUIProvider({ baseUrl = "http://127.0.0.1:8188", timeoutMs = 3e4, fetchImpl = fetch } = {}) {
  const api = async (path, opts = {}) => {
    const res = await fetchImpl(`${baseUrl}${path}`, { signal: AbortSignal.timeout(timeoutMs), ...opts });
    if (!res.ok) throw new Error(`comfyui HTTP ${res.status} ${path}`);
    return res;
  };
  return assertProvider({
    id: "comfyui",
    capabilities: { textToVideo: true, imageToVideo: true, firstLastFrame: false, lipSync: false, tts: false, image: true, maxDurationSec: 30, resolutions: ["720p", "1080p"], qualityTier: 8 },
    async quote() {
      return { qualityTier: 8, costEstimate: 0, currency: "local-gpu" };
    },
    async submit(_stage, spec) {
      const workflow = spec?.workflow ?? null;
      if (!workflow) throw new Error("comfyui: \u7F3A\u5C11 workflow\uFF08\u5BFC\u6F14\u5C42\u5E94\u901A\u8FC7 buildWorkflow \u751F\u6210\uFF09");
      const r = await api("/prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: workflow, client_id: randomUUID3() })
      });
      const j = await r.json();
      if (!j.prompt_id) throw new Error(`comfyui submit \u5931\u8D25: ${JSON.stringify(j).slice(0, 200)}`);
      return { jobId: j.prompt_id };
    },
    async status(jobId) {
      const h = await (await api(`/history/${jobId}`)).json();
      if (h[jobId]) return { state: "done", progress: 1 };
      const q = await (await api("/queue")).json();
      const active = [...q.queue_running ?? [], ...q.queue_pending ?? []].some((x) => x[1] === jobId);
      return { state: active ? "running" : "unknown", progress: null };
    },
    async fetch(jobId) {
      const h = await (await api(`/history/${jobId}`)).json();
      const entry = h[jobId];
      if (!entry) throw new Error(`comfyui: \u65E0\u5386\u53F2 ${jobId}`);
      const files = [];
      for (const outputs of Object.values(entry.outputs ?? {})) {
        const list = Array.isArray(outputs) ? outputs : Object.values(outputs ?? {});
        for (const o of list.flat()) {
          const item = o;
          if (item?.filename) {
            files.push({
              url: `${baseUrl}/view?filename=${encodeURIComponent(item.filename)}&subfolder=${item.subfolder ?? ""}&type=${item.type ?? "output"}`,
              filename: item.filename
            });
          }
        }
      }
      return { outputs: files.map((f) => f.url), meta: { status: entry.status?.status_str ?? "success" } };
    },
    async health() {
      try {
        const j = await (await api("/system_stats")).json();
        const gpu = j.devices?.find((d) => d.type === "cuda" || d.name)?.name ?? "unknown";
        return { ok: true, quotaRemaining: Infinity, gpu };
      } catch (e) {
        return { ok: false, error: String(e instanceof Error ? e.message : e) };
      }
    }
  });
}

// src/providers/sessionid-http.ts
import { randomUUID as randomUUID4 } from "crypto";
var SESSIONID_PRESETS = {
  jimeng: {
    label: "\u5373\u68A6\uFF08\u514D\u8D39\u989D\u5EA6\uFF09",
    baseUrl: "https://jimeng.jianying.com",
    // UNVERIFIED legacy shape — the verified direct adapter is providers/jimeng.ts
    submitPath: "/mweb/v1/generate_video",
    queryPath: "/mweb/v1/generate_video/query",
    dailyQuota: 66
  },
  kling: {
    label: "\u53EF\u7075\uFF08\u514D\u8D39\u989D\u5EA6\uFF09",
    baseUrl: "https://app.klingai.com",
    submitPath: "/api/animation/v3/generate",
    queryPath: "/api/animation/v3/generate/query",
    dailyQuota: 66
  }
};
function createSessionIdProvider({ preset, sessionId, baseUrl = null, timeoutMs = 6e4, fetchImpl = fetch }) {
  if (!SESSIONID_PRESETS[preset]) throw new Error(`\u672A\u77E5 sessionid \u9884\u8BBE: ${preset}\uFF08\u53EF\u9009 ${Object.keys(SESSIONID_PRESETS).join("/")}\uFF09`);
  if (!sessionId) throw new Error(`${preset}: \u7F3A\u5C11 sessionId\uFF08\u4ECE\u5B98\u7F51\u767B\u5F55\u6001\u81EA\u53D6\uFF0C\u52FF\u63D0\u4EA4\u8FDB\u4ED3\u5E93\uFF09`);
  const cfg = { ...SESSIONID_PRESETS[preset], baseUrl: baseUrl ?? SESSIONID_PRESETS[preset].baseUrl };
  const api = async (path, opts = {}) => {
    const res = await fetchImpl(`${cfg.baseUrl}${path}`, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { Authorization: `Bearer ${sessionId}`, "Content-Type": "application/json", ...opts.headers ?? {} },
      ...opts
    });
    if (!res.ok) throw new Error(`${preset} HTTP ${res.status} ${path}`);
    return res.json();
  };
  const asRecord = (v) => v && typeof v === "object" ? v : {};
  return assertProvider({
    id: `sessionid-${preset}`,
    capabilities: { textToVideo: true, imageToVideo: true, firstLastFrame: false, lipSync: false, tts: false, image: true, maxDurationSec: 10, resolutions: ["720p"], qualityTier: 2, freeQuota: true, dailyQuota: cfg.dailyQuota },
    async quote() {
      return { qualityTier: 2, costEstimate: 0, currency: "free-quota" };
    },
    async submit(_stage, spec) {
      const body = {
        prompt: spec?.positive ?? spec?.prompt ?? "",
        negative_prompt: spec?.negative ?? "",
        width: spec?.width ?? 1080,
        height: spec?.height ?? 1920,
        duration: spec?.durationSec ?? 5,
        req_id: randomUUID4()
      };
      const j = asRecord(await api(cfg.submitPath, { method: "POST", body: JSON.stringify(body) }));
      const jobId = j?.data?.task_id ?? j?.data?.id ?? j?.id ?? j?.task_id;
      if (!jobId) throw new Error(`${preset} submit \u54CD\u5E94\u7F3A\u5C11\u4EFB\u52A1 id: ${JSON.stringify(j).slice(0, 200)}`);
      return { jobId: String(jobId) };
    },
    async status(jobId) {
      const j = asRecord(await api(`${cfg.queryPath}?id=${encodeURIComponent(jobId)}`));
      const st = String(j?.data?.status ?? j?.status ?? "unknown").toLowerCase();
      if (["success", "succeed", "done", "complete"].includes(st)) return { state: "done", progress: 1 };
      if (["failed", "fail", "error"].includes(st)) return { state: "failed", progress: 1, error: String(j?.data?.message ?? "") };
      return { state: "running", progress: null };
    },
    async fetch(jobId) {
      const j = asRecord(await api(`${cfg.queryPath}?id=${encodeURIComponent(jobId)}`));
      const url = j?.data?.video_url ?? j?.data?.url ?? j?.video_url;
      if (!url) throw new Error(`${preset} \u67E5\u8BE2\u54CD\u5E94\u7F3A\u5C11\u89C6\u9891\u5730\u5740`);
      return { outputs: [String(url)], meta: { status: "success" } };
    },
    async health() {
      try {
        await api(`${cfg.queryPath}?id=health-probe`);
        return { ok: true, quotaRemaining: cfg.dailyQuota };
      } catch {
        return { ok: false, quotaRemaining: 0 };
      }
    }
  });
}

// src/host/account-providers.ts
function parseCredential(credential) {
  const t = credential.trim();
  if (!t.startsWith("{")) return t;
  try {
    const parsed = JSON.parse(t);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error("JSON \u51ED\u8BC1\u5FC5\u987B\u662F\u5BF9\u8C61");
    return parsed;
  } catch (e) {
    throw new Error(`\u51ED\u8BC1\u4EE5 { \u5F00\u5934\u4F46\u4E0D\u662F\u5408\u6CD5 JSON \u5BF9\u8C61: ${e instanceof Error ? e.message : e}`);
  }
}
function str(v, what) {
  if (typeof v !== "string" || !v) throw new Error(`${what} \u7F3A\u5931\u6216\u975E\u5B57\u7B26\u4E32`);
  return v;
}
function field(obj, key) {
  if (typeof obj !== "object") throw new Error(`\u4F9B\u5E94\u5546\u9700\u8981 JSON \u51ED\u8BC1\uFF08\u542B ${key}\uFF09\uFF0C\u5F53\u524D\u662F\u660E\u6587\u4E32`);
  return str(obj[key], key);
}
function providerForAccount(account) {
  const c = parseCredential(account.credential ?? "");
  switch (account.provider) {
    case "mock":
      return createMockProvider();
    case "jimeng":
      return createJimengProvider({ sessionId: typeof c === "string" ? str(c, "sessionId") : field(c, "sessionId") });
    case "tongyi-wanx":
      return createTongyiWanxProvider({
        cookieStr: field(c, "cookieStr"),
        xsrfToken: field(c, "xsrfToken"),
        wanUid: field(c, "wanUid"),
        ...typeof c === "object" && typeof c.bxUa === "string" ? { bxUa: c.bxUa } : {},
        ...typeof c === "object" && typeof c.bxUmidToken === "string" ? { bxUmidToken: c.bxUmidToken } : {}
      });
    case "kling":
      return createKlingProvider({ apiKey: typeof c === "string" ? str(c, "apiKey") : field(c, "apiKey") });
    case "kling-dashscope":
      return createKlingDashScopeProvider({ apiKey: typeof c === "string" ? str(c, "apiKey") : field(c, "apiKey") });
    case "dashscope-wan":
      return createDashScopeWanProvider({ apiKey: typeof c === "string" ? str(c, "apiKey") : field(c, "apiKey") });
    case "kling-lipsync":
      return createKlingLipsyncProvider({ apiKey: typeof c === "string" ? str(c, "apiKey") : field(c, "apiKey") });
    case "doubao":
      return createDoubaoProvider({ apiKey: typeof c === "string" ? str(c, "apiKey") : field(c, "apiKey") });
    case "doubao-web":
      return createDoubaoWebProvider({
        cookieStr: field(c, "cookieStr"),
        ...typeof c === "object" && typeof c.msToken === "string" ? { msToken: c.msToken } : {},
        ...typeof c === "object" && typeof c.deviceId === "string" ? { deviceId: c.deviceId } : {},
        ...typeof c === "object" && typeof c.fp === "string" ? { fp: c.fp } : {},
        ...typeof c === "object" && typeof c.aBogus === "string" ? { aBogus: c.aBogus } : {}
      });
    case "comfyui": {
      const baseUrl = typeof c === "string" ? c : typeof c === "object" && typeof c.baseUrl === "string" ? c.baseUrl : null;
      if (!baseUrl) throw new Error('comfyui: \u51ED\u8BC1\u9700\u4E3A baseUrl \u660E\u6587\u6216 {"baseUrl":"http://127.0.0.1:8188"}');
      return createComfyUIProvider({ baseUrl });
    }
    case "sessionid-http":
      return createSessionIdProvider({ preset: field(c, "preset"), sessionId: field(c, "sessionId") });
    default:
      throw new Error(`\u672A\u77E5\u4F9B\u5E94\u5546: ${account.provider}`);
  }
}

export {
  createMockProvider,
  createJimengProvider,
  parseCredential,
  providerForAccount
};
