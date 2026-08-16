// Mock provider: keeps the full pipeline verifiable with zero keys.
import { assertProvider, type Provider } from '../provider.ts'

interface MockJob { state: 'done'; progress: number; spec: Record<string, unknown> }

let counter = 0
const jobs = new Map<string, MockJob>()

export function createMockProvider(_opts: { failRate?: number } = {}): Provider {
  return assertProvider({
    id: 'mock',
    capabilities: { textToVideo: true, imageToVideo: true, firstLastFrame: false, lipSync: false, tts: false, image: true, maxDurationSec: 5, resolutions: ['720p'], qualityTier: 0 },
    async quote() { return { qualityTier: 0, costEstimate: 0, currency: 'mock' } },
    async submit(_stage, spec) {
      const jobId = `mock-${++counter}`
      jobs.set(jobId, { state: 'done', progress: 1, spec })
      return { jobId }
    },
    async status(jobId) { return jobs.get(jobId) ?? { state: 'unknown', progress: null } },
    async fetch(jobId) {
      const j = jobs.get(jobId)
      if (!j) throw new Error(`mock: unknown job ${jobId}`)
      return { outputs: [], meta: { note: 'mock 输出，仅供链路验证', ...j.spec } }
    },
    async health() { return { ok: true, quotaRemaining: Infinity } },
  })
}
