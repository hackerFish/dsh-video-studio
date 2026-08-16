// 可灵 via 阿里云百炼 DashScope（官方异步任务式 API）。
import { assertProvider, type Provider } from '../provider.ts'

const DEFAULT_BASE = 'https://dashscope.aliyuncs.com'

export interface KlingDashScopeOptions {
  apiKey?: string
  baseUrl?: string
  timeoutMs?: number
  fetchImpl?: typeof fetch
}

export function createKlingDashScopeProvider({ apiKey, baseUrl = DEFAULT_BASE, timeoutMs = 120000, fetchImpl = fetch }: KlingDashScopeOptions = {}): Provider {
  if (!apiKey) throw new Error('kling-dashscope: 缺少 apiKey')
  const api = async (method: string, path: string, data?: unknown): Promise<Record<string, any>> => {
    const res = await fetchImpl(`${baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...(path.endsWith('video-synthesis') ? { 'X-DashScope-Async': 'enable' } : {}),
      },
      body: data ? JSON.stringify(data) : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!res.ok) throw new Error(`kling HTTP ${res.status} ${path}: ${String((await res.text()).slice(0, 200))}`)
    return res.json() as Promise<Record<string, any>>
  }
  return assertProvider({
    id: 'kling-dashscope',
    capabilities: { textToVideo: true, imageToVideo: true, firstLastFrame: true, lipSync: false, tts: false, image: false, maxDurationSec: 10, resolutions: ['720p', '1080p'], qualityTier: 7 },
    async quote() { return { qualityTier: 7, costEstimate: 0, currency: 'dashscope-quota' } },
    async health() {
      try { await api('GET', '/api/v1/tasks/nonexistent-probe'); return { ok: true, quotaRemaining: null } }
      catch (e) {
        const m = String(e instanceof Error ? e.message : e)
        return { ok: m.includes('404') || m.includes('401') || m.includes('403'), quotaRemaining: null, note: m.slice(0, 80) }
      }
    },
    async submit(_stage, spec) {
      const s = (spec ?? {}) as Record<string, any>
      const body: Record<string, unknown> = {
        model: s?.model ?? 'kling/kling-v3-video-generation',
        input: { prompt: s?.positive ?? s?.prompt ?? '' },
        parameters: {
          mode: s?.mode ?? 'std',
          aspect_ratio: s?.aspectRatio ?? '16:9',
          duration: s?.durationSec ?? 5,
          audio: s?.audio ?? false,
          watermark: s?.watermark ?? true,
          ...(s?.negative ? { negative_prompt: s.negative } : {}),
        },
      }
      const j = await api('POST', '/api/v1/services/aigc/video-generation/video-synthesis', body)
      const taskId = j?.output?.task_id
      if (!taskId) throw new Error('kling: 响应缺少 task_id: ' + JSON.stringify(j).slice(0, 200))
      return { jobId: String(taskId) }
    },
    async status(jobId) {
      const j = await api('GET', `/api/v1/tasks/${jobId}`)
      const st = String(j?.output?.task_status ?? 'UNKNOWN').toUpperCase()
      if (st === 'SUCCEEDED') return { state: 'done', progress: 1 }
      if (st === 'FAILED') return { state: 'failed', progress: 1, error: String(j?.output?.message ?? j?.output?.code ?? 'FAILED') }
      return { state: 'running', progress: null }
    },
    async fetch(jobId) {
      const j = await api('GET', `/api/v1/tasks/${jobId}`)
      const url = j?.output?.video_url ?? j?.output?.video?.url
      if (!url) throw new Error('kling: 未找到 video_url: ' + JSON.stringify(j?.output ?? {}).slice(0, 200))
      return { outputs: [String(url)], meta: { status: 'success', requestId: j?.request_id } }
    },
  })
}
