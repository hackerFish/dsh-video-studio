import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createKlingLipsyncProvider } from '../src/providers/kling-lipsync.ts'

const KEY = 'ak-123:sk-456'

/** 可脚本化的 fetch 替身：按路径返回可灵官方格式，并记录请求 */
function fakeFetch(handlers: Record<string, (method: string, body: unknown) => unknown>) {
  const calls: { method: string; path: string; body: unknown; headers: Record<string, string> }[] = []
  const fn = async (url: string, init: any) => {
    const path = url.replace('https://api-beijing.klingai.com', '')
    const body = init?.body ? JSON.parse(init.body) : undefined
    calls.push({ method: init?.method ?? 'GET', path, body, headers: init?.headers ?? {} })
    const handler = handlers[path]
    if (!handler) return { ok: false, status: 404, text: async () => 'not found' } as any
    const payload = handler(init?.method ?? 'GET', body)
    if (payload instanceof Error) return { ok: false, status: 400, text: async () => payload.message } as any
    return { ok: true, json: async () => payload } as any
  }
  fn.calls = calls
  return fn
}

const submitOk = () => ({ code: 0, message: 'SUCCEED', data: { task_id: 't1', task_status: 'submitted' } })
const statusOf = (st: string) => ({ code: 0, message: 'SUCCEED', data: { task_id: 't1', task_status: st, task_status_msg: st === 'failed' ? '生成失败' : undefined, task_result: st === 'succeed' ? { videos: [{ url: 'https://cdn.kling/v.mp4', duration: '5' }] } : undefined } })

test('audio2video：url 模式字段映射 + JWT 鉴权头', async () => {
  const f = fakeFetch({
    '/v1/videos/text2video/connectivity-test': () => ({ code: 0 }),
    '/v1/videos/lip-sync': () => submitOk(),
  })
  const p = createKlingLipsyncProvider({ apiKey: KEY, fetchImpl: f as any })
  const { jobId } = await p.submit('final-cut', { videoUrl: 'https://cdn.kling/in.mp4', audioUrl: 'https://cdn.kling/voice.mp3' })
  assert.equal(jobId, 't1')
  const call = f.calls.find((c) => c.path === '/v1/videos/lip-sync')!
  assert.ok(call.headers.Authorization?.startsWith('Bearer '), '应带 JWT')
  assert.equal(call.body.input.mode, 'audio2video')
  assert.equal(call.body.input.video_url, 'https://cdn.kling/in.mp4')
  assert.equal(call.body.input.audio_type, 'url')
  assert.equal(call.body.input.audio_url, 'https://cdn.kling/voice.mp3')
})

test('audio2video：base64 文件模式 → audio_type=file', async () => {
  const f = fakeFetch({ '/v1/videos/lip-sync': () => submitOk() })
  const p = createKlingLipsyncProvider({ apiKey: KEY, fetchImpl: f as any })
  await p.submit('final-cut', { videoUrl: 'https://cdn.kling/in.mp4', audioBase64: 'aGVsbG8=' })
  const call = f.calls.find((c) => c.path === '/v1/videos/lip-sync')!
  assert.equal(call.body.input.audio_type, 'file')
  assert.equal(call.body.input.audio_file, 'aGVsbG8=')
})

test('text2video：音色/语速/语言字段映射，text 截断 120 字', async () => {
  const f = fakeFetch({ '/v1/videos/lip-sync': () => submitOk() })
  const p = createKlingLipsyncProvider({ apiKey: KEY, fetchImpl: f as any })
  await p.submit('final-cut', { videoUrl: 'https://cdn.kling/in.mp4', mode: 'text2video', text: '口'.repeat(200), voiceId: 'v_ting', voiceLanguage: 'en', voiceSpeed: 1.5 })
  const call = f.calls.find((c) => c.path === '/v1/videos/lip-sync')!
  assert.equal(call.body.input.mode, 'text2video')
  assert.equal(call.body.input.voice_id, 'v_ting')
  assert.equal(call.body.input.voice_language, 'en')
  assert.equal(call.body.input.voice_speed, 1.5)
  assert.equal((call.body.input.text as string).length, 120)
})

test('缺 video/audio/text/voiceId 各自报错', async () => {
  const f = fakeFetch({ '/v1/videos/lip-sync': () => submitOk() })
  const p = createKlingLipsyncProvider({ apiKey: KEY, fetchImpl: f as any })
  await assert.rejects(() => p.submit('final-cut', { audioUrl: 'a' }), /videoId 或 videoUrl/)
  await assert.rejects(() => p.submit('final-cut', { videoUrl: 'v', mode: 'audio2video' }), /audioUrl 或 audioBase64/)
  await assert.rejects(() => p.submit('final-cut', { videoUrl: 'v' }), /text/) // 无音频默认 text2video
  await assert.rejects(() => p.submit('final-cut', { videoUrl: 'v', mode: 'text2video', text: 't' }), /voiceId/)
})

test('状态机映射：submitted/processing→running，succeed→done，failed→failed', async () => {
  const f = fakeFetch({
    '/v1/videos/lip-sync/t1': (m: string, body: unknown) => {
      void body
      const st = (globalThis as any).__st ?? 'submitted'
      return statusOf(st)
    },
  })
  const p = createKlingLipsyncProvider({ apiKey: KEY, fetchImpl: f as any })
  ;(globalThis as any).__st = 'submitted'
  assert.deepEqual(await p.status('t1'), { state: 'running', progress: null })
  ;(globalThis as any).__st = 'processing'
  assert.deepEqual(await p.status('t1'), { state: 'running', progress: null })
  ;(globalThis as any).__st = 'succeed'
  assert.deepEqual(await p.status('t1'), { state: 'done', progress: 1 })
  ;(globalThis as any).__st = 'failed'
  const st = await p.status('t1')
  assert.equal(st.state, 'failed')
  assert.equal(st.error, '生成失败')
  delete (globalThis as any).__st
})

test('fetch 取 task_result.videos[0].url，缺地址报错', async () => {
  const f = fakeFetch({ '/v1/videos/lip-sync/t1': () => statusOf('succeed') })
  const p = createKlingLipsyncProvider({ apiKey: KEY, fetchImpl: f as any })
  const out = await p.fetch('t1')
  assert.equal(out.outputs[0], 'https://cdn.kling/v.mp4')
  const f2 = fakeFetch({ '/v1/videos/lip-sync/t1': () => ({ code: 0, data: { task_status: 'succeed', task_result: { videos: [] } } }) })
  const p2 = createKlingLipsyncProvider({ apiKey: KEY, fetchImpl: f2 as any })
  await assert.rejects(() => p2.fetch('t1'), /无视频地址/)
})

test('code≠0 直接抛错，健康检查走连通性接口', async () => {
  const f = fakeFetch({
    '/v1/videos/lip-sync': () => ({ code: 1400, message: '余额不足' }),
    '/v1/videos/text2video/connectivity-test': () => ({ code: 0 }),
  })
  const p = createKlingLipsyncProvider({ apiKey: KEY, fetchImpl: f as any })
  await assert.rejects(() => p.submit('final-cut', { videoUrl: 'v', audioUrl: 'a' }), /余额不足/)
  const h = await p.health()
  assert.equal(h.ok, true)
})

test('能力声明：lipSync/tts 为真，quote 档位 8', async () => {
  const p = createKlingLipsyncProvider({ apiKey: KEY })
  assert.equal(p.capabilities.lipSync, true)
  assert.equal(p.capabilities.tts, true)
  assert.equal((await p.quote('final-cut', {})).qualityTier, 8)
})
