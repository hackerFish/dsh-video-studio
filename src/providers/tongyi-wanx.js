// 通义万相 web 通道（免费额度路线，2026-08-16 真机实测版协议）。
// 实测结论：
//   - 提交: POST https://wanx.biz.aliyun.com/wanx/api/common/imageGen
//     body: {deductMode:"credit_mode", taskType:"text_to_image",
//            taskInput:{subType:"basic", modelVersion:"2_1_max", generationMode:"imaginative", prompt, ratio}}
//     → {success:true, data:"<taskId>"}
//   - 查询: POST /wanx/api/common/task/list {taskTypes:["text_to_image"]}
//     → data[{taskId, status(2=完成), taskRate(100=完成), taskResult:[{url, ossPath}]}]
//   - 凭证: Cookie(含 login_aliyunid_ticket/WANX_CN_SESSION) + x-xsrf-token + x-wan-uid + x-platform:web
//   - 提交需要 bx-ua（阿里风控签名，抓包获取，分钟内可回放；过期后重新抓包）；查询不需要
//   - 免费档只开放文生图（视频需会员）→ 定位：漫剧"一致性静帧"供应商
import { assertProvider } from '../provider.ts'

const BASE = 'https://wanx.biz.aliyun.com/wanx/api'

export function createTongyiWanxProvider({ cookieStr, xsrfToken, wanUid, bxUa = '', bxUmidToken = '', baseUrl = BASE, timeoutMs = 60000, fetchImpl = fetch } = {}) {
  if (!cookieStr) throw new Error('tongyi-wanx: 缺少 cookieStr')
  if (!xsrfToken) throw new Error('tongyi-wanx: 缺少 xsrfToken')
  if (!wanUid) throw new Error('tongyi-wanx: 缺少 wanUid')
  const api = async (path, data, { withBx = false } = {}) => {
    const headers = {
      'content-type': 'application/json',
      origin: 'https://tongyi.aliyun.com',
      referer: 'https://tongyi.aliyun.com/wan/generate/image/generate',
      'x-platform': 'web',
      'x-wan-uid': String(wanUid),
      'x-xsrf-token': String(xsrfToken),
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
      cookie: cookieStr,
    }
    if (withBx) {
      if (bxUa) headers['bx-ua'] = bxUa
      if (bxUmidToken) headers['bx-umidtoken'] = bxUmidToken
    }
    const res = await fetchImpl(`${baseUrl}${path}`, { method: 'POST', headers, body: JSON.stringify(data), signal: AbortSignal.timeout(timeoutMs) })
    if (!res.ok) throw new Error(`wanx HTTP ${res.status} ${path}`)
    const text = await res.text()
    if (!text) throw new Error(`wanx 空响应 ${path}（可能缺少 bx-ua 或端点错误）`)
    const j = JSON.parse(text)
    if (j?.success !== true) throw new Error(`wanx 失败: ${JSON.stringify(j).slice(0, 200)}`)
    return j
  }
  return assertProvider({
    id: 'tongyi-wanx',
    capabilities: { textToVideo: false, imageToVideo: false, firstLastFrame: false, lipSync: false, tts: false, image: true, maxDurationSec: 0, resolutions: ['1:1', '16:9', '9:16'], qualityTier: 5, freeQuota: true },
    async quote() { return { qualityTier: 5, costEstimate: 0, currency: 'wanx-free-credit' } },
    async health() {
      try { await api('/common/task/list', { taskTypes: ['text_to_image'] }); return { ok: true, quotaRemaining: null } }
      catch (e) { return { ok: false, error: String(e?.message ?? e).slice(0, 120) } }
    },
    async submit(_stage, spec) {
      const j = await api('/common/imageGen', {
        deductMode: 'credit_mode',
        taskType: 'text_to_image',
        taskInput: {
          subType: spec?.subType ?? 'basic',
          modelVersion: spec?.modelVersion ?? '2_1_max',
          generationMode: spec?.generationMode ?? 'imaginative',
          modelIds: [],
          prompt: spec?.positive ?? spec?.prompt ?? '',
          ratio: spec?.ratio ?? '1:1',
        },
      }, { withBx: true })
      const taskId = j?.data
      if (!taskId) throw new Error('wanx: 缺少 taskId')
      return { jobId: String(taskId) }
    },
    async status(jobId) {
      const j = await api('/common/task/list', { taskTypes: ['text_to_image'] })
      const item = (j?.data ?? []).find((x) => String(x?.taskId) === String(jobId))
      if (!item) return { state: 'running', progress: null }
      if (item.status === 2 && (item.taskRate ?? 0) >= 100) return { state: 'done', progress: 1 }
      if (item.status === 3 || item.status === 4) return { state: 'failed', progress: 1, error: `wanx status=${item.status}` }
      return { state: 'running', progress: item.taskRate ?? null }
    },
    async fetch(jobId) {
      const j = await api('/common/task/list', { taskTypes: ['text_to_image'] })
      const item = (j?.data ?? []).find((x) => String(x?.taskId) === String(jobId))
      const url = item?.taskResult?.[0]?.url
      if (!url) throw new Error('wanx: 无图片地址')
      return { outputs: [url], meta: { status: 'success', taskRate: item.taskRate } }
    },
  })
}
