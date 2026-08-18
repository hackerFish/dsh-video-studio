import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { createDoubaoProvider, DOUBAO_MODELS, DOUBAO_IMAGE_MODELS, SEEDANCE_RATIOS, SEEDANCE_DURATIONS } from '../src/providers/doubao.ts'

test('缺 apiKey 拒绝创建', () => {
  assert.throws(() => createDoubaoProvider({}), /apiKey/)
})

test('豆包 Seedream 文生图（资产图阶段, mock 服务器）', async () => {
  let sawPath = ''
  const server = createServer((req, res) => {
    sawPath = req.url ?? ''
    if (sawPath === '/images/generations' && req.method === 'POST') {
      res.end(JSON.stringify({ data: [{ url: 'https://cdn.example.com/seedream.png' }] }))
      return
    }
    res.statusCode = 404; res.end()
  })
  await new Promise<void>((r) => { server.listen(0, '127.0.0.1', () => r()) })
  const port = (server.address() as AddressInfo).port
  try {
    const p = createDoubaoProvider({ apiKey: 'k', baseUrl: `http://127.0.0.1:${port}` })
    const { jobId } = await p.submit('shot-assets', { positive: '鲸鱼角色图' })
    assert.match(jobId, /^https:\/\//)
    assert.equal((await p.status(jobId)).state, 'done')
    const out = await p.fetch(jobId)
    assert.equal(out.outputs[0], 'https://cdn.example.com/seedream.png')
  } finally { await new Promise((r) => server.close(() => r())) }
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

test('Seedance 请求体：ratio/duration/generate_audio/watermark 顶层字段 + 首帧图（吸收 ARK 真实实现）', async () => {
  let body: Record<string, any> | null = null
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://x')
    if (url.pathname === '/contents/generations/tasks' && req.method === 'POST') {
      let raw = ''
      req.on('data', (c: Buffer) => { raw += c.toString() })
      req.on('end', () => { body = JSON.parse(raw); res.end(JSON.stringify({ id: 'cgt-x' })) })
      return
    }
    res.statusCode = 404; res.end()
  })
  await new Promise<void>((r) => { server.listen(0, '127.0.0.1', () => r()) })
  const port = (server.address() as AddressInfo).port
  try {
    const p = createDoubaoProvider({ apiKey: 'k', baseUrl: `http://127.0.0.1:${port}` })
    await p.submit('video', {
      positive: '鲸鱼',
      durationSec: 10,
      aspectRatio: '9:16',
      generateAudio: false,
      watermark: true,
      imageUrl: 'https://cdn.example.com/first-frame.png',
    })
    assert.equal(body?.model, 'doubao-seedance-1-5-pro-251215')
    assert.equal(body?.duration, 10)
    assert.equal(body?.ratio, '9:16')
    assert.equal(body?.generate_audio, false)
    assert.equal(body?.watermark, true)
    assert.equal(body?.content[0]?.type, 'image_url')
    assert.equal(body?.content[0]?.image_url?.url, 'https://cdn.example.com/first-frame.png')
    assert.equal(body?.content[1]?.text, '鲸鱼')
    // 非法 ratio/duration 兜底
    await p.submit('video', { positive: 'x', durationSec: 7, aspectRatio: '10:10' })
    assert.equal(body?.duration, 5)
    assert.equal(body?.ratio, 'adaptive')
  } finally { await new Promise((r) => server.close(r)) }
})

test('Seedance 状态机：expired/cancelled → failed（吸收 ARK 状态枚举）', async () => {
  let st = 'running'
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://x')
    if (url.pathname === '/contents/generations/tasks') { res.end(JSON.stringify({ id: 'c' })); return }
    if (url.pathname === '/contents/generations/tasks/c') { res.end(JSON.stringify({ id: 'c', status: st })); return }
    res.statusCode = 404; res.end()
  })
  await new Promise<void>((r) => { server.listen(0, '127.0.0.1', () => r()) })
  const port = (server.address() as AddressInfo).port
  try {
    const p = createDoubaoProvider({ apiKey: 'k', baseUrl: `http://127.0.0.1:${port}` })
    const { jobId } = await p.submit('video', { positive: 'x' })
    st = 'expired'
    let s = await p.status(jobId)
    assert.equal(s.state, 'failed')
    assert.equal(s.error, 'expired')
    st = 'cancelled'
    s = await p.status(jobId)
    assert.equal(s.state, 'failed')
  } finally { await new Promise((r) => server.close(r)) }
})

test('响应防御性提取：data 嵌套与 video_url 兜底（吸收真实实现）', async () => {
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://x')
    if (url.pathname === '/contents/generations/tasks') { res.end(JSON.stringify({ data: { id: 'nested-1' } })); return }
    if (url.pathname === '/contents/generations/tasks/nested-1') {
      res.end(JSON.stringify({ data: { status: 'succeeded', content: { video_url: 'https://cdn.example.com/v2.mp4' } } })); return
    }
    res.statusCode = 404; res.end()
  })
  await new Promise<void>((r) => { server.listen(0, '127.0.0.1', () => r()) })
  const port = (server.address() as AddressInfo).port
  try {
    const p = createDoubaoProvider({ apiKey: 'k', baseUrl: `http://127.0.0.1:${port}` })
    const { jobId } = await p.submit('video', { positive: 'x' })
    assert.equal(jobId, 'nested-1')
    assert.equal((await p.status(jobId)).state, 'done')
    assert.equal((await p.fetch(jobId)).outputs[0], 'https://cdn.example.com/v2.mp4')
  } finally { await new Promise((r) => server.close(r)) }
})

test('模型清单：当前 API 可用的真实 ID（Seedance 2.0 无 API，已剔除）', () => {
  assert.ok(DOUBAO_MODELS.includes('doubao-seedance-1-5-pro-251215'))
  assert.ok(!DOUBAO_MODELS.some((m) => m.includes('2-0')), 'Seedance 2.0 官方无 API')
  assert.ok(DOUBAO_IMAGE_MODELS.includes('doubao-seedream-5-0-lite-260128'))
  assert.ok(SEEDANCE_RATIOS.includes('9:16') && SEEDANCE_DURATIONS.includes(10))
})
