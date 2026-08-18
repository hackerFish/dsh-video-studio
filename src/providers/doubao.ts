// 豆包/火山方舟（ARK）适配器：Seedance 视频（异步任务）+ Seedream 文生图。
// 2026-08 对照真实开源实现吸收（nsmao-com/seedream-mcp + api-evangelist/doubao OpenAPI）：
//  - 请求体顶层字段 ratio/duration/generate_audio/watermark/callback_url
//  - 任务状态 queued/running/succeeded/failed/expired/cancelled
//  - 响应防御性提取（id/content.video_url 多层兜底）
//  - 模型 ID 全部为当前 API 可调用版本（Seedance 2.0 官方仅控制台，无 API）
import { assertProvider, type Provider } from '../provider.ts'

const DEFAULT_BASE = 'https://ark.cn-beijing.volces.com/api/v3'
// Seedance 视频（当前 API 可用版本；2.0 官方仅控制台体验，不接 API）
export const DOUBAO_MODELS: string[] = ['doubao-seedance-1-5-pro-251215', 'doubao-seedance-1-0-pro-250528', 'doubao-seedance-1-0-lite-t2v-250428']
// Seedream 文生图（资产图用；4.5/5.0 支持组图与编辑）
export const DOUBAO_IMAGE_MODELS: string[] = ['doubao-seedream-5-0-lite-260128', 'doubao-seedream-5-0-260128', 'doubao-seedream-4-5-251128', 'doubao-seedream-4-0-250828']
// Seedance 官方支持的比例与时长
export const SEEDANCE_RATIOS = ['adaptive', '16:9', '4:3', '1:1', '3:4', '9:16', '21:9'] as const
export const SEEDANCE_DURATIONS = [5, 10] as const

export interface DoubaoOptions {
  apiKey?: string
  model?: string
  imageModel?: string
  baseUrl?: string
  timeoutMs?: number
  fetchImpl?: typeof fetch
}

function extractTaskId(j: Record<string, any>): string | null {
  const id = j?.id ?? j?.data?.id ?? j?.task_id ?? j?.data?.task_id
  return typeof id === 'string' && id ? id : null
}

function extractVideoUrl(j: Record<string, any>): string | null {
  const url = j?.content?.video_url ?? j?.data?.content?.video_url ?? j?.video_url ?? j?.data?.video_url
  return typeof url === 'string' && url ? url : null
}

export function createDoubaoProvider({ apiKey, model = DOUBAO_MODELS[0] ?? '', imageModel = DOUBAO_IMAGE_MODELS[0] ?? '', baseUrl = DEFAULT_BASE, timeoutMs = 120000, fetchImpl = fetch }: DoubaoOptions = {}): Provider {
  if (!apiKey) throw new Error('doubao: 缺少 apiKey（火山方舟 API Key 或 ep-xxx 推理接入点）')
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
    capabilities: { textToVideo: true, imageToVideo: true, firstLastFrame: true, lipSync: false, tts: false, image: true, maxDurationSec: 10, resolutions: ['720p', '1080p'], qualityTier: 6 },
    async quote() { return { qualityTier: 6, costEstimate: 0, currency: 'ark-credits' } },
    async health() {
      try { await api('GET', '/contents/generations/tasks/nonexistent-probe'); return { ok: true, quotaRemaining: null } }
      catch (e) {
        const m = String(e instanceof Error ? e.message : e)
        return { ok: m.includes('404') || m.includes('401') || m.includes('403'), quotaRemaining: null, note: m.slice(0, 80) }
      }
    },
    async submit(stage, spec) {
      const s = (spec ?? {}) as Record<string, any>
      // 资产图阶段：Seedream 文生图（OpenAI 兼容 images 端点）
      if (stage === 'shot-assets' || stage === 'master-asset') {
        const j = await api('POST', '/images/generations', {
          model: s?.model ?? imageModel,
          prompt: s?.positive ?? s?.prompt ?? '',
          size: s?.size ?? '1024x1024',
          n: s?.n ?? 1,
          response_format: 'url',
        })
        const url = j?.data?.[0]?.url ?? j?.data?.[0]?.b64_json
        if (!url) throw new Error('doubao-image: 无图片输出: ' + JSON.stringify(j).slice(0, 200))
        // b64_json 兜底转 data URI，保证 fetch 阶段可下载
        const out = typeof url === 'string' && url.startsWith('http') ? url : `data:image/png;base64,${url}`
        return { jobId: String(out) }
      }
      // 视频阶段：Seedance 异步任务
      const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = []
      if (s?.imageUrl) content.push({ type: 'image_url', image_url: { url: String(s.imageUrl) } })
      content.push({ type: 'text', text: [s?.positive, s?.negative ? `（避免：${s.negative}）` : ''].filter(Boolean).join(' ') || (s?.prompt ?? '') })
      const duration = (SEEDANCE_DURATIONS as readonly number[]).includes(Number(s?.durationSec)) ? Number(s.durationSec) : 5
      const ratio = SEEDANCE_RATIOS.includes(s?.aspectRatio ?? '') ? s.aspectRatio : 'adaptive'
      const body: Record<string, unknown> = {
        model: s?.model ?? model,
        content,
        ratio,
        duration,
        generate_audio: s?.generateAudio ?? true,
        watermark: s?.watermark ?? false,
      }
      if (s?.callbackUrl) body.callback_url = String(s.callbackUrl)
      const j = await api('POST', '/contents/generations/tasks', body)
      const taskId = extractTaskId(j)
      if (!taskId) throw new Error('doubao: 缺少任务 id: ' + JSON.stringify(j).slice(0, 200))
      return { jobId: String(taskId) }
    },
    async status(jobId) {
      if (/^https?:|^data:/.test(jobId)) return { state: 'done', progress: 1 } // Seedream 同步图片
      const j = await api('GET', `/contents/generations/tasks/${jobId}`)
      const st = String(j?.status ?? j?.data?.status ?? 'unknown').toLowerCase()
      if (st === 'succeeded') return { state: 'done', progress: 1 }
      if (st === 'failed' || st === 'cancelled' || st === 'expired') {
        return { state: 'failed', progress: 1, error: String(j?.error?.message ?? st) }
      }
      return { state: 'running', progress: null }
    },
    async fetch(jobId) {
      if (/^https?:/.test(jobId)) return { outputs: [jobId], meta: { status: 'success' } }
      if (/^data:/.test(jobId)) return { outputs: [jobId], meta: { status: 'success', note: 'Seedream b64 兜底' } }
      const j = await api('GET', `/contents/generations/tasks/${jobId}`)
      const url = extractVideoUrl(j)
      if (!url) throw new Error('doubao: 无 video_url: ' + JSON.stringify(j?.content ?? j ?? {}).slice(0, 150))
      return { outputs: [String(url)], meta: { status: 'success' } }
    },
  })
}
