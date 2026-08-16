// 通义万相视频 via DashScope（官方异步任务协议，免费额度通道——补上"免费出视频"的可靠一环）。
// 模型 ID 按官方文档形态预设，真实 key 首次实测后固化（与即梦适配器同一经验迭代法）。
import { createDashScopeVideoProvider, type DashScopeVideoOptions } from './kling-dashscope.ts'
import type { Provider } from '../provider.ts'

export const WAN_VIDEO_MODELS = ['wan2.2-t2v-plus', 'wan2.1-t2v-plus'] // 待真实 key 实测校准

export function createDashScopeWanProvider(opts: Omit<DashScopeVideoOptions, 'model' | 'id'> & { model?: string; apiKey?: string } = {}): Provider {
  return createDashScopeVideoProvider({
    ...opts,
    model: opts.model ?? WAN_VIDEO_MODELS[0] ?? 'wan2.2-t2v-plus',
    id: 'dashscope-wan',
    qualityTier: 7,
  })
}
