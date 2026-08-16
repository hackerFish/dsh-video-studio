import { test } from 'node:test'
import assert from 'node:assert/strict'
import { route, assertProvider, type Provider } from '../src/provider.ts'
import { createMockProvider } from '../src/providers/mock.ts'

const fake = (id: string, caps: Provider['capabilities']): Provider => ({
  id, capabilities: caps,
  quote: async () => ({ qualityTier: caps.qualityTier ?? 5, costEstimate: 0, currency: 'x' }),
  submit: async () => ({ jobId: 'j' }), status: async () => ({ state: 'done', progress: 1 }),
  fetch: async () => ({ outputs: [] }), health: async () => ({ ok: true }),
})

test('能力路由：缺图生视频能力的不入选', () => {
  const r = route([fake('a', { imageToVideo: true, qualityTier: 3 }), fake('b', { imageToVideo: false, qualityTier: 5 })], { imageToVideo: true })
  assert.equal(r?.id, 'a')
})

test('质量优先默认选高质量档；preferCost 反转', () => {
  const a = fake('a', { imageToVideo: true, qualityTier: 2 })
  const b = fake('b', { imageToVideo: true, qualityTier: 4 })
  assert.equal(route([a, b], { imageToVideo: true })?.id, 'b')
  assert.equal(route([a, b], { imageToVideo: true }, true)?.id, 'a')
})

test('mock provider 全生命周期可跑通', async () => {
  const p = createMockProvider()
  const { jobId } = await p.submit('stills', { prompt: '测试' })
  assert.equal((await p.status(jobId)).state, 'done')
  const out = await p.fetch(jobId)
  assert.ok(out.outputs)
  assert.equal((await p.health()).ok, true)
})

test('缺方法的 provider 被拒绝', () => {
  assert.throws(() => assertProvider({ id: 'bad' } as unknown as Provider))
})
