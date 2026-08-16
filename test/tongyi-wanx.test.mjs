import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { createTongyiWanxProvider } from '../src/providers/tongyi-wanx.js'

test('凭证校验：缺 cookie/xsrf/uid 拒绝创建', () => {
  assert.throws(() => createTongyiWanxProvider({}), /cookieStr/)
  assert.throws(() => createTongyiWanxProvider({ cookieStr: 'a=1' }), /xsrfToken/)
  assert.throws(() => createTongyiWanxProvider({ cookieStr: 'a=1', xsrfToken: 'x' }), /wanUid/)
})

test('wanx 协议：xsrf 头 + imageGen/taskList（mock 服务器）', async () => {
  let sawXsrf = null, sawCookie = null
  let itemStatus = 'pending'
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://x')
    sawXsrf = req.headers['x-xsrf-token']
    sawCookie = req.headers.cookie
    if (url.pathname === '/common/imageGen' && req.method === 'POST') {
      res.end(JSON.stringify({ success: true, data: 'task-9' })); return
    }
    if (url.pathname === '/common/task/list') {
      res.end(JSON.stringify({ success: true, data: [{ taskId: 'task-9', status: 2, taskRate: itemStatus === 'done' ? 100 : 50, taskResult: itemStatus === 'done' ? [{ url: 'https://cdn.example.com/w.png' }] : [] }] }))
      return
    }
    res.statusCode = 404; res.end()
  })
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  const port = server.address().port
  try {
    const p = createTongyiWanxProvider({ cookieStr: 'a=1', xsrfToken: 'xsrf123', wanUid: 'uid-9', baseUrl: `http://127.0.0.1:${port}` })
    const { jobId } = await p.submit('image', { positive: '水墨山水' })
    assert.equal(jobId, 'task-9')
    assert.equal(sawXsrf, 'xsrf123')
    assert.match(sawCookie ?? '', /a=1/)
    assert.equal((await p.status(jobId)).state, 'running')
    itemStatus = 'done'
    assert.equal((await p.status(jobId)).state, 'done')
    const out = await p.fetch(jobId)
    assert.equal(out.outputs[0], 'https://cdn.example.com/w.png')
  } finally { await new Promise((r) => server.close(r)) }
})
