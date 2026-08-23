// 本地全流程验证：小说分镜 → 角色三视图顶级提示词 → ComfyUI 本地执行 → 出图 demos/。
// 运行: node scripts/live-comfyui-character.ts [角色名] [描述]
import { writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { buildCharacterPrompt } from '../src/host/storyboard.ts'
import { buildImageWorkflow } from '../src/director/workflow-builder.ts'

const BASE = process.env.DSH_COMFYUI_BASE ?? 'http://127.0.0.1:8188'
const CKPT = process.env.DSH_COMFYUI_CKPT ?? 'v1-5-pruned-emaonly.safetensors'
const W = Number(process.env.DSH_COMFYUI_WIDTH ?? 768)
const H = Number(process.env.DSH_COMFYUI_HEIGHT ?? 768)
const STEPS = Number(process.env.DSH_COMFYUI_STEPS ?? 25)
const name = process.argv[2] ?? '林越'
const description = process.argv[3] ?? '28岁男性，利落黑色短发，冷峻眼神，藏青冲锋衣，身形精瘦挺拔'
const style = '3D 国漫写实，电影级'

console.log(`[本地 ComfyUI 全流程] ckpt=${CKPT}`)
// 1) 三视图顶级提示词（character-sheet 模板 + 增益）
const c = buildCharacterPrompt({ name, description }, style, '1:1')
console.log('提示词长度:', c.prompt.length)
// 2) 生成 workflow
const wf = buildImageWorkflow({ positive: c.prompt, negative: c.negative.join('，'), checkpoint: CKPT, width: W, height: H, steps: STEPS, shotId: 'char-' + name })
console.log('workflow 节点数:', Object.keys(wf).length)
// 3) 提交
const t0 = Date.now()
const r = await fetch(`${BASE}/prompt`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt: wf, client_id: 'whale-live-' + Date.now() }),
})
const j = await r.json().catch(() => ({}))
const pid = j?.prompt_id
if (!r.ok || !pid) { console.error('❌ 提交失败:', JSON.stringify(j ?? (await r.text())).slice(0, 300)); process.exit(1) }
console.log('已提交 prompt_id:', pid, '（ComfyUI 界面 Queue 可见）')
// 4) 轮询
let url = null
for (let i = 0; i < 240; i++) { // CPU 模式可能很慢，最长 12 分钟
  await new Promise((res) => setTimeout(res, 3000))
  try {
    const h = await (await fetch(`${BASE}/history/${pid}`)).json()
    const entry = h?.[pid]
    if (entry?.status?.status_str === 'error') { console.error('❌ 生成错误:', JSON.stringify(entry.status?.messages ?? '').slice(0, 300)); process.exit(1) }
    for (const outputs of Object.values(entry?.outputs ?? {})) {
      const list = Array.isArray(outputs) ? outputs : Object.values(outputs ?? {})
      for (const o of list.flat()) {
        const item = o as { filename?: string; subfolder?: string; type?: string } | null
        if (item?.filename) url = `${BASE}/view?filename=${encodeURIComponent(item.filename)}&subfolder=${item.subfolder ?? ''}&type=${item.type ?? 'output'}`
      }
    }
    if (url) break
    process.stdout.write(`  [${i + 1}] 渲染中… ${Math.round((Date.now() - t0) / 1000)}s\n`)
  } catch { /* 轮询 */ }
}
if (!url) { console.error('❌ 超时 5 分钟'); process.exit(1) }
// 5) 下载结果
const img = await (await fetch(url)).arrayBuffer()
const outPath = fileURLToPath(new URL(`../demos/character-${name}.png`, import.meta.url))
await mkdir(fileURLToPath(new URL('../demos/', import.meta.url)), { recursive: true })
await writeFile(outPath, Buffer.from(img))
console.log(`✅ 三视图出图: ${outPath} (${(img.byteLength / 1024).toFixed(0)} KB, 用时 ${Math.round((Date.now() - t0) / 1000)}s)`)
