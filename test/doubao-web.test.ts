import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { createDoubaoWebProvider, type DoubaoWebOptions } from '../src/providers/doubao-web.ts'

test('缺 cookie 拒绝创建', () => {
  assert.throws(() => createDoubaoWebProvider({}), /cookieStr/)
})

test('SSE 解析 + 文本/图片提取（mock 服务器, 协议对齐真实抓包）', async () => {
  const server = createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'text/event-stream' })
    res.write('id: 0\nevent: SSE_ACK\ndata: {"question_id":"q-1"}\n\n')
    res.write('id: 1\nevent: STREAM_CHUNK\ndata: {"text":"这是第一段故事"}\n\n')
    res.write('id: 2\nevent: FULL_MSG_NOTIFY\ndata: {"text":"，鲸鱼游过。","images":[{"url":"https://cdn.doubao.example.com/img/a.png"}]}\n\n')
    res.write('id: 3\nevent: SSE_REPLY_END\ndata: {"is_finish":true}\n\n')
    res.end()
  })
  await new Promise<void>((r) => { server.listen(0, '127.0.0.1', () => r()) })
  const port = (server.address() as AddressInfo).port
  try {
    const opts: DoubaoWebOptions = { cookieStr: 'sessionid=x', deviceId: 'dev-1', baseUrl: `http://127.0.0.1:${port}` }
    const p = createDoubaoWebProvider(opts) as ReturnType<typeof createDoubaoWebProvider> & { runOnce(stage: string, spec: Record<string, unknown>): Promise<{ text: string; imageUrls: string[]; questionId?: string }> }
    const r = await p.runOnce('story', { text: '一只鲸鱼' })
    assert.equal(r.questionId, 'q-1')
    assert.match(r.text, /第一段故事/)
    assert.match(r.text, /鲸鱼游过/)
    assert.ok(r.imageUrls.includes('https://cdn.doubao.example.com/img/a.png'))
  } finally { await new Promise((r) => server.close(() => r())) }
})
