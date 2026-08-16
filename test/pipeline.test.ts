import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runPipeline } from '../src/director/pipeline.ts'
import { createMockProvider } from '../src/providers/mock.ts'

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
