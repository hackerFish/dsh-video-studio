// SystemBusy 自动重试生成（免费档高峰拥堵时用；不扣额度，错峰重试）
// 运行: DSH_JIMENG_SESSIONID=xxx node scripts/retry-jimeng.mjs
import { createJimengProvider } from '../src/providers/jimeng.js'
import { writeFile } from 'node:fs/promises'

const sid = process.env.DSH_JIMENG_SESSIONID
if (!sid) { console.error('缺少 DSH_JIMENG_SESSIONID'); process.exit(2) }
const p = createJimengProvider({ sessionId: sid })

for (let attempt = 1; attempt <= 4; attempt++) {
  console.log(`\n[第 ${attempt} 次] 提交生成…`)
  const { jobId } = await p.submit('video', { positive: '一只鲸鱼在深海中游动，蓝色调，电影感', width: 720, height: 1280, durationSec: 5 })
  console.log('   history_id:', jobId)
  let url = null, err = null
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 10000))
    const st = await p.poll(jobId)
    process.stdout.write(`   [${String(i + 1).padStart(2)}] ${st.state}${st.videoUrl ? ' ✅' : ''}${st.error ? ' (' + st.error + ')' : ''}\n`)
    if (st.videoUrl) { url = st.videoUrl; break }
    if (st.state === 'failed') { err = st; break }
    if (st.state === 'done' && !st.videoUrl) { console.log('   完成但未提取地址:', JSON.stringify(st.rawItem).slice(0, 300)); break }
  }
  if (url) {
    const res = await fetch(url)
    const buf = Buffer.from(await res.arrayBuffer())
    const out = new URL('../demos/jimeng-live.mp4', import.meta.url).pathname
    await writeFile(out, buf)
    console.log('✅ 成片:', out, `(${(buf.length / 1024).toFixed(0)} KB)`)
    process.exit(0)
  }
  if (err && !err.retryable) { console.error('❌ 非重试类失败:', err.error); process.exit(1) }
  console.log('   SystemBusy → 90 秒后重试…')
  await new Promise((r) => setTimeout(r, 90000))
}
console.error('❌ 4 次尝试均 SystemBusy：免费档当前高峰拥堵，建议错峰重试（深夜/上午）')
process.exit(1)
