import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { createTongyiWanxProvider, parseCookieStr } from '../src/providers/tongyi-wanx.js'

test('Cookie 解析与 XSRF 校验', () => {
  const c = parseCookieStr('a=1; XSRF-TOKEN=xsrf123; b=2')
  assert.equal(c['XSRF-TOKEN'], 'xsrf123')
  assert.throws(() => createTongyiWanxProvider({ cookieStr: 'a=1' }), /XSRF-TOKEN/)
})

test('wanx 协议：xsrf 头 + imageGen/taskList（mock 服务器）', async () => {
  let sawXsrf = null, sawCookie = null
  let itemStatus = 'pending'
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://x')
    sawXsrf = req.headers['x-xsrf-token']
    sawCookie = req.headers.cookie
    if (url.pathname === '/imageGen' && req.method === 'POST') {
      res.end(JSON.stringify({ success: true, data: 'task-9' })); return
    }
    if (url.pathname === '/task/list') {
      res.end(JSON.stringify({ success: true, data: [{ id: 'task-9', status: itemStatus, imageUrl: itemStatus === 'success' ? 'https://cdn.example.com/w.png' : undefined }] }))
      return
    }
    res.statusCode = 404; res.end()
  })
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  const port = server.address().port
  try {
    const p = createTongyiWanxProvider({ cookieStr: 'XSRF-TOKEN=xsrf123; a=1', baseUrl: `http://127.0.0.1:${port}` })
    const { jobId } = await p.submit('image', { positive: '水墨山水' })
    assert.equal(jobId, 'task-9')
    assert.equal(sawXsrf, 'xsrf123')
    assert.match(sawCookie ?? '', /XSRF-TOKEN=xsrf123/)
    assert.equal((await p.status(jobId)).state, 'running')
    itemStatus = 'success'
    assert.equal((await p.status(jobId)).state, 'done')
    const out = await p.fetch(jobId)
    assert.equal(out.outputs[0], 'https://cdn.example.com/w.png')
  } finally { await new Promise((r) => server.close(r)) }
})
