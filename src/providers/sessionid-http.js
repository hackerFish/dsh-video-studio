// sessionid 型供应商（即梦/可灵等官网免费额度通道）。
// 凭证 = 用户在官网登录后自取的 sessionid，作为 Authorization Bearer 使用。
// 端点采用「社区记载」的已知形态，首轮真实 sessionid 实测后再固化为各平台的正式配置；
// 本实现全部可配置，测试用 mock 服务器做协议级验证。
import { randomUUID } from 'node:crypto'
import { assertProvider } from '../provider.js'

// 平台预设（端点标记 UNVERIFIED 的部分待真实 sessionid 实测后确认）
export const SESSIONID_PRESETS = {
  jimeng: {
    label: '即梦（免费额度）',
    baseUrl: 'https://jimeng.jianying.com',
    // UNVERIFIED: 社区项目记载的形态，待实测
    submitPath: '/mweb/v1/generate_video',
    queryPath: '/mweb/v1/generate_video/query',
    dailyQuota: 66,
  },
  kling: {
    label: '可灵（免费额度）',
    baseUrl: 'https://app.klingai.com',
    // UNVERIFIED: 社区项目记载的形态，待实测
    submitPath: '/api/animation/v3/generate',
    queryPath: '/api/animation/v3/generate/query',
    dailyQuota: 66,
  },
}

export function createSessionIdProvider({ preset, sessionId, baseUrl = null, timeoutMs = 60000, fetchImpl = fetch } = {}) {
  if (!SESSIONID_PRESETS[preset]) throw new Error(`未知 sessionid 预设: ${preset}（可选 ${Object.keys(SESSIONID_PRESETS).join('/')}）`)
  // 快照配置（避免调用方/测试对预设表的修改穿透进实例）
  const cfg = { ...SESSIONID_PRESETS[preset], baseUrl: baseUrl ?? SESSIONID_PRESETS[preset].baseUrl }
  if (!sessionId) throw new Error(`${preset}: 缺少 sessionId（从官网登录态自取，勿提交进仓库）`)
  const api = async (path, opts = {}) => {
    const res = await fetchImpl(`${cfg.baseUrl}${path}`, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { Authorization: `Bearer ${sessionId}`, 'Content-Type': 'application/json', ...(opts.headers ?? {}) },
      ...opts,
    })
    if (!res.ok) throw new Error(`${preset} HTTP ${res.status} ${path}`)
    return res
  }
  return assertProvider({
    id: `sessionid-${preset}`,
    capabilities: {
      textToVideo: true, imageToVideo: true, firstLastFrame: false, lipSync: false, tts: false,
      image: true, maxDurationSec: 10, resolutions: ['720p'], qualityTier: 2, freeQuota: true, dailyQuota: cfg.dailyQuota,
    },
    async quote() { return { qualityTier: 2, costEstimate: 0, currency: 'free-quota' } },
    async submit(_stage, spec) {
      const body = {
        prompt: spec?.positive ?? spec?.prompt ?? '',
        negative_prompt: spec?.negative ?? '',
        width: spec?.width ?? 1080, height: spec?.height ?? 1920,
        duration: spec?.durationSec ?? 5,
        req_id: randomUUID(),
      }
      const r = await api(cfg.submitPath, { method: 'POST', body: JSON.stringify(body) })
      const j = await r.json()
      const jobId = j?.data?.task_id ?? j?.data?.id ?? j?.id ?? j?.task_id
      if (!jobId) throw new Error(`${preset} submit 响应缺少任务 id: ${JSON.stringify(j).slice(0, 200)}`)
      return { jobId }
    },
    async status(jobId) {
      const r = await api(`${cfg.queryPath}?id=${encodeURIComponent(jobId)}`)
      const j = await r.json()
      const st = String(j?.data?.status ?? j?.status ?? 'unknown').toLowerCase()
      if (['success', 'succeed', 'done', 'complete'].includes(st)) return { state: 'done', progress: 1 }
      if (['failed', 'fail', 'error'].includes(st)) return { state: 'failed', progress: 1, error: String(j?.data?.message ?? '') }
      return { state: 'running', progress: null }
    },
    async fetch(jobId) {
      const r = await api(`${cfg.queryPath}?id=${encodeURIComponent(jobId)}`)
      const j = await r.json()
      const url = j?.data?.video_url ?? j?.data?.url ?? j?.video_url
      if (!url) throw new Error(`${preset} 查询响应缺少视频地址`)
      return { outputs: [url], meta: { status: 'success' } }
    },
    async health() {
      try { await api(cfg.queryPath + '?id=health-probe'); return { ok: true, quotaRemaining: cfg.dailyQuota } }
      catch { return { ok: false, quotaRemaining: 0 } }
    },
  })
}
