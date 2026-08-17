// 供应商矩阵单一事实源：health 路由、账号保险库白名单、自我审计报告共用这一份。
// 状态语义：live-verified = 真实调用验证过（出过真图/真协议往返）；adapter = 适配器+单测就绪，等真实 key；
// protocol-documented = 只完成协议取证，未写适配器。
export type ProviderMatrixStatus = 'live-verified' | 'adapter' | 'protocol-documented'

export interface ProviderMatrixRow {
  id: string
  channel: string
  status: ProviderMatrixStatus
  freeQuota: boolean
  note: string
}

export const PROVIDER_MATRIX: ProviderMatrixRow[] = [
  { id: 'mock', channel: '本地占位', status: 'live-verified', freeQuota: true, note: '零凭证链路自测；demo 与单测用' },
  { id: 'jimeng', channel: 'sessionid 免费档', status: 'live-verified', freeQuota: true, note: '协议全通；文生视频队列长期 SystemBusy（实测凌晨依然满），免费路线改为万相出图 → 图生视频' },
  { id: 'tongyi-wanx', channel: 'cookie+xsrf 免费档', status: 'live-verified', freeQuota: true, note: '实测出过真图（1.28MB 鲸鱼图）；免费档为文生图，视频需会员' },
  { id: 'doubao-web', channel: 'cookie 网页版', status: 'live-verified', freeQuota: true, note: '真实抓包回放：SSE 聊天做 LLM 三段 + 图片 bot 出资产图；Pro 免费额度 7 天窗口' },
  { id: 'comfyui', channel: '本地 /prompt', status: 'adapter', freeQuota: true, note: '/prompt→/history→/view 协议 mock 服务器级验证；workflow JSON 生成器就绪，真 GPU 待测' },
  { id: 'kling', channel: 'JWT 官方', status: 'adapter', freeQuota: false, note: 'text2video 适配器+单测就绪，等真实 key' },
  { id: 'kling-dashscope', channel: 'DashScope sk-', status: 'adapter', freeQuota: true, note: '官方免费额度通道（视频合成异步协议），等 key' },
  { id: 'kling-lipsync', channel: 'JWT 官方对口型', status: 'adapter', freeQuota: false, note: '官方 API 3-13 契约逐字段对齐，audio2video/text2video 双模式，8 单测，等 key' },
  { id: 'doubao', channel: '火山方舟 ARK key', status: 'adapter', freeQuota: false, note: 'Seedance 视频 + Seedream 图像接入，等 key' },
  { id: 'dashscope-wan', channel: 'DashScope sk-', status: 'live-verified', freeQuota: false, note: '✅ 真机出片（wan2.2-t2v-plus，1080p 5s ≈90 秒出片）——⚠️ 按量计费 ¥0.70/秒（1080p），非免费额度；生成前必须显式确认预算' },
  { id: 'sessionid-http', channel: 'sessionid 通用', status: 'adapter', freeQuota: true, note: '多平台 sessionid 预设的通用适配器（jimeng 之外的可灵等）' },
]

export function providerIds(): string[] {
  return PROVIDER_MATRIX.map((m) => m.id)
}

export function matrixRow(id: string): ProviderMatrixRow | null {
  return PROVIDER_MATRIX.find((m) => m.id === id) ?? null
}

/** 各状态计数（审计报告用）。 */
export function matrixStats(): { total: number; liveVerified: number; adapter: number; waitingKey: number } {
  return {
    total: PROVIDER_MATRIX.length,
    liveVerified: PROVIDER_MATRIX.filter((m) => m.status === 'live-verified').length,
    adapter: PROVIDER_MATRIX.filter((m) => m.status === 'adapter').length,
    waitingKey: PROVIDER_MATRIX.filter((m) => m.status === 'adapter' && !m.freeQuota).length,
  }
}
