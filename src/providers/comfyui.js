// ComfyUI 本地供应商：通过官方 HTTP API（/prompt → /history → /view）驱动本地 ComfyUI。
// 无 GPU/无 ComfyUI 时 health() 返回不可用，调度器会自动降级到其它供应商。
import { randomUUID } from 'node:crypto'
import { assertProvider } from '../provider.ts'

export function createComfyUIProvider({ baseUrl = 'http://127.0.0.1:8188', timeoutMs = 30000 } = {}) {
  const api = async (path, opts = {}) => {
    const res = await fetch(`${baseUrl}${path}`, { signal: AbortSignal.timeout(timeoutMs), ...opts })
    if (!res.ok) throw new Error(`comfyui HTTP ${res.status} ${path}`)
    return res
  }
  return assertProvider({
    id: 'comfyui',
    capabilities: {
      textToVideo: true, imageToVideo: true, firstLastFrame: false, lipSync: false, tts: false,
      image: true, maxDurationSec: 30, resolutions: ['720p', '1080p'], qualityTier: 8,
    },
    async quote() { return { qualityTier: 8, costEstimate: 0, currency: 'local-gpu' } },
    async submit(_stage, spec) {
      if (!spec?.workflow) throw new Error('comfyui: 缺少 workflow（导演层应通过 buildWorkflow 生成）')
      const r = await api('/prompt', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: spec.workflow, client_id: randomUUID() }),
      })
      const j = await r.json()
      if (!j.prompt_id) throw new Error(`comfyui submit 失败: ${JSON.stringify(j).slice(0, 200)}`)
      return { jobId: j.prompt_id }
    },
    async status(jobId) {
      const h = await api(`/history/${jobId}`)
      const hj = await h.json()
      if (hj[jobId]) return { state: 'done', progress: 1 }
      const q = await (await api('/queue')).json()
      const active = [...(q.queue_running ?? []), ...(q.queue_pending ?? [])].some((x) => x[1] === jobId)
      return { state: active ? 'running' : 'unknown', progress: null }
    },
    async fetch(jobId) {
      const h = await api(`/history/${jobId}`)
      const hj = await h.json()
      const entry = hj[jobId]
      if (!entry) throw new Error(`comfyui: 无历史 ${jobId}`)
      const files = []
      for (const outputs of Object.values(entry.outputs ?? {})) {
        const list = Array.isArray(outputs) ? outputs : Object.values(outputs ?? {})
        for (const o of list.flat()) {
          if (o?.filename) {
            files.push({
              url: `${baseUrl}/view?filename=${encodeURIComponent(o.filename)}&subfolder=${o.subfolder ?? ''}&type=${o.type ?? 'output'}`,
              filename: o.filename,
            })
          }
        }
      }
      return { outputs: files.map((f) => f.url), meta: { status: entry.status?.status_str ?? 'success' } }
    },
    async health() {
      try {
        const j = await (await api('/system_stats')).json()
        const gpu = j?.devices?.find((d) => d.type === 'cuda' || d.name)?.name ?? 'unknown'
        return { ok: true, quotaRemaining: Infinity, gpu }
      } catch (e) {
        return { ok: false, error: String(e?.message ?? e) }
      }
    },
  })
}
