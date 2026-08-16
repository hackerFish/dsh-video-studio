// 单条真机生成：prompt 从参数或环境取，sessionid 从环境取。
// 用法: DSH_JIMENG_SESSIONID=xxx node scripts/gen-one.mjs "提示词" [9:16|16:9|1:1]
import { createJimengProvider, type JimengProvider } from '../src/providers/jimeng.ts'
import { writeFile } from 'node:fs/promises'

const sid = process.env.DSH_JIMENG_SESSIONID
const prompt = process.argv[2] ?? process.env.WHALE_PROMPT
if (!sid || !prompt) { console.error('用法: DSH_JIMENG_SESSIONID=xxx node scripts/gen-one.mjs "提示词" [比例]'); process.exit(2) }
const aspect = process.argv[3] ?? '9:16'
const dims = { '16:9': [1280, 720], '9:16': [720, 1280], '1:1': [1024, 1024] }
const [w, h] = dims[aspect] ?? [720, 1280]
const p: JimengProvider = createJimengProvider({ sessionId: sid })

console.log(`① 提交: "${prompt}" ${w}x${h} 5s`)
const { jobId } = await p.submit('video', { positive: prompt, width: w, height: h, durationSec: 5 })
console.log('   history_id:', jobId)
let url = null
for (let i = 0; i < 60; i++) {
  await new Promise((r) => setTimeout(r, 10000))
  const st = await p.poll(jobId)
  process.stdout.write(`   [${String(i + 1).padStart(2)}] ${st.state}${st.videoUrl ? ' ✅' : ''}${st.error ? ' (' + st.error + ')' : ''}\n`)
  if (st.videoUrl) { url = st.videoUrl; break }
  if (st.state === 'failed' && !st.retryable) break
}
if (!url) { console.error('❌ 未出片（若 SystemBusy 稍后错峰重试即可，不扣额度）'); process.exit(1) }
const res = await fetch(url)
const buf = Buffer.from(await res.arrayBuffer())
const out = new URL('../demos/whale-real.mp4', import.meta.url).pathname
await writeFile(out, buf)
console.log('✅ 成片:', out, `(${(buf.length / 1024).toFixed(0)} KB)`)
