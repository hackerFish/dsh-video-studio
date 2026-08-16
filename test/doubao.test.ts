import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { createDoubaoProvider } from '../src/providers/doubao.ts'

test('缺 apiKey 拒绝创建', () => {
  assert.throws(() => createDoubaoProvider({}), /apiKey/)
})

test('Seedance 协议：submit/status/fetch + Bearer 鉴权（mock 服务器）', async () => {
  let sawAuth = null
  let status = 'queued'
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://x')
    sawAuth = req.headers.authorization
    if (url.pathname === '/contents/generations/tasks' && req.method === 'POST') {
      res.end(JSON.stringify({ id: 'cgt-1', status: 'queued' })); return
    }
    if (url.pathname === '/contents/generations/tasks/cgt-1') {
      res.end(JSON.stringify({ id: 'cgt-1', status, content: status === 'succeeded' ? { video_url: 'https://cdn.example.com/d.mp4' } : {} }))
      return
    }
    res.statusCode = 404; res.end()
  })
  await new Promise<void>((r) => { server.listen(0, '127.0.0.1', () => r()) })
  const port = (server.address() as AddressInfo).port
  try {
    const p = createDoubaoProvider({ apiKey: 'uuid-key', baseUrl: `http://127.0.0.1:${port}` })
    const { jobId } = await p.submit('video', { positive: '深海鲸鱼', durationSec: 5 })
    assert.equal(jobId, 'cgt-1')
    assert.match(sawAuth ?? '', /^Bearer /)
    assert.equal((await p.status(jobId)).state, 'running')
    status = 'succeeded'
    assert.equal((await p.status(jobId)).state, 'done')
    const out = await p.fetch(jobId)
    assert.equal(out.outputs[0], 'https://cdn.example.com/d.mp4')
  } finally { await new Promise((r) => server.close(r)) }
})
