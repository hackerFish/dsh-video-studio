// 万相视频真机验证（DashScope 免费额度）：提交 → 轮询 → 下载 demos/dashscope-wan-live.mp4
// 运行: DSH_DASHSCOPE_KEY=sk-xxx node scripts/live-dashscope-wan.ts [model] [durationSec]
import { createDashScopeWanProvider } from '../src/providers/dashscope-wan.ts'
import { writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const key = process.env.DSH_DASHSCOPE_KEY
if (!key) { console.error('缺少 DSH_DASHSCOPE_KEY'); process.exit(2) }
const model = process.argv[2] ?? undefined
const durationSec = Number(process.argv[3] ?? 5)
const p = createDashScopeWanProvider({ apiKey: key, ...(model ? { model } : {}) })

console.log(`[万相真机] model=${model ?? '(默认)'} duration=${durationSec}s 提交…`)
const { jobId } = await p.submit('video', { positive: '一只鲸鱼在深海中游动，蓝色调，电影感，慢镜头', aspectRatio: '16:9', durationSec })
console.log('  task_id:', jobId)

for (let i = 0; i < 60; i++) {
  await new Promise((r) => setTimeout(r, 10000))
  const st = await p.status(jobId)
  process.stdout.write(`  [${String(i + 1).padStart(2)}] ${st.state}${st.error ? ' (' + st.error + ')' : ''}\n`)
  if (st.state === 'done') {
    const out = await p.fetch(jobId)
    const url = out.outputs[0]
    if (/^https?:/.test(url)) {
      const res = await fetch(url)
      const buf = Buffer.from(await res.arrayBuffer())
      const demosDir = fileURLToPath(new URL('../demos/', import.meta.url))
      await mkdir(demosDir, { recursive: true })
      const outPath = fileURLToPath(new URL('../demos/dashscope-wan-live.mp4', import.meta.url))
      await writeFile(outPath, buf)
      console.log(`✅ 成片: ${outPath} (${(buf.length / 1024).toFixed(0)} KB)`)
      process.exit(0)
    }
  }
  if (st.state === 'failed') { console.error('❌ 任务失败:', st.error); process.exit(1) }
}
console.error('❌ 超时（10 分钟）')
process.exit(1)
