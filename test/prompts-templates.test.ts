import { test } from 'node:test'
import assert from 'node:assert/strict'
import { applyTemplate, QUALITY_BOOSTERS, listTemplates, DEFAULT_BOOSTERS } from '../src/prompts/templates.ts'
import { optimizePrompt } from '../src/prompts/optimizer.ts'

test('模板库：角色三视图含结构区块与一致性锁', () => {
  const p = applyTemplate('character-sheet', { description: '青年男修，高束墨色长发，素白长袍', aspectRatio: '9:16' })
  assert.match(p, /左区：角色正脸特写/)
  assert.match(p, /右区：标准角色设定三视图/)
  assert.match(p, /100% 一致/)
  assert.match(p, /青年男修/)
  assert.match(p, /9:16/)
})

test('模板库：未知模板拒绝；列表完整', () => {
  assert.throws(() => applyTemplate('nope', {}), /未知模板/)
  assert.equal(listTemplates().length, 3)
})

test('优化器：草稿 + 默认增益 + 风格/画幅', () => {
  const r = optimizePrompt('一只鲸鱼在深海中游动', { style: '电影感', aspectRatio: '9:16' })
  assert.match(r.optimized, /^一只鲸鱼在深海中游动/)
  for (const b of DEFAULT_BOOSTERS) assert.ok(r.appliedBoosters.includes(b), b)
  assert.match(r.optimized, /8K 超清/)
  assert.match(r.optimized, /严禁画面出现不相关的文字/)
  assert.match(r.optimized, /风格：电影感/)
  assert.match(r.optimized, /9:16/)
})

test('优化器：自定义增益组合', () => {
  const r = optimizePrompt('宫殿全景', { boosters: ['ultra', 'noText'] })
  assert.deepEqual(r.appliedBoosters, ['ultra', 'noText'])
  assert.doesNotMatch(r.optimized, /中性表情/)
  assert.ok(QUALITY_BOOSTERS.consistent.includes('100% 一致'))
})
