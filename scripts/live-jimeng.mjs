// 真机验证：用 sessionid 生成 1 条 5 秒视频（最小额度消耗）
// 运行: DSH_JIMENG_SESSIONID=xxx node scripts/live-jimeng-test.mjs
import { createJimengProvider } from '../src/providers/jimeng.js'
import { mkdirSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'

const sid = process.env.DSH_JIMENG_SESSIONID
if (!sid) { console.error('缺少 DSH_JIMENG_SESSIONID'); process.exit(2) }
mkdirSync(new URL('../demos', import.meta.url).pathname, { recursive: true })
const p = createJimengProvider({ sessionId: sid })

console.log('① 检查积分额度…')
const h = await p.health()
console.log('   剩余积分:', h.quotaRemaining, JSON.stringify(h.detail ?? {}))
const cred = await p.ensureCredits()
console.log('   领取状态:', cred.received ? `已自动领取，剩余 ${cred.remaining}` : '无需领取')

console.log('② 提交生成任务（5 秒，720x1280，720p）…')
const { jobId } = await p.submit('video', { positive: '一只鲸鱼在深海中游动，蓝色调，电影感', width: 720, height: 1280, durationSec: 5 })
console.log('   history_id:', jobId)

console.log('③ 轮询结果（最多 12 分钟）…')
let url = null
for (let i = 0; i < 72; i++) {
  await new Promise((r) => setTimeout(r, 10000))
  const st = await p.poll(jobId)
  process.stdout.write(`   [${String(i + 1).padStart(2)}] state=${st.state}${st.videoUrl ? ' ✅' : ''}\n`)
  if (st.videoUrl) { url = st.videoUrl; break }
  if (st.state === 'done' && !st.videoUrl) { console.log('   ⚠️ 任务完成但未提取到地址，原始条目:', JSON.stringify(st.rawItem).slice(0, 400)); break }
}
if (!url) { console.error('❌ 未获得视频地址'); process.exit(1) }

console.log('④ 下载成片…')
const res = await fetch(url)
const buf = Buffer.from(await res.arrayBuffer())
const out = new URL('../demos/jimeng-live.mp4', import.meta.url).pathname
await writeFile(out, buf)
console.log('✅ 成片:', out, `(${(buf.length / 1024).toFixed(0)} KB) · 视频地址可回放`)
