// Director pipeline orchestrator: six stages → executable, auditable, per-stage-gated run.
import { mkdirSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { createTimeline, addClip, addSubtitle, addAudio, type Timeline } from '../finalcut/timeline.ts'
import { renderTimeline, runFfmpeg, probeDurationSec } from '../finalcut/render-ffmpeg.ts'
import { sayTts, sayAvailable } from '../voice/say-tts.ts'
import { pickAccount, recordUsage, type QuotaAccount } from '../quota/scheduler.ts'
import { mergePromptLayers } from '../prompts/style-dna.ts'
import { STAGES, gatesOf, type GateMode } from './stages.ts'
import { reviewShot, shouldRetry, type Reviewer } from '../quality/review.ts'
import type { Provider } from '../provider.ts'

export interface ScriptShot {
  line: string
  prompt?: string
  durationSec?: number
}

export interface Script {
  title: string
  shots: ScriptShot[]
}

export interface PipelineEvent {
  stage: string
  type: string
  detail: unknown
  at: string
}

export interface PipelineOptions {
  script: Script
  providers?: Provider[]
  accounts?: QuotaAccount[]
  opts?: {
    width?: number
    height?: number
    styleDna?: string
    shotTemplate?: string
    preferCost?: boolean
    subtitles?: boolean
    voice?: boolean
    pollIntervalMs?: number
    maxPollMs?: number
    concurrency?: number
    /** 注入 LLM 评审（导演喊卡）；≤2 分自动带负面词重拍 */
    reviewer?: Reviewer | null
    /** 每个镜头最多重拍次数（默认 2） */
    maxRetries?: number
  }
  gates?: Partial<Record<string, GateMode>>
  ask?: (stage: string) => Promise<boolean> | boolean
  onEvent?: (e: PipelineEvent) => void
  workDir: string
}

export interface PipelineResult {
  outPath: string
  events: PipelineEvent[]
  timeline: Timeline
  audit: { accounts: { shot: number; account: string; reason: string }[]; decisions: { shot: number; provider: string; account: string | null; reason: string }[] }
  gates: Record<string, GateMode>
}

interface Board {
  index: number
  line: string
  prompt: { positive: string; negative: string }
  durationSec: number
}

interface ShotSlot {
  b: Board
  provider: Provider
  still: string
  jobId: string | null
  voice: string | null
}

export async function runPipeline({
  script, providers = [], accounts = [], opts = {}, gates = {},
  ask = async () => true, onEvent = () => {}, workDir,
}: PipelineOptions): Promise<PipelineResult> {
  mkdirSync(workDir, { recursive: true })
  const events: PipelineEvent[] = []
  const emit = (stage: string, type: string, detail: unknown = null): void => {
    const e: PipelineEvent = { stage, type, detail, at: new Date().toISOString() }
    events.push(e)
    onEvent(e)
  }
  const W = opts.width ?? 1080, H = opts.height ?? 1920
  const gateMode = (s: string): GateMode => gates[s] ?? 'auto'
  const ok = async (stage: string): Promise<boolean> => (gateMode(stage) !== 'ask' ? true : await ask(stage))

  const shots = script?.shots ?? []
  if (!shots.length) throw new Error('脚本缺少 shots')
  emit('story', 'script', shots.length)
  emit('script', 'shots', shots.length)

  const boards = shots.map((s, i) => ({
    index: i,
    line: s.line,
    prompt: mergePromptLayers({ dna: opts.styleDna ?? '', shotTemplate: opts.shotTemplate ?? '', manual: s.prompt ?? '' }),
    durationSec: s.durationSec ?? 3,
  }))
  emit('storyboard', 'boards', boards.length)

  const tl = createTimeline({ width: W, height: H })
  const audit: PipelineResult['audit'] = { accounts: [], decisions: [] }
  const pollIntervalMs = opts.pollIntervalMs ?? 5000
  const maxPollMs = opts.maxPollMs ?? 10 * 60 * 1000
  const concurrency = opts.concurrency ?? 2

  const slots: ShotSlot[] = []
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

  let running = 0
  const queue = [...slots]
  const submitted: ShotSlot[] = []
  await new Promise<void>((resolveAll) => {
    const pump = (): void => {
      while (running < concurrency && queue.length) {
        const s = queue.shift() as ShotSlot
        running++
        void (async () => {
          try {
            if (s.b.index === 0) emit('master-asset', 'primary', s.b.index)
            if (s.provider.id === 'mock') {
              await runFfmpeg(['-y', '-f', 'lavfi', '-i', `color=c=0x1d5a9e:s=${W}x${H}:d=1`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-t', '1', s.still])
              emit('shot-assets', 'mock', s.b.index)
            } else {
              const { jobId } = await s.provider.submit('shot-assets', { positive: s.b.prompt.positive, negative: s.b.prompt.negative, width: W, height: H })
              s.jobId = jobId
              emit('shot-assets', 'submitted', { shot: s.b.index, jobId, provider: s.provider.id })
            }
            submitted.push(s)
          } catch (e) {
            emit('shot-assets', 'submit-error', { shot: s.b.index, error: String(e instanceof Error ? e.message : e) })
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

  const realJobs = submitted.filter((s) => s.jobId)
  const deadline = Date.now() + maxPollMs
  const maxRetries = opts.maxRetries ?? 2
  const pollOne = async (s: ShotSlot): Promise<void> => {
    let retries = 0
    let negative = s.b.prompt.negative
    while (Date.now() < deadline) {
      const st = await s.provider.status(s.jobId as string)
      if (st.state === 'failed') throw new Error(`镜头 ${s.b.index} 生成失败: ${st.error ?? ''}`)
      if (st.state === 'done') {
        const out = await s.provider.fetch(s.jobId as string)
        const url = out.outputs[0]
        if (!url) throw new Error(`镜头 ${s.b.index} 无输出`)
        if (/^https?:/.test(url)) {
          const res = await fetch(url)
          await writeFile(s.still, Buffer.from(await res.arrayBuffer()))
        } else {
          await runFfmpeg(['-y', '-i', url, '-t', String(s.b.durationSec), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', s.still])
        }
        emit('video', 'done', { shot: s.b.index, src: url })
        // 导演喊卡：注入评审时，≤2 分且未用尽重试 → 带负面词重拍
        if (opts.reviewer) {
          const review = await reviewShot({ videoPath: s.still, shotPrompt: s.b.prompt.positive, reviewer: opts.reviewer, workDir: `${workDir}/review${s.b.index}-${retries}` })
          emit('review', review.score === null ? 'rules' : review.retry ? 'retry' : review.promote ? 'promote' : 'accept', { shot: s.b.index, score: review.score, issues: review.issues })
          if (shouldRetry(review.score, retries, maxRetries)) {
            retries++
            negative = [negative, ...review.issues.map((i) => `（避免：${i}）`)].filter(Boolean).join(' ')
            const { jobId } = await s.provider.submit('stills', { positive: s.b.prompt.positive, negative, width: W, height: H })
            s.jobId = jobId
            emit('shot-assets', 'resubmitted', { shot: s.b.index, jobId, retries })
            continue
          }
        }
        return
      }
      await new Promise((r) => setTimeout(r, pollIntervalMs))
    }
    throw new Error(`镜头 ${s.b.index} 生成超时`)
  }
  await Promise.all(realJobs.map((s) => pollOne(s)))

  let t = 0
  for (const s of slots) {
    const b = s.b
    if (opts.voice !== false && sayAvailable()) {
      {
        const vp = `${workDir}/line${b.index}.aiff`
        const vmp = `${workDir}/line${b.index}.mp3`
        await sayTts({ text: b.line, outPath: vp })
        await runFfmpeg(['-y', '-i', vp, '-ac', '1', vmp])
        s.voice = vmp
        emit('final-cut', 'voice', b.index)
      }
    }
    const vDur = s.voice ? await probeDurationSec(s.voice) : b.durationSec
    const clipDur = Math.round((vDur + 1.2) * 1e6)
    addClip(tl, { src: s.still, durationUs: clipDur })
    if (s.voice) addAudio(tl, { src: s.voice, startUs: t + 400_000, durationUs: Math.round(vDur * 1e6), volume: 1 })
    addSubtitle(tl, { text: b.line, startUs: t + 200_000, durationUs: Math.round((vDur + 0.8) * 1e6) })
    t += clipDur
  }

  if (!(await ok('final-cut'))) throw new Error('final-cut 被用户中止')
  const outPath = `${workDir}/final.mp4`
  const rendered = await renderTimeline({ timeline: tl, outPath, subtitles: opts.subtitles ?? true })
  emit('final-cut', 'done', rendered)
  return { outPath, events, timeline: tl, audit, gates: gatesOf(STAGES) }
}
