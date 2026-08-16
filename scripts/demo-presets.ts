// Demo: 预置内容包 → 分镜脚本 → 流水线成片（mock 供应商，无需任何凭证）。
// 用法: node scripts/demo-presets.ts [presetId]   （不传则打印 5 套题材清单）
import { listStoryPresets, getStoryPreset, presetToScript } from '../src/content/presets.ts'
import { runPipeline } from '../src/director/pipeline.ts'
import { createMockProvider } from '../src/providers/mock.ts'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const id = process.argv[2]

if (!id) {
  console.log('鲸影预置漫剧内容包 / Whale preset motion-comic pack\n')
  for (const p of listStoryPresets()) {
    console.log(`- ${p.id.padEnd(18)} ${p.title} / ${p.titleEn}`)
    console.log(`    ${p.genre} · ${p.shotCount} 镜 · ${p.characterCount} 角色`)
    console.log(`    钩子: ${p.hook}`)
  }
  console.log('\n用法: node scripts/demo-presets.ts <presetId>')
  process.exit(0)
}

const preset = getStoryPreset(id)
if (!preset) {
  console.error(`未知题材: ${id}（可选 ${listStoryPresets().map((p) => p.id).join('/')}）`)
  process.exit(1)
}

const script = presetToScript(preset)
console.log(`《${script.title}》`)
console.log(`风格 DNA: ${preset.styleDna}\n`)
for (const s of script.shots) {
  console.log(`镜${script.shots.indexOf(s)} · ${s.durationSec}s`)
  console.log(`  台词: ${s.line}`)
  console.log(`  画面: ${s.prompt}\n`)
}

const workDir = mkdtempSync(join(tmpdir(), 'whale-preset-'))
console.log(`→ 跑流水线（mock 供应商，voice 关）: ${workDir}`)
const r = await runPipeline({
  script,
  providers: [createMockProvider()],
  opts: { voice: false, subtitles: false },
  workDir,
})
console.log(`→ 成片: ${r.outPath}`)
const stageOrder = [...new Set(r.events.map((e) => e.stage))]
console.log(`→ 阶段覆盖: ${stageOrder.join(' → ')}`)
