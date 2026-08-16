import { test } from 'node:test'
import assert from 'node:assert/strict'
import { AccountPool, type QuotaAccount } from '../src/quota/scheduler.ts'

const T0 = Date.UTC(2026, 7, 16, 12)

const acc = (o: Partial<QuotaAccount>): QuotaAccount =>
  ({ id: 'a', provider: 'x', dailyQuota: 66, usedToday: 0, qualityTier: 1, ...o })

const clock = (start: number) => {
  let t = start
  return { now: () => t, advance: (ms: number) => { t += ms } }
}

test('轮换公平：LRU 先选最久未用，轮流摊额度', () => {
  const c = clock(T0)
  const pool = new AccountPool(
    [acc({ id: 'x1' }), acc({ id: 'x2' }), acc({ id: 'x3' })],
    { now: c.now })
  const picked: string[] = []
  for (let i = 0; i < 6; i++) {
    const r = pool.pick('x')
    assert.equal(r.reason, 'ok')
    picked.push(r.account!.id)
    pool.charge(r.account!.id)
    c.advance(1000)
  }
  assert.deepEqual(picked, ['x1', 'x2', 'x3', 'x1', 'x2', 'x3'])
})

test('轮换公平优先于质量档：用过的账号让位给未用的', () => {
  const c = clock(T0)
  const pool = new AccountPool(
    [acc({ id: 'high', qualityTier: 3, lastUsedAt: T0 - 1000 }), acc({ id: 'low' })],
    { now: c.now })
  assert.equal(pool.pick('x').account?.id, 'low')
})

test('同为未用时质量档作平局裁决（高质量先上）', () => {
  const pool = new AccountPool([acc({ id: 'low' }), acc({ id: 'high', qualityTier: 3 })], { now: () => T0 })
  assert.equal(pool.pick('x').account?.id, 'high')
})

test('失败进冷却，冷却期内不被选中', () => {
  const c = clock(T0)
  const pool = new AccountPool([acc({ id: 'x1' }), acc({ id: 'x2' })], { backoffBaseMs: 60000, now: c.now })
  pool.recordFailure('x1', 'SystemBusy')
  const r = pool.pick('x')
  assert.equal(r.account?.id, 'x2')
  assert.equal(r.accounts.find((a) => a.id === 'x1')?.health?.consecutiveFailures, 1)
})

test('全部冷却返回 cooldown，冷却到期自动恢复', () => {
  const c = clock(T0)
  const pool = new AccountPool([acc({ id: 'x1' })], { backoffBaseMs: 60000, now: c.now })
  pool.recordFailure('x1', 'busy')
  assert.equal(pool.pick('x').reason, 'cooldown')
  c.advance(60001)
  assert.equal(pool.pick('x').reason, 'ok')
})

test('指数退避：连续失败冷却翻倍，封顶 maxBackoff', () => {
  const c = clock(T0)
  const pool = new AccountPool([acc({ id: 'x1' })], { backoffBaseMs: 1000, maxBackoffMs: 4000, now: c.now })
  pool.recordFailure('x1', 'e1')
  pool.recordFailure('x1', 'e2')
  pool.recordFailure('x1', 'e3')
  pool.recordFailure('x1', 'e4')
  const h = pool.snapshot()[0]?.health
  assert.equal(h?.consecutiveFailures, 4)
  assert.equal(h?.cooldownUntil, T0 + 4000) // 1000,2000,4000 -> capped at 4000
  assert.equal(h?.lastError, 'e4')
})

test('成功一次清除冷却和失败计数', () => {
  const c = clock(T0)
  const pool = new AccountPool([acc({ id: 'x1' }), acc({ id: 'x2' })], { backoffBaseMs: 60000, now: c.now })
  pool.recordFailure('x1', 'busy')
  assert.equal(pool.pick('x').reason, 'ok') // x2 picked
  pool.recordSuccess('x1')
  const h = pool.snapshot().find((a) => a.id === 'x1')?.health
  assert.equal(h?.consecutiveFailures, 0)
  assert.equal(h?.cooldownUntil, null)
})

test('disabled 账号不参与调度', () => {
  const pool = new AccountPool([acc({ id: 'x1' }), acc({ id: 'x2' })], { now: () => T0 })
  pool.disable('x1')
  const r = pool.pick('x')
  assert.equal(r.account?.id, 'x2')
  pool.disable('x2')
  assert.equal(pool.pick('x').reason, 'no-quota')
})

test('按供应商隔离：pick(provider) 只看本家账号，无账号返回 none', () => {
  const pool = new AccountPool([acc({ id: 'x1' }), acc({ id: 'y1', provider: 'y' })], { now: () => T0 })
  assert.equal(pool.pick('y').account?.id, 'y1')
  assert.equal(pool.pick('z').reason, 'none')
})

test('charge 扣额度并记使用时间，跨天自动清零', () => {
  const c = clock(T0)
  const pool = new AccountPool([acc({ id: 'x1' })], { now: c.now })
  pool.charge('x1', 2)
  let s = pool.snapshot()[0]!
  assert.equal(s.usedToday, 2)
  assert.equal(s.lastUsedAt, T0)
  c.advance(86400000)
  pool.pick('x') // pick rolls the day
  s = pool.snapshot()[0]!
  assert.equal(s.usedToday, 0)
})

test('每日额度用尽后落到下一个账号，全部耗尽 no-quota', () => {
  const c = clock(T0)
  const pool = new AccountPool([acc({ id: 'x1', usedToday: 66 }), acc({ id: 'x2' })], { now: c.now })
  assert.equal(pool.pick('x').account?.id, 'x2')
  pool.charge('x2', 66)
  assert.equal(pool.pick('x').reason, 'no-quota')
})

test('rotate=false 时按质量档选（preferCost 低档优先）', () => {
  const pool = new AccountPool([acc({ id: 'low' }), acc({ id: 'high', qualityTier: 3 })], { rotate: false, now: () => T0 })
  assert.equal(pool.pick('x').account?.id, 'high')
  const cheap = new AccountPool([acc({ id: 'low' }), acc({ id: 'high', qualityTier: 3 })], { rotate: false, preferCost: true, now: () => T0 })
  assert.equal(cheap.pick('x').account?.id, 'low')
})

test('report 输出剩余额度与冷却状态', () => {
  const c = clock(T0)
  const pool = new AccountPool([acc({ id: 'x1' }), acc({ id: 'x2' })], { now: c.now })
  pool.charge('x1', 10)
  pool.recordFailure('x2', 'busy')
  const rows = pool.report()
  const x1 = rows.find((r) => r.id === 'x1')!
  const x2 = rows.find((r) => r.id === 'x2')!
  assert.equal(x1.used, 10)
  assert.equal(x1.remain, 56)
  assert.equal(x1.cooling, false)
  assert.equal(x2.cooling, true)
})

test('snapshot 深拷贝：改副本不影响池内状态', () => {
  const pool = new AccountPool([acc({ id: 'x1' })], { now: () => T0 })
  const copy = pool.snapshot()
  copy[0]!.usedToday = 999
  copy[0]!.health = { consecutiveFailures: 7, cooldownUntil: T0 + 1 }
  const inner = pool.snapshot()[0]!
  assert.equal(inner.usedToday, 0)
  assert.equal(inner.health ?? null, null)
})

test('reset 清冷却；reset(usage) 连额度一起清', () => {
  const pool = new AccountPool([acc({ id: 'x1' }), acc({ id: 'x2' })], { now: () => T0 })
  pool.recordFailure('x1', 'busy')
  pool.charge('x2', 5)
  pool.reset('x1')
  assert.equal(pool.snapshot().find((a) => a.id === 'x1')?.health?.cooldownUntil, null)
  assert.equal(pool.snapshot().find((a) => a.id === 'x2')?.usedToday, 5)
  pool.reset(undefined, { usage: true })
  assert.equal(pool.snapshot().find((a) => a.id === 'x2')?.usedToday, 0)
})
