import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runPipeline } from '../src/director/pipeline.ts'
import { createMockProvider } from '../src/providers/mock.ts'
import { assertProvider } from '../src/provider.ts'
import { AccountPool } from '../src/quota/scheduler.ts'

test('流水线端到端：六段事件齐全 + 额度审计 + gate 中止生效', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-pipe-'))
  try {
    const events = []
    const r = await runPipeline({
      script: { title: 't', shots: [{ line: '测试台词。', prompt: '测试画面' }] },
      providers: [createMockProvider()],
      accounts: [{ id: 'a1', provider: 'mock', dailyQuota: 66, usedToday: 0, qualityTier: 1 }],
      opts: { voice: false, subtitles: false },   // 免 TTS 加速单测
      onEvent: (e) => events.push(e),
      workDir: dir,
    })
    const stages = [...new Set(events.map((e) => e.stage))]
    for (const s of ['story', 'script', 'storyboard', 'shot-assets', 'final-cut']) assert.ok(stages.includes(s), stages.join(','))
    assert.ok(existsSync(r.outPath))
    assert.equal(r.audit.decisions[0].account, 'a1')
    assert.equal(r.audit.accounts[0].reason, 'ok')

    // gate=ask 且拒绝 → final-cut 中止抛错
    await assert.rejects(() => runPipeline({
      script: { title: 't', shots: [{ line: 'x' }] },
      providers: [createMockProvider()],
      opts: { voice: false, subtitles: false },
      gates: { 'final-cut': 'ask' },
      ask: async () => false,
      workDir: dir + '2',
    }), /中止/)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('账号池降级：坏账号提交失败自动换健康账号，失败账号进冷却', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-pipe-pool-'))
  try {
    const failing = assertProvider({
      id: 'badp',
      capabilities: { textToVideo: true, qualityTier: 9 },
      async quote() { return { qualityTier: 9, costEstimate: 0, currency: 'mock' } },
      async submit() { throw new Error('SystemBusy') },
      async status() { return { state: 'failed', progress: null, error: 'SystemBusy' } },
      async fetch() { return { outputs: [] } },
      async health() { return { ok: false } },
    })
    const pool = new AccountPool([
      { id: 'bad', provider: 'badp', dailyQuota: 10, qualityTier: 9 },
      { id: 'good', provider: 'mock', dailyQuota: 10, qualityTier: 1 },
    ])
    const events: { stage: string; type: string }[] = []
    const r = await runPipeline({
      script: { title: 't', shots: [{ line: '测试台词。', prompt: '测试画面' }, { line: '第二句。', prompt: '画面二' }] },
      providers: [failing, createMockProvider()],
      opts: { voice: false, subtitles: false, pool },
      onEvent: (e) => events.push(e),
      workDir: dir,
    })
    assert.ok(existsSync(r.outPath))
    const fallbacks = events.filter((e) => e.type === 'fallback')
    assert.ok(fallbacks.length >= 1, `应有降级事件: ${JSON.stringify(events.map((e) => e.type))}`)
    const bad = pool.snapshot().find((a) => a.id === 'bad')!
    assert.equal(bad.health?.consecutiveFailures, 1)
    assert.ok((bad.health?.cooldownUntil ?? 0) > Date.now(), '失败账号应仍在冷却期')
    assert.equal(bad.health?.lastError, 'SystemBusy')
    // 降级后额度落在健康账号上
    const good = pool.snapshot().find((a) => a.id === 'good')!
    assert.ok((good.usedToday ?? 0) >= 1)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})
