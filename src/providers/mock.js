// mock 供应商：无 key 时跑通全链路的占位实现。
// 产出占位静帧（纯色 PNG，由 ffmpeg 生成，见 director/stages 的说明），任务即完成。
import { assertProvider } from '../provider.js'

let counter = 0
const jobs = new Map()

export function createMockProvider({ failRate = 0 } = {}) {
  return assertProvider({
    id: 'mock',
    capabilities: {
      textToVideo: true, imageToVideo: true, firstLastFrame: false,
      lipSync: false, tts: false, image: true,
      maxDurationSec: 5, resolutions: ['720p'], qualityTier: 0,
    },
    async quote(stage, spec) {
      return { qualityTier: 0, costEstimate: 0, currency: 'mock' }
    },
    async submit(stage, spec) {
      const jobId = `mock-${++counter}`
      jobs.set(jobId, { state: 'done', progress: 1, spec })
      return { jobId }
    },
    async status(jobId) {
      return jobs.get(jobId) ?? { state: 'unknown' }
    },
    async fetch(jobId) {
      const j = jobs.get(jobId)
      if (!j) throw new Error(`mock: unknown job ${jobId}`)
      return {
        outputs: [], // 占位：真实链路用 ffmpeg 本地生成静帧替代
        meta: { note: 'mock 输出，仅供链路验证', ...j.spec },
      }
    },
    async health() {
      return { ok: true, quotaRemaining: Infinity }
    },
  })
}
