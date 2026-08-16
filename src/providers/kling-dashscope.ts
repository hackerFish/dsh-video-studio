// DashScope 视频生成通用工厂（阿里云百炼异步任务协议）：可灵与通义万相共用。
import { assertProvider, type Provider } from '../provider.ts'

const DEFAULT_BASE = 'https://dashscope.aliyuncs.com'

export interface DashScopeVideoOptions {
  apiKey?: string
  model?: string
  baseUrl?: string
  timeoutMs?: number
  fetchImpl?: typeof fetch
  id?: string
  qualityTier?: number
}

export function createDashScopeVideoProvider({ apiKey, model, baseUrl = DEFAULT_BASE, timeoutMs = 120000, fetchImpl = fetch, id = 'dashscope-video', qualityTier = 7 }: DashScopeVideoOptions = {}): Provider {
  if (!apiKey) throw new Error(`${id}: 缺少 apiKey`)
  if (!model) throw new Error(`${id}: 缺少 model`)
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
    if (!res.ok) throw new Error(`${id} HTTP ${res.status} ${path}: ${String((await res.text()).slice(0, 200))}`)
    return res.json() as Promise<Record<string, any>>
  }
  return assertProvider({
    id,
    capabilities: { textToVideo: true, imageToVideo: true, firstLastFrame: true, lipSync: false, tts: false, image: false, maxDurationSec: 10, resolutions: ['720p', '1080p'], qualityTier },
    async quote() { return { qualityTier, costEstimate: 0, currency: 'dashscope-quota' } },
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
        model: s?.model ?? model,
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
      if (!taskId) throw new Error(`${id}: 响应缺少 task_id: ` + JSON.stringify(j).slice(0, 200))
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
      if (!url) throw new Error(`${id}: 未找到 video_url: ` + JSON.stringify(j?.output ?? {}).slice(0, 200))
      return { outputs: [String(url)], meta: { status: 'success', requestId: j?.request_id } }
    },
  })
}

/** 可灵 via DashScope 预设。 */
export function createKlingDashScopeProvider(opts: Omit<DashScopeVideoOptions, 'model' | 'id'> & { apiKey?: string }): Provider {
  return createDashScopeVideoProvider({ ...opts, model: 'kling/kling-v3-video-generation', id: 'kling-dashscope', qualityTier: 7 })
}
