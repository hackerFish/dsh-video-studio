import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { generateKlingJwt, parseKlingKey, createKlingProvider } from '../src/providers/kling.ts'

test('JWT：结构与签名可验证', () => {
  const t = generateKlingJwt('ak', 'sk', 1_786_000_000_000)
  const [h, p, s] = t.split('.')
  assert.equal(JSON.parse(Buffer.from(h, 'base64url').toString()).alg, 'HS256')
  const payload = JSON.parse(Buffer.from(p, 'base64url').toString())
  assert.equal(payload.iss, 'ak')
  assert.equal(payload.exp, 1_786_000_000 + 1800)
  assert.ok(s.length > 20)
  assert.throws(() => parseKlingKey('no-colon'), /accessKey:secretKey/)
})

test('官方协议：JWT 鉴权 + submit/status/fetch（mock 服务器）', async () => {
  let sawAuth = null
  let taskStatus = 'submitted'
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://x')
    sawAuth = req.headers.authorization
    if (url.pathname === '/v1/videos/text2video' && req.method === 'POST') {
      res.end(JSON.stringify({ code: 0, data: { task_id: 't9', task_status: 'submitted' } })); return
    }
    if (url.pathname === '/v1/videos/text2video/t9') {
      res.end(JSON.stringify({ code: 0, data: { task_id: 't9', task_status: taskStatus,
        task_result: taskStatus === 'succeed' ? { videos: [{ url: 'https://cdn.example.com/k.mp4', duration: '5' }] } : undefined } }))
      return
    }
    res.statusCode = 404; res.end()
  })
  await new Promise<void>((r) => { server.listen(0, '127.0.0.1', () => r()) })
  const port = (server.address() as AddressInfo).port
  try {
    const p = createKlingProvider({ apiKey: 'ak:sk', baseUrl: `http://127.0.0.1:${port}` })
    const { jobId } = await p.submit('video', { positive: '鲸鱼', durationSec: 5, aspectRatio: '9:16' })
    assert.equal(jobId, 't9')
    assert.match(sawAuth ?? '', /^Bearer /)
    assert.equal((await p.status(jobId)).state, 'running')
    taskStatus = 'succeed'
    assert.equal((await p.status(jobId)).state, 'done')
    const out = await p.fetch(jobId)
    assert.equal(out.outputs[0], 'https://cdn.example.com/k.mp4')
  } finally { await new Promise((r) => server.close(r)) }
})

test('缺 key 拒绝创建', () => {
  assert.throws(() => createKlingProvider({}), /apiKey/)
})
