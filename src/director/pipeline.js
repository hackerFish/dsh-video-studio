// 导演流水线编排器（主项目核心）：把六段管线串成一条可执行、可审计、可接管的链路。
// parse → storyboard → stills/video(供应商路由+额度调度) → voice(say/云TTS) → final-cut(ffmpeg/草稿)
// 每段发出事件；gate=ask 时通过 ask 回调征求用户决定；全部决策进入审计记录。
import { mkdirSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { createTimeline, addClip, addSubtitle, addAudio } from '../finalcut/timeline.js'
import { renderTimeline, runFfmpeg, probeDurationSec } from '../finalcut/render-ffmpeg.js'
import { sayTts, sayAvailable } from '../voice/say-tts.js'
import { pickAccount, recordUsage } from '../quota/scheduler.js'
import { mergePromptLayers } from '../prompts/style-dna.js'
import { STAGES, gatesOf } from './stages.js'

export async function runPipeline({
  script,                     // { title, shots: [{ line, prompt?, durationSec? }] }
  providers = [],             // 供应商实例（mock/sessionid-*/comfyui）
  accounts = [],              // 额度账号（可为空：路由落到 providers[0]）
  opts = {},                  // { width,height,styleDna,shotTemplate,preferCost,subtitles,voice,pollIntervalMs,maxPollMs,concurrency }
  gates = {},                 // { stills:'auto', video:'auto', voice:'auto', 'final-cut':'auto', ... }
  ask = async () => true,     // gate==='ask' 时调用；返回 false 中止该段
  onEvent = () => {},
  workDir,
} = {}) {
  mkdirSync(workDir, { recursive: true })
  const events = []
  const emit = (stage, type, detail = null) => { const e = { stage, type, detail, at: new Date().toISOString() }; events.push(e); onEvent(e) }
  const W = opts.width ?? 1080, H = opts.height ?? 1920
  const gateMode = (s) => gates[s] ?? 'auto'
  const allGates = gatesOf(STAGES)
  const ok = async (stage) => { if (gateMode(stage) !== 'ask') return true; return ask(stage) }

  // ① parse（v1 确定性：按脚本镜头列表；LLM 解析器后续接入）
  const shots = script?.shots ?? []
  if (!shots.length) throw new Error('脚本缺少 shots')
  emit('parse', 'shots', shots.length)

  // ② storyboard：四层提示词合成逐镜提示词
  const boards = shots.map((s, i) => ({
    index: i, line: s.line,
    prompt: mergePromptLayers({ dna: opts.styleDna ?? '', shotTemplate: opts.shotTemplate ?? '', manual: s.prompt ?? '' }),
    durationSec: s.durationSec ?? opts.durationSec ?? 3,
  }))
  emit('storyboard', 'boards', boards.length)

  // ③ 并行分镜引擎：先对全部镜头做供应商路由 + 额度调度 + 批量提交，再并发轮询。
  // 并发数 opts.concurrency（sessionid 免费档建议 1-2，云 API 可更高）。
  const tl = createTimeline({ width: W, height: H })
  const audit = { accounts: [], decisions: [] }
  const pollIntervalMs = opts.pollIntervalMs ?? 5000
  const maxPollMs = opts.maxPollMs ?? 10 * 60 * 1000
  const concurrency = opts.concurrency ?? 2

  const slots = []
  for (const b of boards) {
    if (!(await ok('stills'))) { emit('stills', 'halted', b.index); break }
    const { account, reason } = pickAccount(accounts, { preferCost: opts.preferCost ?? true })
    if (account) {
      const idx = accounts.indexOf(account)
      accounts[idx] = recordUsage(account)
      audit.accounts.push({ shot: b.index, account: account.id, reason })
    }
    const provider = providers.find((p) => p.id === account?.provider) ?? providers[0]
    if (!provider) throw new Error(`镜头 ${b.index}: 无可用供应商（providers 为空且无账号路由）`)
    audit.decisions.push({ shot: b.index, provider: provider.id, account: account?.id ?? null, reason })
    slots.push({ b, provider, still: `${workDir}/shot${b.index}.mp4`, jobId: null, voice: null })
  }

  // 批量提交（并发受控）
  let running = 0
  const queue = [...slots]
  const submitted = []
  await new Promise((resolveAll) => {
    const pump = () => {
      while (running < concurrency && queue.length) {
        const s = queue.shift()
        running++
        ;(async () => {
          try {
            if (s.provider.id === 'mock') {
              await runFfmpeg(['-y', '-f', 'lavfi', '-i', `color=c=0x1d5a9e:s=${W}x${H}:d=1`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-t', '1', s.still])
              emit('stills', 'mock', s.b.index)
            } else {
              const { jobId } = await s.provider.submit('stills', { positive: s.b.prompt.positive, negative: s.b.prompt.negative, width: W, height: H })
              s.jobId = jobId
              emit('stills', 'submitted', { shot: s.b.index, jobId, provider: s.provider.id })
            }
            submitted.push(s)
          } catch (e) {
            emit('stills', 'submit-error', { shot: s.b.index, error: String(e?.message ?? e) })
            throw e
          } finally {
            running--
            pump()
          }
        })()
      }
      if (!running && !queue.length) resolveAll()
    }
    pump()
  })

  // 并发轮询非 mock 任务
  const realJobs = submitted.filter((s) => s.jobId)
  const deadline = Date.now() + maxPollMs
  const pollOne = async (s) => {
    while (Date.now() < deadline) {
      const st = await s.provider.status(s.jobId)
      if (st.state === 'failed') throw new Error(`镜头 ${s.b.index} 生成失败: ${st.error ?? ''}`)
      if (st.state === 'done') {
        const out = await s.provider.fetch(s.jobId)
        const url = out.outputs[0]
        if (!url) throw new Error(`镜头 ${s.b.index} 无输出`)
        if (/^https?:/.test(url)) {
          const res = await fetch(url)
          await writeFile(s.still, Buffer.from(await res.arrayBuffer()))
        } else {
          await runFfmpeg(['-y', '-i', url, '-t', String(s.b.durationSec), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', s.still])
        }
        emit('video', 'done', { shot: s.b.index, src: url })
        return
      }
      await new Promise((r) => setTimeout(r, pollIntervalMs))
    }
    throw new Error(`镜头 ${s.b.index} 生成超时`)
  }
  await Promise.all(realJobs.map((s) => pollOne(s)))

  // ④ voice + 组装时间线（配音与终剪前的本地处理）
  let t = 0
  for (const s of slots) {
    const b = s.b
    if (opts.voice !== false && sayAvailable()) {
      if (await ok('voice')) {
        const vp = `${workDir}/line${b.index}.aiff`
        const vmp = `${workDir}/line${b.index}.mp3`
        await sayTts({ text: b.line, outPath: vp })
        await runFfmpeg(['-y', '-i', vp, '-ac', '1', vmp])
        s.voice = vmp
        emit('voice', 'done', b.index)
      }
    }
    const vDur = s.voice ? await probeDurationSec(s.voice) : b.durationSec
    const clipDur = Math.round((vDur + 1.2) * 1e6)
    addClip(tl, { src: s.still, durationUs: clipDur })
    if (s.voice) addAudio(tl, { src: s.voice, startUs: t + 400_000, durationUs: Math.round(vDur * 1e6), volume: 1 })
    addSubtitle(tl, { text: b.line, startUs: t + 200_000, durationUs: Math.round((vDur + 0.8) * 1e6) })
    t += clipDur
  }

  // ⑤ final-cut
  if (!(await ok('final-cut'))) throw new Error('final-cut 被用户中止')
  const outPath = `${workDir}/final.mp4`
  const rendered = await renderTimeline({ timeline: tl, outPath, subtitles: opts.subtitles ?? true })
  emit('final-cut', 'done', rendered)
  return { outPath, events, timeline: tl, audit, gates: allGates }
}
