// 可灵官方开放平台 API（api-beijing.klingai.com，JWT 鉴权，/v1/videos/text2video）。
import { createHmac } from 'node:crypto'
import { assertProvider, type Provider } from '../provider.ts'

const DEFAULT_BASE = 'https://api-beijing.klingai.com'
const DEFAULT_MODEL = 'kling-v2-6'

function base64url(input: string | Buffer): string {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

export function generateKlingJwt(accessKey: string, secretKey: string, nowMs = Date.now()): string {
  const now = Math.floor(nowMs / 1000)
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = base64url(JSON.stringify({ iss: accessKey, exp: now + 1800, nbf: now - 5, iat: now }))
  const sig = base64url(createHmac('sha256', secretKey).update(`${header}.${payload}`).digest())
  return `${header}.${payload}.${sig}`
}

export function parseKlingKey(apiKey: string): { accessKey: string; secretKey: string } {
  const sep = apiKey.indexOf(':')
  if (sep <= 0) throw new Error('可灵 key 格式应为 "accessKey:secretKey"')
  return { accessKey: apiKey.slice(0, sep), secretKey: apiKey.slice(sep + 1) }
}

export interface KlingOptions {
  apiKey?: string
  baseUrl?: string
  model?: string
  timeoutMs?: number
  fetchImpl?: typeof fetch
}

export function createKlingProvider({ apiKey, baseUrl = DEFAULT_BASE, model = DEFAULT_MODEL, timeoutMs = 120000, fetchImpl = fetch }: KlingOptions = {}): Provider {
  if (!apiKey) throw new Error('kling: 缺少 apiKey')
  const { accessKey, secretKey } = parseKlingKey(apiKey)
  let cachedToken: string | null = null
  const token = (): string => (cachedToken ??= generateKlingJwt(accessKey, secretKey))
  const api = async (method: string, path: string, data?: unknown): Promise<Record<string, any>> => {
    const res = await fetchImpl(`${baseUrl}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!res.ok) throw new Error(`kling HTTP ${res.status} ${path}: ${String((await res.text()).slice(0, 200))}`)
    const j = (await res.json()) as Record<string, any>
    if (j?.code !== undefined && j.code !== 0) throw new Error(`kling code=${j.code} ${j.message ?? ''} ${path}`)
    return j
  }
  return assertProvider({
    id: 'kling',
    capabilities: { textToVideo: true, imageToVideo: true, firstLastFrame: true, lipSync: false, tts: false, image: false, maxDurationSec: 10, resolutions: ['720p', '1080p'], qualityTier: 8 },
    async quote() { return { qualityTier: 8, costEstimate: 0, currency: 'kling-credits' } },
    async health() {
      try { await api('GET', '/v1/videos/text2video/connectivity-test'); return { ok: true, quotaRemaining: null } }
      catch (e) { return { ok: false, error: String(e instanceof Error ? e.message : e).slice(0, 120) } }
    },
    async submit(_stage, spec) {
      const s = (spec ?? {}) as Record<string, any>
      const body: Record<string, unknown> = {
        model_name: s?.model ?? model,
        prompt: s?.positive ?? s?.prompt ?? '',
        negative_prompt: s?.negative ?? '',
        mode: s?.mode ?? 'pro',
        ...(s?.durationSec ? { duration: String(s.durationSec) } : {}),
        ...(s?.aspectRatio ? { aspect_ratio: s.aspectRatio } : {}),
      }
      const j = await api('POST', '/v1/videos/text2video', body)
      const taskId = j?.data?.task_id
      if (!taskId) throw new Error('kling: 缺少 task_id: ' + JSON.stringify(j).slice(0, 200))
      return { jobId: String(taskId) }
    },
    async status(jobId) {
      const j = await api('GET', `/v1/videos/text2video/${jobId}`)
      const st = String(j?.data?.task_status ?? 'unknown')
      if (st === 'succeed') return { state: 'done', progress: 1 }
      if (st === 'failed') return { state: 'failed', progress: 1, error: String(j?.data?.task_status_msg ?? 'failed') }
      return { state: 'running', progress: null }
    },
    async fetch(jobId) {
      const j = await api('GET', `/v1/videos/text2video/${jobId}`)
      const url = j?.data?.task_result?.videos?.[0]?.url
      if (!url) throw new Error('kling: 无视频地址')
      return { outputs: [String(url)], meta: { status: 'success', duration: j.data.task_result.videos[0].duration } }
    },
  })
}
