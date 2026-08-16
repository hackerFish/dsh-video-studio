import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PLATFORMS, buildReleasePack, precheckCompliance } from '../src/distribution/adapters.js'

test('平台表：四个平台画幅与合规清单齐备', () => {
  assert.equal(PLATFORMS.douyin.aspectRatio, '9:16')
  assert.equal(PLATFORMS.bilibili.aspectRatio, '16:9')
  assert.equal(PLATFORMS.xiaohongshu.aspectRatio, '3:4')
  assert.ok(PLATFORMS.douyin.compliance.length >= 4)
})

test('发布包：标题模板替换 + 时长超限告警', () => {
  const pack = buildReleasePack('douyin', { hook: '鲸鱼跃出海面的瞬间', tags: ['AI漫剧', '鲸影'], durationSec: 500 })
  assert.match(pack.title, /鲸鱼跃出海面的瞬间/)
  assert.match(pack.title, /#AI漫剧 #鲸影/)
  assert.ok(pack.issues.some((i) => i.includes('时长')))
  assert.equal(pack.ready, false)
  const ok = buildReleasePack('bilibili', { hook: '深海', series: '鲸影漫剧', durationSec: 90 })
  assert.equal(ok.ready, true)
  assert.match(ok.title, /【鲸影漫剧】/)
})

test('未知平台拒绝', () => {
  assert.throws(() => buildReleasePack('youtube', {}), /未知平台/)
})

test('合规预检：外链粗检', () => {
  assert.ok(precheckCompliance('douyin', { text: '点击 https://xxx.com 加我' }).length >= 1)
  assert.equal(precheckCompliance('douyin', { text: '纯文本无链接' }).length, 0)
})
