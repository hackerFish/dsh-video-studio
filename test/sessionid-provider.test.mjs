import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { createSessionIdProvider, SESSIONID_PRESETS } from '../src/providers/sessionid-http.js'

test('预设表：即梦/可灵 均含免费额度标记', () => {
  assert.ok(SESSIONID_PRESETS.jimeng.dailyQuota > 0)
  assert.ok(SESSIONID_PRESETS.kling.dailyQuota > 0)
  assert.throws(() => createSessionIdProvider({ preset: 'nope', sessionId: 'x' }), /未知/)
  assert.throws(() => createSessionIdProvider({ preset: 'jimeng' }), /sessionId/)
})

test('协议：Bearer 鉴权 + submit/status/fetch（mock 服务器）', async () => {
  let sawAuth = null
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://x')
    sawAuth = req.headers.authorization
    if (url.pathname.endsWith('/generate_video') && req.method === 'POST') { res.end(JSON.stringify({ data: { task_id: 't1' } })); return }
    if (url.pathname.endsWith('/query')) {
      res.end(JSON.stringify({ data: { status: 'success', video_url: 'https://cdn.example.com/v.mp4' } }))
      return
    }
    res.statusCode = 404; res.end()
  })
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  const port = server.address().port
  try {
    const p2 = (() => {
      const orig = SESSIONID_PRESETS.jimeng.baseUrl
      SESSIONID_PRESETS.jimeng.baseUrl = `http://127.0.0.1:${port}`
      try { return createSessionIdProvider({ preset: 'jimeng', sessionId: 'SECRET_SESSION_ID', fetchImpl: fetch }) }
      finally { SESSIONID_PRESETS.jimeng.baseUrl = orig }
    })()
    const { jobId } = await p2.submit('video', { positive: '深海鲸鱼', durationSec: 5 })
    assert.equal(jobId, 't1')
    assert.equal(sawAuth, 'Bearer SECRET_SESSION_ID')
    assert.equal((await p2.status(jobId)).state, 'done')
    const out = await p2.fetch(jobId)
    assert.equal(out.outputs[0], 'https://cdn.example.com/v.mp4')
  } finally { await new Promise((r) => server.close(r)) }
})
