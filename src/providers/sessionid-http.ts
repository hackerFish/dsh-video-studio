// Generic sessionid provider (web free-quota channel) with platform presets.
import { randomUUID } from 'node:crypto'
import { assertProvider, type Provider } from '../provider.ts'

export interface SessionIdPreset {
  label: string
  baseUrl: string
  submitPath: string
  queryPath: string
  dailyQuota: number
}

export const SESSIONID_PRESETS: Record<string, SessionIdPreset> = {
  jimeng: {
    label: '即梦（免费额度）',
    baseUrl: 'https://jimeng.jianying.com',
    // UNVERIFIED legacy shape — the verified direct adapter is providers/jimeng.ts
    submitPath: '/mweb/v1/generate_video',
    queryPath: '/mweb/v1/generate_video/query',
    dailyQuota: 66,
  },
  kling: {
    label: '可灵（免费额度）',
    baseUrl: 'https://app.klingai.com',
    submitPath: '/api/animation/v3/generate',
    queryPath: '/api/animation/v3/generate/query',
    dailyQuota: 66,
  },
}

export interface SessionIdOptions {
  preset: string
  sessionId?: string
  baseUrl?: string | null
  timeoutMs?: number
  fetchImpl?: typeof fetch
}

export function createSessionIdProvider({ preset, sessionId, baseUrl = null, timeoutMs = 60000, fetchImpl = fetch }: SessionIdOptions): Provider {
  if (!SESSIONID_PRESETS[preset]) throw new Error(`未知 sessionid 预设: ${preset}（可选 ${Object.keys(SESSIONID_PRESETS).join('/')}）`)
  if (!sessionId) throw new Error(`${preset}: 缺少 sessionId（从官网登录态自取，勿提交进仓库）`)
  const cfg: SessionIdPreset = { ...SESSIONID_PRESETS[preset], baseUrl: baseUrl ?? SESSIONID_PRESETS[preset].baseUrl }
  const api = async (path: string, opts: RequestInit = {}): Promise<unknown> => {
    const res = await fetchImpl(`${cfg.baseUrl}${path}`, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { Authorization: `Bearer ${sessionId}`, 'Content-Type': 'application/json', ...(opts.headers as Record<string, string> ?? {}) },
      ...opts,
    })
    if (!res.ok) throw new Error(`${preset} HTTP ${res.status} ${path}`)
    return res.json()
  }
  const asRecord = (v: unknown): Record<string, any> => (v && typeof v === 'object' ? v as Record<string, any> : {})
  return assertProvider({
    id: `sessionid-${preset}`,
    capabilities: { textToVideo: true, imageToVideo: true, firstLastFrame: false, lipSync: false, tts: false, image: true, maxDurationSec: 10, resolutions: ['720p'], qualityTier: 2, freeQuota: true, dailyQuota: cfg.dailyQuota },
    async quote() { return { qualityTier: 2, costEstimate: 0, currency: 'free-quota' } },
    async submit(_stage, spec) {
      const body = {
        prompt: spec?.positive ?? spec?.prompt ?? '',
        negative_prompt: spec?.negative ?? '',
        width: spec?.width ?? 1080, height: spec?.height ?? 1920,
        duration: spec?.durationSec ?? 5,
        req_id: randomUUID(),
      }
      const j = asRecord(await api(cfg.submitPath, { method: 'POST', body: JSON.stringify(body) }))
      const jobId = j?.data?.task_id ?? j?.data?.id ?? j?.id ?? j?.task_id
      if (!jobId) throw new Error(`${preset} submit 响应缺少任务 id: ${JSON.stringify(j).slice(0, 200)}`)
      return { jobId: String(jobId) }
    },
    async status(jobId) {
      const j = asRecord(await api(`${cfg.queryPath}?id=${encodeURIComponent(jobId)}`))
      const st = String(j?.data?.status ?? j?.status ?? 'unknown').toLowerCase()
      if (['success', 'succeed', 'done', 'complete'].includes(st)) return { state: 'done', progress: 1 }
      if (['failed', 'fail', 'error'].includes(st)) return { state: 'failed', progress: 1, error: String(j?.data?.message ?? '') }
      return { state: 'running', progress: null }
    },
    async fetch(jobId) {
      const j = asRecord(await api(`${cfg.queryPath}?id=${encodeURIComponent(jobId)}`))
      const url = j?.data?.video_url ?? j?.data?.url ?? j?.video_url
      if (!url) throw new Error(`${preset} 查询响应缺少视频地址`)
      return { outputs: [String(url)], meta: { status: 'success' } }
    },
    async health() {
      try { await api(`${cfg.queryPath}?id=health-probe`); return { ok: true, quotaRemaining: cfg.dailyQuota } }
      catch { return { ok: false, quotaRemaining: 0 } }
    },
  })
}
