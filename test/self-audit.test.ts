import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PROVIDER_MATRIX, providerIds, matrixStats, matrixRow } from '../src/selfaudit/matrix.ts'
import { PROVIDER_IDS } from '../src/accounts/store.ts'
import { buildAudit, scanModules, scanTests, scanTools, scanRoutes, scanClientTabs, gitFacts, knownGaps } from '../src/selfaudit/audit.ts'
import { renderAuditMarkdown } from '../src/selfaudit/render.ts'

test('矩阵单一事实源：id 唯一、状态合法、与保险库白名单/health 路由一致', () => {
  const ids = providerIds()
  assert.equal(new Set(ids).size, ids.length, '矩阵 id 不得重复')
  for (const row of PROVIDER_MATRIX) {
    assert.ok(['live-verified', 'adapter', 'protocol-documented'].includes(row.status), `${row.id} 状态非法`)
    assert.ok(row.channel && row.note, `${row.id} 缺通道/备注`)
    assert.ok(PROVIDER_IDS.includes(row.id as (typeof PROVIDER_IDS)[number]), `矩阵 ${row.id} 不在保险库白名单`)
  }
})

test('矩阵统计与 health 路由共用 providerIds', () => {
  const s = matrixStats()
  assert.equal(s.total, PROVIDER_MATRIX.length)
  assert.equal(s.liveVerified + s.adapter + PROVIDER_MATRIX.filter((m) => m.status === 'protocol-documented').length, s.total)
  assert.ok(matrixRow('kling-lipsync'))
  assert.equal(matrixRow('not-exist'), null)
})

test('源码扫描：模块非空且行数合法', () => {
  const modules = scanModules()
  assert.ok(modules.length >= 20, `模块数 ${modules.length}`)
  for (const m of modules) {
    assert.ok(m.path.endsWith('.ts'), m.path)
    assert.ok(m.lines > 0, m.path)
  }
  // 关键模块必须被扫到
  const paths = new Set(modules.map((m) => m.path))
  for (const p of ['src/director/pipeline.ts', 'src/quota/scheduler.ts', 'src/accounts/store.ts', 'src/selfaudit/audit.ts', 'src/providers/kling-lipsync.ts', 'src/content/presets.ts']) {
    assert.ok(paths.has(p), `缺模块 ${p}`)
  }
})

test('能力清单扫描：工具/路由/tab 数量与关键项', () => {
  const tools = scanTools()
  assert.ok(tools.includes('whale_self_audit'), tools.join(','))
  assert.ok(tools.includes('whale_story_presets'))
  assert.ok(tools.includes('whale_studio'))
  assert.ok(tools.includes('whale_comfyui_character'))
  assert.equal(tools.length, 9, `工具数 ${tools.length}: ${tools.join(',')}`)
  const routes = scanRoutes()
  assert.equal(routes.length, 9, routes.join(','))
  assert.ok(routes.includes('/dsh-video-studio/accounts'))
  assert.ok(routes.includes('/dsh-video-studio/comfyui'))
  assert.ok(routes.includes('/dsh-video-studio/comfyui/import'))
  assert.ok(routes.includes('/dsh-video-studio/comfyui/run'))
  assert.ok(routes.includes('/dsh-video-studio/prompt-optimize'))
  assert.ok(routes.includes('/dsh-video-studio/generate'))
  assert.ok(routes.includes('/dsh-video-studio/storyboard'))
  const tabs = scanClientTabs()
  assert.deepEqual(tabs, ['whale', 'whale-workbench', 'whale-accounts'])
})

test('测试计数与 git 事实', () => {
  const t = scanTests()
  assert.ok(t.files >= 20, `测试文件 ${t.files}`)
  assert.ok(t.cases >= 100, `用例数 ${t.cases}`)
  const g = gitFacts()
  if (g) {
    assert.ok(g.branch.length > 0)
    assert.ok(g.commits > 50)
    assert.equal(typeof g.lastCommit, 'string')
    assert.equal(typeof g.dirty, 'boolean')
  }
})

test('差距清单：字段齐全，等 key 项非空', () => {
  const gaps = knownGaps()
  assert.ok(gaps.length >= 5)
  assert.equal(new Set(gaps.map((g) => g.id)).size, gaps.length)
  for (const g of gaps) {
    assert.ok(g.item && g.note && ['todo', 'waiting-key', 'planned'].includes(g.status))
  }
  assert.ok(gaps.some((g) => g.status === 'waiting-key'))
})

test('buildAudit 事实完整：版本/供应商/预置题材/差距', () => {
  const a = buildAudit()
  assert.match(a.generatedAt, /^\d{4}-\d{2}-\d{2}T/)
  assert.equal(a.package.name, '@hackerfish/dsh-video-studio')
  assert.equal(a.providers.length, PROVIDER_MATRIX.length)
  assert.equal(a.presets.length, 5)
  assert.ok(a.gaps.length >= 5)
  assert.ok(a.modules.length >= 20)
})

test('报告渲染：关键章节齐全且含事实数据', () => {
  const a = buildAudit()
  const md = renderAuditMarkdown(a)
  for (const section of ['概览', '供应商矩阵', '能力清单', '差距清单（下一步）', '源码模块']) {
    assert.ok(md.includes(section), `缺章节 ${section}`)
  }
  assert.ok(md.includes(a.package.version))
  assert.ok(md.includes(String(a.tests.cases)))
  assert.ok(md.includes('kling-lipsync'))
  assert.ok(md.includes('whale_self_audit'))
  assert.ok(md.includes('🔑 等 key'))
  assert.ok(md.includes('勿手改'))
})
