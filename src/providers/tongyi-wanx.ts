// 通义万相 web 通道（免费额度路线，2026-08-16 真机实测版协议）。
// 免费档仅文生图（视频需会员）→ 定位：漫剧"一致性静帧"供应商。
import { assertProvider, type Provider } from '../provider.ts'

const BASE = 'https://wanx.biz.aliyun.com/wanx/api'

export interface TongyiWanxOptions {
  cookieStr?: string
  xsrfToken?: string
  wanUid?: string
  bxUa?: string
  bxUmidToken?: string
  baseUrl?: string
  timeoutMs?: number
  fetchImpl?: typeof fetch
}

export function createTongyiWanxProvider({ cookieStr, xsrfToken, wanUid, bxUa = '', bxUmidToken = '', baseUrl = BASE, timeoutMs = 60000, fetchImpl = fetch }: TongyiWanxOptions = {}): Provider {
  if (!cookieStr) throw new Error('tongyi-wanx: 缺少 cookieStr')
  if (!xsrfToken) throw new Error('tongyi-wanx: 缺少 xsrfToken')
  if (!wanUid) throw new Error('tongyi-wanx: 缺少 wanUid')
  const api = async (path: string, data: unknown, opts: { withBx?: boolean } = {}): Promise<Record<string, any>> => {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      origin: 'https://tongyi.aliyun.com',
      referer: 'https://tongyi.aliyun.com/wan/generate/image/generate',
      'x-platform': 'web',
      'x-wan-uid': String(wanUid),
      'x-xsrf-token': String(xsrfToken),
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
      cookie: cookieStr,
    }
    if (opts.withBx) {
      if (bxUa) headers['bx-ua'] = bxUa
      if (bxUmidToken) headers['bx-umidtoken'] = bxUmidToken
    }
    const res = await fetchImpl(`${baseUrl}${path}`, { method: 'POST', headers, body: JSON.stringify(data), signal: AbortSignal.timeout(timeoutMs) })
    if (!res.ok) throw new Error(`wanx HTTP ${res.status} ${path}`)
    const text = await res.text()
    if (!text) throw new Error(`wanx 空响应 ${path}（可能缺少 bx-ua 或端点错误）`)
    const j = JSON.parse(text) as Record<string, any>
    if (j?.success !== true) throw new Error(`wanx 失败: ${JSON.stringify(j).slice(0, 200)}`)
    return j
  }
  return assertProvider({
    id: 'tongyi-wanx',
    capabilities: { textToVideo: false, imageToVideo: false, firstLastFrame: false, lipSync: false, tts: false, image: true, maxDurationSec: 0, resolutions: ['1:1', '16:9', '9:16'], qualityTier: 5, freeQuota: true },
    async quote() { return { qualityTier: 5, costEstimate: 0, currency: 'wanx-free-credit' } },
    async health() {
      try { await api('/common/task/list', { taskTypes: ['text_to_image'] }); return { ok: true, quotaRemaining: null } }
      catch (e) { return { ok: false, error: String(e instanceof Error ? e.message : e).slice(0, 120) } }
    },
    async submit(_stage, spec) {
      const s = (spec ?? {}) as Record<string, any>
      const j = await api('/common/imageGen', {
        deductMode: 'credit_mode',
        taskType: 'text_to_image',
        taskInput: {
          subType: s?.subType ?? 'basic',
          modelVersion: s?.modelVersion ?? '2_1_max',
          generationMode: s?.generationMode ?? 'imaginative',
          modelIds: [],
          prompt: s?.positive ?? s?.prompt ?? '',
          ratio: s?.ratio ?? '1:1',
        },
      }, { withBx: true })
      const taskId = j?.data
      if (!taskId) throw new Error('wanx: 缺少 taskId')
      return { jobId: String(taskId) }
    },
    async status(jobId) {
      const j = await api('/common/task/list', { taskTypes: ['text_to_image'] })
      const item = (j?.data ?? []).find((x: Record<string, any>) => String(x?.taskId) === String(jobId))
      if (!item) return { state: 'running', progress: null }
      if (item.status === 2 && (item.taskRate ?? 0) >= 100) return { state: 'done', progress: 1 }
      if (item.status === 3 || item.status === 4) return { state: 'failed', progress: 1, error: `wanx status=${item.status}` }
      return { state: 'running', progress: item.taskRate ?? null }
    },
    async fetch(jobId) {
      const j = await api('/common/task/list', { taskTypes: ['text_to_image'] })
      const item = (j?.data ?? []).find((x: Record<string, any>) => String(x?.taskId) === String(jobId))
      const url = item?.taskResult?.[0]?.url
      if (!url) throw new Error('wanx: 无图片地址')
      return { outputs: [String(url)], meta: { status: 'success', taskRate: item.taskRate } }
    },
  })
}
