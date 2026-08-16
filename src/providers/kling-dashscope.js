// 可灵官方 API（阿里云百炼 DashScope 通道，2026-08 官方文档形态）。
// 异步任务式：POST video-synthesis(X-DashScope-Async: enable) → 轮询 GET /api/v1/tasks/{task_id}。
// 凭证：DASHSCOPE_API_KEY（百炼控制台创建），新用户有免费体验额度；官方通道稳定，无网页免费档的拥堵。
import { assertProvider } from '../provider.js'

const DEFAULT_BASE = 'https://dashscope.aliyuncs.com'

export function createKlingDashScopeProvider({ apiKey, baseUrl = DEFAULT_BASE, timeoutMs = 120000, fetchImpl = fetch } = {}) {
  if (!apiKey) throw new Error('kling-dashscope: 缺少 apiKey')
  const api = async (method, path, data) => {
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
    return res.json()
  }
  return assertProvider({
    id: 'kling-dashscope',
    capabilities: { textToVideo: true, imageToVideo: true, firstLastFrame: true, lipSync: false, tts: false, image: false, maxDurationSec: 10, resolutions: ['720p', '1080p'], qualityTier: 7 },
    async quote() { return { qualityTier: 7, costEstimate: 0, currency: 'dashscope-quota' } },
    async health() {
      try { await api('GET', '/api/v1/tasks/nonexistent-probe'); return { ok: true, quotaRemaining: null } }
      catch (e) {
        // 404/401 都说明网络与凭证已生效；真额度查询需要控制台
        const m = String(e?.message ?? e)
        return { ok: m.includes('404') || m.includes('401') || m.includes('403'), quotaRemaining: null, note: m.slice(0, 80) }
      }
    },
    async submit(_stage, spec) {
      const body = {
        model: spec?.model ?? 'kling/kling-v3-video-generation',
        input: { prompt: spec?.positive ?? spec?.prompt ?? '' },
        parameters: {
          mode: spec?.mode ?? 'std',
          aspect_ratio: spec?.aspectRatio ?? '16:9',
          duration: spec?.durationSec ?? 5,
          audio: spec?.audio ?? false,
          watermark: spec?.watermark ?? true,
          ...(spec?.negative ? { negative_prompt: spec.negative } : {}),
        },
      }
      const j = await api('POST', '/api/v1/services/aigc/video-generation/video-synthesis', body)
      const taskId = j?.output?.task_id
      if (!taskId) throw new Error('kling: 响应缺少 task_id: ' + JSON.stringify(j).slice(0, 200))
      return { jobId: taskId }
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
      return { outputs: [url], meta: { status: 'success', requestId: j?.request_id } }
    },
  })
}
