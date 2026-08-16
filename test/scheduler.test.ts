import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pickAccount, recordUsage, dailyReport, type QuotaAccount } from '../src/quota/scheduler.ts'

const T0 = Date.UTC(2026, 7, 16, 12)

const acc = (o: Partial<QuotaAccount>): QuotaAccount => ({ id: 'a', provider: 'x', dailyQuota: 66, usedToday: 0, qualityTier: 1, ...o })

test('质量优先：同配额时选高质量档', () => {
  const r = pickAccount([acc({ id: 'free-a' }), acc({ id: 'pay-a', qualityTier: 3 })], { now: T0 })
  assert.equal(r.account?.id, 'pay-a')
})

test('省钱优先：preferCost 时选低质量档（免费额度先跑）', () => {
  const r = pickAccount([acc({ id: 'free-a' }), acc({ id: 'pay-a', qualityTier: 3 })], { preferCost: true, now: T0 })
  assert.equal(r.account?.id, 'free-a')
})

test('配额耗尽自动降级到下一个账号', () => {
  const r = pickAccount([acc({ id: 'free-a', usedToday: 66 }), acc({ id: 'free-b' })], { preferCost: true, now: T0 })
  assert.equal(r.account?.id, 'free-b')
})

test('全部耗尽返回 no-quota', () => {
  const r = pickAccount([acc({ id: 'free-a', usedToday: 66 })], { now: T0 })
  assert.equal(r.reason, 'no-quota')
})

test('跨天自动重置已用额度', () => {
  const r = pickAccount([acc({ id: 'free-a', usedToday: 66, lastUsedAt: T0 - 86400000 })], { preferCost: true, now: T0 })
  assert.equal(r.account?.id, 'free-a')
  assert.equal(r.account?.usedToday, 0)
})

test('recordUsage 与 dailyReport', () => {
  const a = recordUsage(acc({ id: 'free-a' }), 2, T0)
  const rep = dailyReport([a])
  assert.equal(rep[0]?.used, 2)
  assert.equal(rep[0]?.remain, 64)
})
