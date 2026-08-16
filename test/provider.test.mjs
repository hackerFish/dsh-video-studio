import { test } from 'node:test'
import assert from 'node:assert/strict'
import { route, assertProvider } from '../src/provider.js'
import { createMockProvider } from '../src/providers/mock.js'

test('能力路由：缺图生视频能力的不入选', () => {
  const a = { id: 'a', capabilities: { imageToVideo: true, qualityTier: 3 }, quote() {}, submit() {}, status() {}, fetch() {}, health() {} }
  const b = { id: 'b', capabilities: { imageToVideo: false, qualityTier: 5 }, quote() {}, submit() {}, status() {}, fetch() {}, health() {} }
  const r = route([a, b], { imageToVideo: true })
  assert.equal(r.id, 'a')
})

test('质量优先默认选高质量档', () => {
  const a = { id: 'a', capabilities: { imageToVideo: true, qualityTier: 2 }, quote() {}, submit() {}, status() {}, fetch() {}, health() {} }
  const b = { id: 'b', capabilities: { imageToVideo: true, qualityTier: 4 }, quote() {}, submit() {}, status() {}, fetch() {}, health() {} }
  assert.equal(route([a, b], { imageToVideo: true }).id, 'b')
  assert.equal(route([a, b], { imageToVideo: true }, true).id, 'a')
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
  assert.throws(() => assertProvider({ id: 'bad' }))
})
