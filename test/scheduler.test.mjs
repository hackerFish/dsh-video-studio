import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pickAccount, recordUsage, dailyReport } from '../src/quota/scheduler.js'

const T0 = Date.UTC(2026, 7, 16, 12) // 2026-08-16

test('质量优先：同配额时选高质量档', () => {
  const accs = [
    { id: 'free-a', provider: 'jimeng', dailyQuota: 66, usedToday: 0, qualityTier: 1 },
    { id: 'pay-a', provider: 'kling', dailyQuota: 100, usedToday: 0, qualityTier: 3 },
  ]
  const r = pickAccount(accs, { now: T0 })
  assert.equal(r.account.id, 'pay-a')
})

test('省钱优先：preferCost 时选低质量档（免费额度先跑）', () => {
  const accs = [
    { id: 'free-a', provider: 'jimeng', dailyQuota: 66, usedToday: 0, qualityTier: 1 },
    { id: 'pay-a', provider: 'kling', dailyQuota: 100, usedToday: 0, qualityTier: 3 },
  ]
  const r = pickAccount(accs, { preferCost: true, now: T0 })
  assert.equal(r.account.id, 'free-a')
})

test('配额耗尽自动降级到下一个账号', () => {
  const accs = [
    { id: 'free-a', provider: 'jimeng', dailyQuota: 66, usedToday: 66, qualityTier: 1 },
    { id: 'free-b', provider: 'jimeng', dailyQuota: 66, usedToday: 0, qualityTier: 1 },
  ]
  const r = pickAccount(accs, { preferCost: true, now: T0 })
  assert.equal(r.account.id, 'free-b')
})

test('全部耗尽返回 no-quota', () => {
  const accs = [{ id: 'free-a', dailyQuota: 66, usedToday: 66, qualityTier: 1 }]
  const r = pickAccount(accs, { now: T0 })
  assert.equal(r.reason, 'no-quota')
})

test('跨天自动重置已用额度', () => {
  const accs = [{ id: 'free-a', dailyQuota: 66, usedToday: 66, qualityTier: 1, lastUsedAt: T0 - 86400000 }]
  const r = pickAccount(accs, { preferCost: true, now: T0 })
  assert.equal(r.account.id, 'free-a')
  assert.equal(r.account.usedToday, 0)
})

test('recordUsage 与 dailyReport', () => {
  let a = { id: 'free-a', dailyQuota: 66, usedToday: 0, qualityTier: 1 }
  a = recordUsage(a, 2, T0)
  const rep = dailyReport([a])
  assert.equal(rep[0].used, 2)
  assert.equal(rep[0].remain, 64)
})
