import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdtempSync, rmSync, existsSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { sayAvailable, sayTts } from '../src/voice/say-tts.js'
import { createComfyUIProvider } from '../src/providers/comfyui.js'
import { buildWorkflow, validateWorkflow, DEFAULT_TEMPLATE } from '../src/director/workflow-builder.js'

test('workflow 构建：变量替换 + 未替换占位可被校验器抓住', () => {
  const wf = buildWorkflow({ checkpoint: 'wan2.1.safetensors', positive: '国风，深海底，鲸鱼', seed: 42 })
  assert.equal(wf['1'].inputs.ckpt_name, 'wan2.1.safetensors')
  assert.equal(wf['2'].inputs.text, '国风，深海底，鲸鱼')
  assert.equal(wf['4'].inputs.seed, 42)
  assert.ok(validateWorkflow(wf).some((e) => e.includes('REPLACE_WITH_VIDEO_SAMPLER_NODE')))
  const ok = buildWorkflow({ workflowTemplate: { '1': { class_type: 'WanSampler', inputs: {} } } })
  assert.deepEqual(validateWorkflow(ok), [])
})

test('macOS say：中文配音产出 aiff（无 key 真 TTS）', { skip: !sayAvailable() }, async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-say-'))
  try {
    const out = join(dir, 'line.aiff')
    await sayTts({ text: '你好，鲸影。', outPath: out })
    assert.ok(existsSync(out))
    assert.ok(statSync(out).size > 10_000, `文件过小: ${statSync(out).size}`)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('ComfyUI 协议：submit → status → fetch（mock 服务器级验证）', async () => {
  const queue = []
  let promptId = 0
  const history = new Map()
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://x')
    if (url.pathname === '/prompt' && req.method === 'POST') {
      let body = ''
      req.on('data', (d) => { body += d })
      req.on('end', () => {
        const id = `p${++promptId}`
        const parsed = JSON.parse(body)
        queue.push([id, parsed.client_id])
        history.set(id, { outputs: { '6': { videos: [{ filename: 'out.mp4', subfolder: '', type: 'output' }] } }, status: { status_str: 'success' } })
        res.end(JSON.stringify({ prompt_id: id }))
      })
      return
    }
    if (url.pathname.startsWith('/history/')) {
      const id = url.pathname.split('/')[2]
      const h = history.get(id)
      res.end(JSON.stringify(h ? { [id]: h } : {}))
      return
    }
    if (url.pathname === '/queue') { res.end(JSON.stringify({ queue_running: queue, queue_pending: [] })); return }
    if (url.pathname === '/system_stats') { res.end(JSON.stringify({ devices: [{ name: 'mock-gpu' }] })); return }
    if (url.pathname === '/view') { res.end('VIDEOBYTES'); return }
    res.statusCode = 404; res.end()
  })
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  const port = server.address().port
  try {
    const p = createComfyUIProvider({ baseUrl: `http://127.0.0.1:${port}` })
    assert.equal((await p.health()).ok, true)
    const wf = buildWorkflow({ workflowTemplate: { '1': { class_type: 'WanSampler', inputs: {} } } })
    const { jobId } = await p.submit('video', { workflow: wf })
    assert.equal((await p.status(jobId)).state, 'done')
    const out = await p.fetch(jobId)
    assert.equal(out.outputs.length, 1)
    assert.match(out.outputs[0], /\/view\?filename=out\.mp4/)
    // 下载验证
    const r = await fetch(out.outputs[0])
    assert.equal(await r.text(), 'VIDEOBYTES')
  } finally {
    await new Promise((r) => server.close(r))
  }
})
