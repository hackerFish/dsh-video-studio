import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, existsSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createStyleGenome } from '../src/memory/style-genome.js'

test('风格基因：设置/持久化/模板评分演化/反馈截断', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-genome-'))
  try {
    const file = join(dir, 'genome.json')
    const g = createStyleGenome(file)
    g.setStyleDna('国风，深海蓝')
    g.recordTemplate('史诗', '中景，缓慢推镜')
    assert.equal(existsSync(file), true)
    // 重新加载 = 持久化生效
    const g2 = createStyleGenome(file)
    assert.equal(g2.styleDna, '国风，深海蓝')
    assert.equal(g2.bestTemplate('史诗'), '中景，缓慢推镜')
    // 评分演化
    const s = g2.scoreTemplate('史诗', 5)
    assert.equal(s.promote, true)
    assert.ok(g2.export().shotTemplates['史诗'].weight > 1)
    // 反馈
    for (let i = 0; i < 505; i++) g2.recordFeedback({ shotIndex: 0, decision: 'retry' })
    assert.ok(g2.export().feedback.length <= 500)
    // 损坏文件不抛错
    const bad = join(dir, 'bad.json')
    writeFileSync(bad, '{{{')
    assert.ok(createStyleGenome(bad).export().version === 1)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})
