// 轮询指定 history_id 并下载成片
// 运行: DSH_JIMENG_SESSIONID=xxx node scripts/poll-jimeng.mjs <history_id>
import { createJimengProvider } from '../src/providers/jimeng.js'
import { writeFile } from 'node:fs/promises'

const sid = process.env.DSH_JIMENG_SESSIONID
const jobId = process.argv[2]
if (!sid || !jobId) { console.error('用法: DSH_JIMENG_SESSIONID=xxx node scripts/poll-jimeng.mjs <history_id>'); process.exit(2) }
const p = createJimengProvider({ sessionId: sid })

let url = null
for (let i = 0; i < 60; i++) {
  await new Promise((r) => setTimeout(r, 10000))
  const st = await p.poll(jobId)
  process.stdout.write(`[${String(i + 1).padStart(2)}] ${st.state}${st.videoUrl ? ' ✅' : ''}\n`)
  if (st.videoUrl) { url = st.videoUrl; break }
  if (st.state === 'done' && !st.videoUrl) { console.log('原始条目:', JSON.stringify(st.rawItem).slice(0, 500)); break }
}
if (!url) { console.error('❌ 未获得视频地址'); process.exit(1) }
const res = await fetch(url)
const buf = Buffer.from(await res.arrayBuffer())
const out = new URL('../demos/jimeng-live.mp4', import.meta.url).pathname
await writeFile(out, buf)
console.log('✅ 成片:', out, `(${(buf.length / 1024).toFixed(0)} KB)`)
