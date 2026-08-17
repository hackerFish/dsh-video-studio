import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runPipeline } from '../src/director/pipeline.ts'
import { assertProvider, type Provider } from '../src/provider.ts'
import { runFfmpeg } from '../src/finalcut/render-ffmpeg.ts'

const makeClip = async (dir: string, name = 'src.mp4'): Promise<string> => {
  const out = join(dir, name)
  await runFfmpeg(['-y', '-f', 'lavfi', '-i', 'color=c=0x335588:s=320x240:d=1', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', out])
  return out
}

const makeVoice = async (dir: string): Promise<string> => {
  const out = join(dir, 'line.mp3')
  await runFfmpeg(['-y', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=1', '-ac', '1', out])
  return out
}

/** 真提交/轮询路径的本地视频供应商（输出本地 mp4，走 ffmpeg 拷贝分支）。 */
const localVideoProvider = (clipPath: string): Provider => assertProvider({
  id: 'vt',
  capabilities: { textToVideo: true, qualityTier: 1 },
  async quote() { return { qualityTier: 1, costEstimate: 0, currency: 'mock' } },
  async submit() { return { jobId: 'v1' } },
  async status() { return { state: 'done', progress: 1 } },
  async fetch() { return { outputs: [clipPath] } },
  async health() { return { ok: true } },
})

test('口型同步段：audio2video 参数正确 + 对口型成片替换原片', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-lip-'))
  try {
    const clip = await makeClip(dir)
    const voice = await makeVoice(dir)
    const lipCalls: Record<string, unknown>[] = []
    const lipProvider = assertProvider({
      id: 'lip-mock',
      capabilities: { lipSync: true, qualityTier: 5 },
      async quote() { return { qualityTier: 5, costEstimate: 0, currency: 'mock' } },
      async submit(_stage, spec) { lipCalls.push(spec as Record<string, unknown>); return { jobId: 'l1' } },
      async status() { return { state: 'done', progress: 1 } },
      async fetch() { return { outputs: [clip] } },
      async health() { return { ok: true } },
    })
    const events: { stage: string; type: string }[] = []
    const r = await runPipeline({
      script: { title: 't', shots: [{ line: '测试台词', prompt: '画面', voiceFile: voice, durationSec: 1 }] },
      providers: [localVideoProvider(clip)],
      opts: { voice: false, subtitles: false, lipSync: lipProvider },
      onEvent: (e) => events.push(e),
      workDir: dir,
    })
    assert.ok(existsSync(r.outPath))
    const types = events.map((e) => `${e.stage}.${e.type}`)
    assert.ok(types.includes('final-cut.voice-file'), types.join(','))
    assert.ok(types.includes('final-cut.lipsync-submitted'), types.join(','))
    assert.ok(types.includes('final-cut.lipsync'), types.join(','))
    assert.ok(!types.includes('final-cut.lipsync-error'), types.join(','))
    const call = lipCalls[0]!
    assert.equal(call.mode, 'audio2video')
    assert.equal(call.videoId, 'v1')
    assert.equal(typeof call.audioBase64, 'string')
    assert.ok((call.audioBase64 as string).length > 0)
    assert.ok(existsSync(join(dir, 'shot0-lip.mp4')), '对口型片应落盘')
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('口型同步失败不致命：回退原片并发出 lipsync-error', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-lip-fail-'))
  try {
    const clip = await makeClip(dir)
    const voice = await makeVoice(dir)
    const lipProvider = assertProvider({
      id: 'lip-mock',
      capabilities: { lipSync: true, qualityTier: 5 },
      async quote() { return { qualityTier: 5, costEstimate: 0, currency: 'mock' } },
      async submit() { return { jobId: 'l1' } },
      async status() { return { state: 'failed', progress: 1, error: '额度不足' } },
      async fetch() { throw new Error('不应被调用') },
      async health() { return { ok: true } },
    })
    const events: { stage: string; type: string; detail: any }[] = []
    const r = await runPipeline({
      script: { title: 't', shots: [{ line: '测试台词', prompt: '画面', voiceFile: voice, durationSec: 1 }] },
      providers: [localVideoProvider(clip)],
      opts: { voice: false, subtitles: false, lipSync: lipProvider },
      onEvent: (e) => events.push(e),
      workDir: dir,
    })
    assert.ok(existsSync(r.outPath), '口型失败也要出片')
    const err = events.find((e) => e.type === 'lipsync-error')
    assert.ok(err, `应有 lipsync-error: ${events.map((e) => e.type).join(',')}`)
    assert.equal(err.detail.error, '额度不足')
    assert.ok(!existsSync(join(dir, 'shot0-lip.mp4')))
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('无配音或无声源引用时跳过口型同步（不产生 lipsync 事件）', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-lip-skip-'))
  try {
    const clip = await makeClip(dir)
    const lipProvider = assertProvider({
      id: 'lip-mock',
      capabilities: { lipSync: true, qualityTier: 5 },
      async quote() { return { qualityTier: 5, costEstimate: 0, currency: 'mock' } },
      async submit() { throw new Error('不应被调用') },
      async status() { return { state: 'done', progress: 1 } },
      async fetch() { return { outputs: [clip] } },
      async health() { return { ok: true } },
    })
    const events: { type: string }[] = []
    // mock 供应商走 fast path（无 jobId 无 sourceUrl）且不开配音 → 应完全跳过
    const r = await runPipeline({
      script: { title: 't', shots: [{ line: 'x', prompt: 'p' }] },
      providers: [localVideoProvider(clip)],
      opts: { voice: false, subtitles: false, lipSync: lipProvider },
      onEvent: (e) => events.push(e),
      workDir: dir,
    })
    assert.ok(existsSync(r.outPath))
    assert.ok(!events.some((e) => e.type.startsWith('lipsync')), events.map((e) => e.type).join(','))
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('voiceFile 路径不存在时不崩，按无配音处理', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-lip-missing-'))
  try {
    const clip = await makeClip(dir)
    const r = await runPipeline({
      script: { title: 't', shots: [{ line: 'x', prompt: 'p', voiceFile: join(dir, 'nope.mp3') }] },
      providers: [localVideoProvider(clip)],
      opts: { voice: false, subtitles: false },
      workDir: dir,
    })
    assert.ok(existsSync(r.outPath))
  } finally { rmSync(dir, { recursive: true, force: true }) }
})
