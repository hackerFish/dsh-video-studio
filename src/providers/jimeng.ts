// 即梦官方端点直连适配器（2026-08 实测形态：aigc_draft/generate + get_history_by_ids）。
// 免费档模型 vgfm_lite 实测可用；高峰 SystemBusy 不扣额度（credits_consume=0），错峰重试。
import { randomUUID } from 'node:crypto'
import { assertProvider, type Provider } from '../provider.ts'

const BASE = 'https://jimeng.jianying.com'
export const MODEL_KEYS: string[] = [
  'dreamina_ic_generate_video_model_vgfm_lite',      // 免费档（2026-08-16 实测可用）
  'dreamina_ic_generate_video_model_vgfm_3.0',      // 已退役（ret 2061）
  'dreamina_ic_generate_video_model_vgfm_3.0_pro',  // 需付费积分（ret 1006）
  'dreamina_ic_generate_video_model_vgfm1.0',
]
const DEFAULT_MODEL_KEY = MODEL_KEYS[0] ?? ''
const DRAFT_VERSION = '3.2.8'
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'

const uuid = (): string => randomUUID().replace(/-/g, '')
const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))

export interface JimengDraftOptions {
  prompt: string
  width: number
  height: number
  resolution?: string
  durationMs?: number
  modelKey?: string
}

export function buildJimengDraftContent({ prompt, width, height, resolution = '720p', durationMs = 5000, modelKey = DEFAULT_MODEL_KEY }: JimengDraftOptions): Record<string, unknown> {
  const componentId = uuid()
  const divisor = gcd(width, height)
  const aspectRatio = `${width / divisor}:${height / divisor}`
  const metricsExtra = JSON.stringify({ enterFrom: 'click', isDefaultSeed: 1, promptSource: 'custom', isRegenerate: false, originSubmitId: uuid() })
  return {
    extend: {
      root_model: modelKey,
      m_video_commerce_info: { benefit_type: 'basic_video_operation_vgfm_v_three', resource_id: 'generate_video', resource_id_type: 'str', resource_sub_type: 'aigc' },
      m_video_commerce_info_list: [{ benefit_type: 'basic_video_operation_vgfm_v_three', resource_id: 'generate_video', resource_id_type: 'str', resource_sub_type: 'aigc' }],
    },
    submit_id: uuid(),
    metrics_extra: metricsExtra,
    draft_content: JSON.stringify({
      type: 'draft', id: uuid(), min_version: '3.0.5', is_from_tsn: true, version: DRAFT_VERSION, main_component_id: componentId,
      component_list: [{
        type: 'video_base_component', id: componentId, min_version: '1.0.0',
        metadata: { type: '', id: uuid(), created_platform: 3, created_platform_version: '', created_time_in_ms: Date.now(), created_did: '' },
        generate_type: 'gen_video', aigc_mode: 'workbench',
        abilities: { type: '', id: uuid(), gen_video: { id: uuid(), type: '',
          text_to_video_params: { type: '', id: uuid(), model_req_key: modelKey, priority: 0,
            seed: Math.floor(Math.random() * 100000000) + 2500000000,
            video_aspect_ratio: aspectRatio,
            video_gen_inputs: [{ duration_ms: durationMs, first_frame_image: undefined, end_frame_image: undefined, fps: 24, id: uuid(), min_version: '3.0.5', prompt, resolution, type: '', video_mode: 2 }],
            video_task_extra: metricsExtra,
          } } },
      }],
    }),
    http_common_info: { aid: Number('513695') },
  }
}

const VIDEO_URL_RE = /https:\/\/v[0-9]+-artist\.vlabvod\.com\/[^"\s\\]+/

export interface JimengPoll {
  state: 'done' | 'running' | 'failed'
  progress: number | null
  videoUrl: string | null
  error?: string
  retryable?: boolean
  rawItem: unknown
}

export interface JimengOptions {
  sessionId?: string
  timeoutMs?: number
  fetchImpl?: typeof fetch
}

export type JimengProvider = Provider & { poll(jobId: string): Promise<JimengPoll> }

export function createJimengProvider({ sessionId, timeoutMs = 60000, fetchImpl = fetch }: JimengOptions = {}): JimengProvider {
  if (!sessionId) throw new Error('jimeng: 缺少 sessionId')
  const headers: Record<string, string> = {
    Cookie: `sessionid=${sessionId}; sessionid_ss=${sessionId}`,
    Origin: BASE,
    Referer: `${BASE}/ai-tool/video/generate`,
    'Content-Type': 'application/json',
    'User-Agent': UA,
  }
  const req = async (method: string, path: string, data?: unknown, opts: { retryBusy?: number } = {}): Promise<Record<string, any>> => {
    let last: Record<string, any> = {}
    const retryBusy = opts.retryBusy ?? 3
    for (let attempt = 0; attempt <= retryBusy; attempt++) {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 3000 * attempt))
      const res = await fetchImpl(`${BASE}${path}`, { method, headers, body: data ? JSON.stringify(data) : undefined, signal: AbortSignal.timeout(timeoutMs) })
      if (!res.ok) throw new Error(`jimeng HTTP ${res.status} ${path}`)
      const j = (await res.json()) as Record<string, any>
      last = j
      if (!(j && j.ret !== undefined && String(j.ret) !== '0')) return j
      if (String(j.ret) !== '1014') throw new Error(`jimeng ret=${j.ret} ${j.errmsg ?? ''} ${path}`)
    }
    throw new Error(`jimeng ret=1014 重试耗尽 ${path}`)
  }
  const poll = async (jobId: string): Promise<JimengPoll> => {
    const j = await req('POST', '/mweb/v1/get_history_by_ids', { history_ids: [jobId] })
    const entry = (j?.data?.[String(jobId)] ?? j?.history_list?.[0] ?? null) as Record<string, any> | null
    const raw = JSON.stringify(j)
    const url = raw.match(VIDEO_URL_RE)?.[0] ?? null
    const videoUrl: string | null = url
      ?? entry?.item_list?.find((x: any) => x?.item_urls || x?.video?.url)?.['item_urls']?.[0]
      ?? entry?.item_list?.[0]?.video?.url
      ?? entry?.video_url
      ?? null
    const failed = entry?.failed_item_list?.[0]?.gen_result_data ?? null
    const status = entry?.task?.status ?? entry?.status ?? (videoUrl ? 30 : 20)
    if (videoUrl) return { state: 'done', progress: 1, videoUrl, rawItem: entry }
    if (failed?.result_msg) return { state: 'failed', progress: 1, error: String(failed.result_msg), retryable: failed.result_msg === 'SystemBusy', videoUrl: null, rawItem: entry }
    if (status === 30) return { state: 'done', progress: 1, videoUrl: null, rawItem: entry }
    return { state: 'running', progress: null, videoUrl: null, rawItem: entry }
  }
  return assertProvider({
    id: 'jimeng',
    capabilities: { textToVideo: true, imageToVideo: true, firstLastFrame: true, lipSync: false, tts: false, image: true, maxDurationSec: 5, resolutions: ['720p'], qualityTier: 3, freeQuota: true, dailyQuota: 66 },
    async quote() { return { qualityTier: 3, costEstimate: 0, currency: 'jimeng-credits' } },
    async health() {
      try {
        const j = await req('POST', '/commerce/v1/benefits/user_credit', {}, { retryBusy: 1 })
        const c = j?.data ?? {}
        return { ok: true, quotaRemaining: (c.gift_credit ?? 0) + (c.purchase_credit ?? 0) + (c.vip_credit ?? 0), detail: c }
      } catch (e) {
        return { ok: false, quotaRemaining: null, error: String(e instanceof Error ? e.message : e).slice(0, 120) }
      }
    },
    async ensureCredits() {
      try {
        const h = await this.health()
        if (h.quotaRemaining !== null && h.quotaRemaining !== undefined && h.quotaRemaining <= 0) {
          const r = await req('POST', '/commerce/v1/benefits/credit_receive', {})
          return { received: true, remaining: r?.data?.cur_total_credits ?? null }
        }
        return { received: false, remaining: h.quotaRemaining ?? null }
      } catch (e) {
        return { received: false, remaining: null, note: String(e instanceof Error ? e.message : e).slice(0, 100) }
      }
    },
    async submit(_stage, spec) {
      const s = (spec ?? {}) as Record<string, any>
      const { positive, negative, width = 720, height = 1280, resolution = '720p', durationSec = 5, modelKey } = s
      await this.ensureCredits?.()
      const prompt = [positive, negative ? `（避免：${negative}）` : ''].filter(Boolean).join(' ')
      const body = buildJimengDraftContent({ prompt, width, height, resolution, durationMs: Math.round(durationSec * 1000), modelKey: modelKey ?? DEFAULT_MODEL_KEY })
      const j = await req('POST', `/mweb/v1/aigc_draft/generate?aigc_features=app_lip_sync&web_version=6.6.0&da_version=${DRAFT_VERSION}`, body)
      const historyId = j?.data?.aigc_data?.history_record_id ?? j?.aigc_data?.history_record_id
      if (!historyId) throw new Error('jimeng: 响应缺少 history_record_id: ' + JSON.stringify(j).slice(0, 300))
      return { jobId: String(historyId) }
    },
    async status(jobId) {
      const p = await poll(jobId)
      return { state: p.state, progress: p.progress, error: p.state === 'failed' ? p.error : undefined }
    },
    async fetch(jobId) {
      const p = await poll(jobId)
      if (!p.videoUrl) throw new Error('jimeng: 尚未完成或未找到视频地址')
      return { outputs: [p.videoUrl], meta: { status: 'success' } }
    },
    poll,
  })
}
