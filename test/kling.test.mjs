import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { createKlingDashScopeProvider } from '../src/providers/kling-dashscope.js'

test('缺 apiKey 拒绝创建', () => {
  assert.throws(() => createKlingDashScopeProvider({}), /apiKey/)
})

test('DashScope 协议：异步头 + submit/status/fetch（mock 服务器）', async () => {
  let sawAsyncHeader = null, sawAuth = null
  let state = 'PENDING'
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://x')
    sawAsyncHeader = req.headers['x-dashscope-async'] ?? null
    sawAuth = req.headers.authorization
    if (url.pathname.endsWith('video-synthesis') && req.method === 'POST') {
      res.end(JSON.stringify({ output: { task_id: 'task-123' } })); return
    }
    if (url.pathname === '/api/v1/tasks/task-123') {
      res.end(JSON.stringify({ output: { task_status: state, video_url: state === 'SUCCEEDED' ? 'https://cdn.example.com/k.mp4' : undefined } }))
      return
    }
    res.statusCode = 404; res.end()
  })
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  const port = server.address().port
  try {
    const p = createKlingDashScopeProvider({ apiKey: 'sk-test', baseUrl: `http://127.0.0.1:${port}` })
    const { jobId } = await p.submit('video', { positive: '月光下奔跑的小猫', durationSec: 5 })
    assert.equal(jobId, 'task-123')
    assert.equal(sawAsyncHeader, 'enable')
    assert.equal(sawAuth, 'Bearer sk-test')
    assert.equal((await p.status(jobId)).state, 'running')
    state = 'SUCCEEDED'
    assert.equal((await p.status(jobId)).state, 'done')
    const out = await p.fetch(jobId)
    assert.equal(out.outputs[0], 'https://cdn.example.com/k.mp4')
  } finally { await new Promise((r) => server.close(r)) }
})
