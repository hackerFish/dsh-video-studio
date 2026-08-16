// ComfyUI 能力演示（无 GPU 也能看）：
// ① 导演层决策 → workflow JSON（变量替换 + 占位校验）
// ② mock ComfyUI 服务器端到端（提交→轮询→取片）
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { buildWorkflow, validateWorkflow } from '../src/director/workflow-builder.ts'
import { createComfyUIProvider } from '../src/providers/comfyui.ts'

console.log('════ ① 分镜决策 → ComfyUI workflow JSON ════')
const wf = buildWorkflow({ positive: '一只鲸鱼在深海中游动，蓝色调，电影感', checkpoint: 'wan2.2_bf16.safetensors', shotId: 'shot-01' })
console.log(JSON.stringify(wf, null, 2).slice(0, 900))
console.log('校验:', validateWorkflow(wf).length ? validateWorkflow(wf) : '✅ 全部节点就绪（若用默认模板则提示待替换占位）')

console.log('════ ② mock ComfyUI 端到端 ════')
const history = new Map<string, unknown>()
const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://x')
  if (url.pathname === '/prompt' && req.method === 'POST') {
    let body = ''
    req.on('data', (d) => { body += d })
    req.on('end', () => {
      const id = 'p-demo'
      history.set(id, { outputs: { '6': { videos: [{ filename: 'whale.mp4', subfolder: '', type: 'output' }] } }, status: { status_str: 'success' } })
      res.end(JSON.stringify({ prompt_id: id }))
    })
    return
  }
  if (url.pathname === '/history/p-demo') { res.end(JSON.stringify({ 'p-demo': history.get('p-demo') })); return }
  if (url.pathname === '/queue') { res.end(JSON.stringify({ queue_running: [], queue_pending: [] })); return }
  if (url.pathname === '/view') { res.end('VIDEO-BYTES'); return }
  res.statusCode = 404; res.end()
})
await new Promise<void>((r) => { server.listen(0, '127.0.0.1', () => r()) })
const port = (server.address() as AddressInfo).port
const p = createComfyUIProvider({ baseUrl: `http://127.0.0.1:${port}` })
const { jobId } = await p.submit('video', { workflow: wf })
console.log('提交:', jobId)
console.log('轮询:', JSON.stringify(await p.status(jobId)))
const out = await p.fetch(jobId)
console.log('取片:', out.outputs[0], '| 下载字节:', (await (await fetch(out.outputs[0])).text()).length)
await new Promise<void>((r) => { server.close(() => r()) })
console.log('✅ ComfyUI 全链路（协议级）演示完成')
