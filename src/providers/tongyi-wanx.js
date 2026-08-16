// 通义万相 web 通道（免费额度路线）：wanx.aliyun.com 官网接口。
// 协议骨架来自社区逆向（revTongYi, 文生图已验）：Cookie 鉴权 + x-xsrf-token 头 + referer。
// 文生图路径（text_to_image）为已验证结构；文生视频（text_to_video）端点标记 UNVERIFIED，
// 待真实 Cookie 实测后固化（与即梦适配器同样的经验迭代法）。
// 凭证：wanx.aliyun.com 的 Cookie（登录通义万相后自取，含 XSRF-TOKEN）。
import { randomUUID } from 'node:crypto'
import { assertProvider } from '../provider.js'

const BASE = 'https://wanx.aliyun.com/wanx'

export function parseCookieStr(str) {
  const cookies = {}
  for (const part of String(str ?? '').split(';')) {
    const p = part.trim()
    if (!p) continue
    const i = p.indexOf('=')
    if (i > 0) cookies[p.slice(0, i).trim()] = p.slice(i + 1).trim()
  }
  return cookies
}

export function createTongyiWanxProvider({ cookieStr, baseUrl = BASE, timeoutMs = 60000, fetchImpl = fetch } = {}) {
  const cookies = parseCookieStr(cookieStr)
  if (!cookies['XSRF-TOKEN']) throw new Error('tongyi-wanx: Cookie 缺少 XSRF-TOKEN')
  const headers = {
    accept: 'application/json, text/plain, */*',
    'content-type': 'application/json',
    referer: 'https://wanx.aliyun.com/creation',
    'x-xsrf-token': cookies['XSRF-TOKEN'],
    cookie: Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; '),
  }
  const api = async (method, path, data) => {
    const res = await fetchImpl(`${baseUrl}${path}`, { method, headers, body: data ? JSON.stringify(data) : undefined, signal: AbortSignal.timeout(timeoutMs) })
    if (!res.ok) throw new Error(`wanx HTTP ${res.status} ${path}`)
    const j = await res.json()
    if (j && j.success === false) throw new Error(`wanx 失败: ${JSON.stringify(j).slice(0, 200)}`)
    return j
  }
  return assertProvider({
    id: 'tongyi-wanx',
    capabilities: { textToVideo: true, imageToVideo: false, firstLastFrame: false, lipSync: false, tts: false, image: true, maxDurationSec: 10, resolutions: ['720p'], qualityTier: 4, freeQuota: true },
    async quote() { return { qualityTier: 4, costEstimate: 0, currency: 'wanx-free' } },
    async health() {
      try { await api('POST', '/task/list', { taskTypes: ['text_to_image'] }); return { ok: true, quotaRemaining: null } }
      catch (e) { return { ok: false, error: String(e?.message ?? e).slice(0, 100) } }
    },
    async submit(stage, spec) {
      // 文生图：已验证结构；文生视频：UNVERIFIED 端点（待 Cookie 实测修正 taskType/端点）
      const isVideo = stage === 'video' || stage === 'stills'
      const body = {
        taskType: isVideo ? 'text_to_video' : 'text_to_image',
        taskInput: {
          prompt: spec?.positive ?? spec?.prompt ?? '',
          ...(isVideo ? {} : { style: spec?.style ?? '<auto>', resolution: spec?.resolution ?? '1024*1024' }),
        },
      }
      const j = await api('POST', isVideo ? '/videoGen' : '/imageGen', body)
      const taskId = j?.data
      if (!taskId) throw new Error('wanx: 缺少 taskId: ' + JSON.stringify(j).slice(0, 200))
      return { jobId: String(taskId) }
    },
    async status(jobId) {
      const j = await api('POST', '/task/list', { taskTypes: ['text_to_video', 'text_to_image'] })
      const item = (j?.data ?? []).find((x) => String(x?.id) === String(jobId) || String(x?.taskId) === String(jobId))
      if (!item) return { state: 'running', progress: null }
      const st = String(item?.status ?? item?.state ?? '').toLowerCase()
      if (['success', 'succeed', 'done', 'complete', 'finish', 'finished'].includes(st)) return { state: 'done', progress: 1 }
      if (['fail', 'failed', 'error'].includes(st)) return { state: 'failed', progress: 1, error: String(item?.message ?? 'failed') }
      return { state: 'running', progress: null }
    },
    async fetch(jobId) {
      const j = await api('POST', '/task/list', { taskTypes: ['text_to_video', 'text_to_image'] })
      const item = (j?.data ?? []).find((x) => String(x?.id) === String(jobId) || String(x?.taskId) === String(jobId))
      const url = item?.videoUrl ?? item?.video_url ?? item?.imageUrl ?? item?.image_url ?? item?.url
      if (!url) throw new Error('wanx: 未找到输出地址: ' + JSON.stringify(item ?? {}).slice(0, 200))
      return { outputs: [url], meta: { status: 'success' } }
    },
  })
}
