// ComfyUI local provider: official HTTP API (/prompt → /history → /view).
import { randomUUID } from 'node:crypto'
import { assertProvider, type Provider } from '../provider.ts'

export interface ComfyUiOptions {
  baseUrl?: string
  timeoutMs?: number
  fetchImpl?: typeof fetch
}

export function createComfyUIProvider({ baseUrl = 'http://127.0.0.1:8188', timeoutMs = 30000, fetchImpl = fetch }: ComfyUiOptions = {}): Provider {
  const api = async (path: string, opts: RequestInit = {}): Promise<Response> => {
    const res = await fetchImpl(`${baseUrl}${path}`, { signal: AbortSignal.timeout(timeoutMs), ...opts })
    if (!res.ok) throw new Error(`comfyui HTTP ${res.status} ${path}`)
    return res
  }
  return assertProvider({
    id: 'comfyui',
    capabilities: { textToVideo: true, imageToVideo: true, firstLastFrame: false, lipSync: false, tts: false, image: true, maxDurationSec: 30, resolutions: ['720p', '1080p'], qualityTier: 8 },
    async quote() { return { qualityTier: 8, costEstimate: 0, currency: 'local-gpu' } },
    async submit(_stage, spec) {
      const workflow = (spec?.workflow ?? null) as Record<string, unknown> | null
      if (!workflow) throw new Error('comfyui: 缺少 workflow（导演层应通过 buildWorkflow 生成）')
      const r = await api('/prompt', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: workflow, client_id: randomUUID() }),
      })
      const j = (await r.json()) as { prompt_id?: string }
      if (!j.prompt_id) throw new Error(`comfyui submit 失败: ${JSON.stringify(j).slice(0, 200)}`)
      return { jobId: j.prompt_id }
    },
    async status(jobId) {
      const h = (await (await api(`/history/${jobId}`)).json()) as Record<string, unknown>
      if (h[jobId]) return { state: 'done', progress: 1 }
      const q = (await (await api('/queue')).json()) as { queue_running?: unknown[][]; queue_pending?: unknown[][] }
      const active = [...(q.queue_running ?? []), ...(q.queue_pending ?? [])].some((x) => x[1] === jobId)
      return { state: active ? 'running' : 'unknown', progress: null }
    },
    async fetch(jobId) {
      const h = (await (await api(`/history/${jobId}`)).json()) as Record<string, { outputs?: Record<string, unknown>; status?: { status_str?: string } }>
      const entry = h[jobId]
      if (!entry) throw new Error(`comfyui: 无历史 ${jobId}`)
      const files: { url: string; filename: string }[] = []
      for (const outputs of Object.values(entry.outputs ?? {})) {
        const list = Array.isArray(outputs) ? outputs : Object.values(outputs as Record<string, unknown> ?? {})
        for (const o of list.flat()) {
          const item = o as { filename?: string; subfolder?: string; type?: string } | null
          if (item?.filename) {
            files.push({
              url: `${baseUrl}/view?filename=${encodeURIComponent(item.filename)}&subfolder=${item.subfolder ?? ''}&type=${item.type ?? 'output'}`,
              filename: item.filename,
            })
          }
        }
      }
      return { outputs: files.map((f) => f.url), meta: { status: entry.status?.status_str ?? 'success' } }
    },
    async health() {
      try {
        const j = (await (await api('/system_stats')).json()) as { devices?: { name?: string; type?: string }[] }
        const gpu = j.devices?.find((d) => d.type === 'cuda' || d.name)?.name ?? 'unknown'
        return { ok: true, quotaRemaining: Infinity, gpu }
      } catch (e) {
        return { ok: false, error: String(e instanceof Error ? e.message : e) }
      }
    },
  })
}
