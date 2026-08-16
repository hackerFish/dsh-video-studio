import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { createDashScopeWanProvider } from '../src/providers/dashscope-wan.ts'

test('缺 key 拒绝创建', () => {
  assert.throws(() => createDashScopeWanProvider({}), /apiKey/)
})

test('万相 DashScope 协议：提交/轮询/取片（mock 服务器）', async () => {
  let sawModel = null as string | null
  let taskStatus = 'PENDING'
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://x')
    if (url.pathname.endsWith('video-synthesis') && req.method === 'POST') {
      let body = ''
      req.on('data', (d) => { body += d })
      req.on('end', () => {
        sawModel = (JSON.parse(body) as { model?: string }).model ?? null
        res.end(JSON.stringify({ output: { task_id: 'wan-1' } }))
      })
      return
    }
    if (url.pathname === '/api/v1/tasks/wan-1') {
      res.end(JSON.stringify({ output: { task_status: taskStatus, video_url: taskStatus === 'SUCCEEDED' ? 'https://cdn.example.com/wan.mp4' : undefined } }))
      return
    }
    res.statusCode = 404; res.end()
  })
  await new Promise<void>((r) => { server.listen(0, '127.0.0.1', () => r()) })
  const port = (server.address() as AddressInfo).port
  try {
    const p = createDashScopeWanProvider({ apiKey: 'sk-x', baseUrl: `http://127.0.0.1:${port}` })
    const { jobId } = await p.submit('video', { positive: '深海鲸鱼', durationSec: 5 })
    assert.equal(jobId, 'wan-1')
    assert.equal(sawModel, 'wan2.2-t2v-plus')
    assert.equal((await p.status(jobId)).state, 'running')
    taskStatus = 'SUCCEEDED'
    assert.equal((await p.status(jobId)).state, 'done')
    const out = await p.fetch(jobId)
    assert.equal(out.outputs[0], 'https://cdn.example.com/wan.mp4')
  } finally { await new Promise((r) => server.close(() => r())) }
})
