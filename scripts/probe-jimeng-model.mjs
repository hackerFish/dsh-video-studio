// 探测当前可用的即梦视频模型 key（每次被拒不消耗额度；成功者返回 history_record_id）
// 运行: DSH_JIMENG_SESSIONID=xxx node scripts/probe-jimeng-model.mjs
import { createJimengProvider, MODEL_KEYS } from '../src/providers/jimeng.js'

const sid = process.env.DSH_JIMENG_SESSIONID
if (!sid) { console.error('缺少 DSH_JIMENG_SESSIONID'); process.exit(2) }
const p = createJimengProvider({ sessionId: sid })

for (const key of MODEL_KEYS) {
  try {
    const { jobId } = await p.submit('video', { positive: '一只鲸鱼在深海中游动', width: 720, height: 1280, durationSec: 5, modelKey: key })
    console.log(`✅ ${key} → history_id=${jobId}`)
    process.exit(0)
  } catch (e) {
    console.log(`❌ ${key} → ${String(e?.message ?? e).slice(0, 90)}`)
  }
}
console.log('全部模型 key 均不可用：可能账号免费额度不含视频模型，或需要从官网抓取当前 key（F12 看生成请求的 model_req_key）')
process.exit(1)
