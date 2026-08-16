// 无 key 全自动样片（v2：走导演流水线编排器 runPipeline，而非手写拼装）
// 运行: node scripts/demo.mjs   （产物: demos/final.mp4）
import { mkdirSync } from 'node:fs'
import { runPipeline } from '../src/director/pipeline.js'
import { createMockProvider } from '../src/providers/mock.js'

const ROOT = new URL('..', import.meta.url).pathname
const DEMO = `${ROOT}/demos`
mkdirSync(DEMO, { recursive: true })

const script = {
  title: '鲸鱼的独白',
  shots: [
    { line: '在这片深海之下，住着一只爱做梦的鲸鱼。', prompt: '深海底，蓝色调，鲸鱼游过' },
    { line: '它梦想着，有一天能游进云层之上。', prompt: '深海底向上仰望，光线洒下' },
    { line: '今天，它终于浮出了海面。', prompt: '海面之上，跃出水面的鲸鱼' },
  ],
}

const events = []
const result = await runPipeline({
  script,
  providers: [createMockProvider()],
  accounts: [{ id: 'free-jimeng', provider: 'mock', dailyQuota: 66, usedToday: 0, qualityTier: 1 }],
  opts: { styleDna: '国风，深海蓝，电影感', shotTemplate: '{{width}}x{{height}} 竖屏', preferCost: true, subtitles: true, voice: true },
  gates: { stills: 'auto', voice: 'auto', 'final-cut': 'auto' },
  onEvent: (e) => events.push(e),
  workDir: DEMO,
})
console.log('✅ 成片:', result.outPath)
console.log('   事件:', result.events.map((e) => e.stage).join(' → '))
console.log('   额度决策:', result.audit.decisions.map((d) => `${d.shot}:${d.provider}/${d.account ?? '-'}`).join(' '))
