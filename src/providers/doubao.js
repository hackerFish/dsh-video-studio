// 豆包/火山方舟 Seedance 视频生成（官方 API，2026 形态）。
// 端点：https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks（OpenAI 兼容面）
// 任务：POST 创建 → GET /tasks/{id} 轮询（queued/running/succeeded/failed）→ content.video_url
// 凭证：ARK_API_KEY（火山方舟控制台创建，UUID 格式）；新用户有免费体验额度。
import { assertProvider } from '../provider.js'

const DEFAULT_BASE = 'https://ark.cn-beijing.volces.com/api/v3'
const MODELS = ['doubao-seedance-2-0-fast-260128', 'doubao-seedance-2-0-260128']

export function createDoubaoProvider({ apiKey, model = MODELS[0], baseUrl = DEFAULT_BASE, timeoutMs = 120000, fetchImpl = fetch } = {}) {
  if (!apiKey) throw new Error('doubao: 缺少 apiKey')
  const api = async (method, path, data) => {
    const res = await fetchImpl(`${baseUrl}${path}`, {
      method,
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!res.ok) throw new Error(`doubao HTTP ${res.status} ${path}: ${String((await res.text()).slice(0, 200))}`)
    return res.json()
  }
  return assertProvider({
    id: 'doubao',
    capabilities: { textToVideo: true, imageToVideo: true, firstLastFrame: true, lipSync: false, tts: false, image: true, maxDurationSec: 12, resolutions: ['720p', '1080p'], qualityTier: 6, freeQuota: true },
    async quote() { return { qualityTier: 6, costEstimate: 0, currency: 'ark-quota' } },
    async health() {
      try { await api('GET', '/contents/generations/tasks/nonexistent-probe'); return { ok: true, quotaRemaining: null } }
      catch (e) {
        const m = String(e?.message ?? e)
        return { ok: m.includes('404') || m.includes('401') || m.includes('403'), quotaRemaining: null, note: m.slice(0, 80) }
      }
    },
    async submit(_stage, spec) {
      const content = []
      if (spec?.imageUrl) content.push({ type: 'image_url', image_url: { url: spec.imageUrl } })
      content.push({ type: 'text', text: [spec?.positive, spec?.negative ? `（避免：${spec.negative}）` : ''].filter(Boolean).join(' ') || (spec?.prompt ?? '') })
      const j = await api('POST', '/contents/generations/tasks', { model: spec?.model ?? model, content })
      const taskId = j?.id
      if (!taskId) throw new Error('doubao: 缺少任务 id: ' + JSON.stringify(j).slice(0, 200))
      return { jobId: taskId }
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
      return { outputs: [url], meta: { status: 'success' } }
    },
  })
}
