// 可灵官方「对口型」适配器（Kling 官方 API 3-13 章节：/v1/videos/lip-sync，JWT 鉴权）。
// 两种模式：audio2video（自带音频，漫剧 TTS 后对口型）/ text2video（官方音色直接生成语音+口型）。
// 契约来源：https://github.com/199-mcp/mcp-kling/blob/main/kling-api-docs.md （官方文档镜像，字段逐条对齐）

import { assertProvider, type Provider } from '../provider.ts'
import { generateKlingJwt, parseKlingKey } from './kling.ts'

const DEFAULT_BASE = 'https://api-beijing.klingai.com'

export interface KlingLipsyncOptions {
  apiKey?: string
  baseUrl?: string
  timeoutMs?: number
  fetchImpl?: typeof fetch
}

export function createKlingLipsyncProvider({ apiKey, baseUrl = DEFAULT_BASE, timeoutMs = 120000, fetchImpl = fetch }: KlingLipsyncOptions = {}): Provider {
  if (!apiKey) throw new Error('kling-lipsync: 缺少 apiKey')
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
    if (!res.ok) throw new Error(`kling-lipsync HTTP ${res.status} ${path}: ${String((await res.text()).slice(0, 200))}`)
    const j = (await res.json()) as Record<string, any>
    if (j?.code !== undefined && j.code !== 0) throw new Error(`kling-lipsync code=${j.code} ${j.message ?? ''} ${path}`)
    return j
  }

  return assertProvider({
    id: 'kling-lipsync',
    capabilities: { lipSync: true, tts: true, textToVideo: false, imageToVideo: false, maxDurationSec: 10, resolutions: ['720p', '1080p'], qualityTier: 8 },
    async quote() { return { qualityTier: 8, costEstimate: 0, currency: 'kling-credits' } },
    async health() {
      // JWT 全局有效：用 text2video 的连通性接口验 key，不触发对口型计费
      try { await api('GET', '/v1/videos/text2video/connectivity-test'); return { ok: true, quotaRemaining: null } }
      catch (e) { return { ok: false, error: String(e instanceof Error ? e.message : e).slice(0, 120) } }
    },
    async submit(_stage, spec) {
      const s = (spec ?? {}) as Record<string, any>
      const mode = s?.mode ?? (s?.audioUrl || s?.audioBase64 ? 'audio2video' : 'text2video')
      const input: Record<string, unknown> = { mode }
      if (s?.videoId) input.video_id = String(s.videoId)
      else if (s?.videoUrl) input.video_url = String(s.videoUrl)
      else throw new Error('kling-lipsync: 需要 videoId 或 videoUrl（2-10s，720p/1080p）')
      if (mode === 'audio2video') {
        if (s?.audioUrl) { input.audio_type = 'url'; input.audio_url = String(s.audioUrl) }
        else if (s?.audioBase64) { input.audio_type = 'file'; input.audio_file = String(s.audioBase64) }
        else throw new Error('kling-lipsync: audio2video 需要 audioUrl 或 audioBase64（mp3/wav/m4a/aac ≤5MB）')
      } else if (mode === 'text2video') {
        if (!s?.text) throw new Error('kling-lipsync: text2video 需要 text（≤120 字）')
        if (!s?.voiceId) throw new Error('kling-lipsync: text2video 需要 voiceId（可灵控制台音色列表）')
        input.text = String(s.text).slice(0, 120)
        input.voice_id = String(s.voiceId)
        input.voice_language = String(s.voiceLanguage ?? 'zh')
        input.voice_speed = Number(s.voiceSpeed ?? 1.0)
      } else {
        throw new Error(`kling-lipsync: 未知 mode ${String(mode)}（text2video/audio2video）`)
      }
      const body: Record<string, unknown> = { input }
      if (s?.callbackUrl) body.callback_url = String(s.callbackUrl)
      const j = await api('POST', '/v1/videos/lip-sync', body)
      const taskId = j?.data?.task_id
      if (!taskId) throw new Error('kling-lipsync: 缺少 task_id: ' + JSON.stringify(j).slice(0, 200))
      return { jobId: String(taskId) }
    },
    async status(jobId) {
      const j = await api('GET', `/v1/videos/lip-sync/${jobId}`)
      const st = String(j?.data?.task_status ?? 'unknown')
      if (st === 'succeed') return { state: 'done', progress: 1 }
      if (st === 'failed') return { state: 'failed', progress: 1, error: String(j?.data?.task_status_msg ?? 'failed') }
      return { state: 'running', progress: null }
    },
    async fetch(jobId) {
      const j = await api('GET', `/v1/videos/lip-sync/${jobId}`)
      const url = j?.data?.task_result?.videos?.[0]?.url
      if (!url) throw new Error('kling-lipsync: 无视频地址')
      return { outputs: [String(url)], meta: { status: 'success', duration: j.data.task_result.videos[0].duration } }
    },
  })
}
