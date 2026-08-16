// 豆包/火山方舟 Seedance（官方 OpenAI 兼容面）。
import { assertProvider, type Provider } from '../provider.ts'

const DEFAULT_BASE = 'https://ark.cn-beijing.volces.com/api/v3'
export const DOUBAO_MODELS: string[] = ['doubao-seedance-2-0-fast-260128', 'doubao-seedance-2-0-260128']

export interface DoubaoOptions {
  apiKey?: string
  model?: string
  baseUrl?: string
  timeoutMs?: number
  fetchImpl?: typeof fetch
}

export function createDoubaoProvider({ apiKey, model = DOUBAO_MODELS[0] ?? '', baseUrl = DEFAULT_BASE, timeoutMs = 120000, fetchImpl = fetch }: DoubaoOptions = {}): Provider {
  if (!apiKey) throw new Error('doubao: 缺少 apiKey')
  const api = async (method: string, path: string, data?: unknown): Promise<Record<string, any>> => {
    const res = await fetchImpl(`${baseUrl}${path}`, {
      method,
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!res.ok) throw new Error(`doubao HTTP ${res.status} ${path}: ${String((await res.text()).slice(0, 200))}`)
    return res.json() as Promise<Record<string, any>>
  }
  return assertProvider({
    id: 'doubao',
    capabilities: { textToVideo: true, imageToVideo: true, firstLastFrame: true, lipSync: false, tts: false, image: true, maxDurationSec: 12, resolutions: ['720p', '1080p'], qualityTier: 6, freeQuota: true },
    async quote() { return { qualityTier: 6, costEstimate: 0, currency: 'ark-quota' } },
    async health() {
      try { await api('GET', '/contents/generations/tasks/nonexistent-probe'); return { ok: true, quotaRemaining: null } }
      catch (e) {
        const m = String(e instanceof Error ? e.message : e)
        return { ok: m.includes('404') || m.includes('401') || m.includes('403'), quotaRemaining: null, note: m.slice(0, 80) }
      }
    },
    async submit(_stage, spec) {
      const s = (spec ?? {}) as Record<string, any>
      const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = []
      if (s?.imageUrl) content.push({ type: 'image_url', image_url: { url: String(s.imageUrl) } })
      content.push({ type: 'text', text: [s?.positive, s?.negative ? `（避免：${s.negative}）` : ''].filter(Boolean).join(' ') || (s?.prompt ?? '') })
      const j = await api('POST', '/contents/generations/tasks', { model: s?.model ?? model, content })
      const taskId = j?.id
      if (!taskId) throw new Error('doubao: 缺少任务 id: ' + JSON.stringify(j).slice(0, 200))
      return { jobId: String(taskId) }
    },
    async status(jobId) {
      const j = await api('GET', `/contents/generations/tasks/${jobId}`)
      const st = String(j?.status ?? 'unknown').toLowerCase()
      if (st === 'succeeded') return { state: 'done', progress: 1 }
      if (st === 'failed') return { state: 'failed', progress: 1, error: String(j?.error?.message ?? 'failed') }
      if (st === 'cancelled') return { state: 'failed', progress: 1, error: 'cancelled' }
      return { state: 'running', progress: null }
    },
    async fetch(jobId) {
      const j = await api('GET', `/contents/generations/tasks/${jobId}`)
      const url = j?.content?.video_url
      if (!url) throw new Error('doubao: 无 video_url: ' + JSON.stringify(j?.content ?? {}).slice(0, 150))
      return { outputs: [String(url)], meta: { status: 'success' } }
    },
  })
}
