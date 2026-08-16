import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createBoosterScorebook } from '../src/prompts/boost-scorebook.ts'
import { optimizePrompt } from '../src/prompts/optimizer.ts'
import { DEFAULT_BOOSTERS } from '../src/prompts/templates.ts'

test('冷启动：无数据时用默认组合', () => {
  const sb = createBoosterScorebook()
  assert.deepEqual(sb.recommend('国风'), [...DEFAULT_BOOSTERS].slice(0, 4))
})

test('回写闭环：高分增益被推荐，低分被淘汰', () => {
  const sb = createBoosterScorebook()
  // ultra/material 一直 5 分；noText 一直 1 分；neutral 3 分
  for (let i = 0; i < 4; i++) {
    sb.recordOutcome('国风', ['ultra', 'material'], 5)
    sb.recordOutcome('国风', ['noText'], 1)
    sb.recordOutcome('国风', ['neutral'], 3)
  }
  const rec = sb.recommend('国风', { maxBoosters: 3 })
  assert.ok(rec.includes('ultra'))
  assert.ok(rec.includes('material'))
  assert.ok(!rec.includes('noText'), '低分增益应被淘汰: ' + rec.join(','))
  // 评分簿接入优化器
  const r = optimizePrompt('一只鲸鱼', { style: '国风', scorebook: sb })
  assert.ok(r.appliedBoosters.includes('ultra'))
  assert.ok(!r.appliedBoosters.includes('noText'))
})

test('持久化往返', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-sb-'))
  try {
    const file = join(dir, 'scorebook.json')
    const sb = createBoosterScorebook(file)
    sb.recordOutcome('赛博', ['ultra'], 5)
    assert.equal(existsSync(file), true)
    const sb2 = createBoosterScorebook(file)
    assert.equal(sb2.stats('赛博')[0]?.avg, 5)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})
