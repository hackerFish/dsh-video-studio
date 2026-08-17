// Director pipeline orchestrator: six stages → executable, auditable, per-stage-gated run.
import { existsSync, mkdirSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { createTimeline, addClip, addSubtitle, addAudio, type Timeline } from '../finalcut/timeline.ts'
import { renderTimeline, runFfmpeg, probeDurationSec } from '../finalcut/render-ffmpeg.ts'
import { sayTts, sayAvailable } from '../voice/say-tts.ts'
import { pickAccount, recordUsage, AccountPool, type QuotaAccount } from '../quota/scheduler.ts'
import { mergePromptLayers } from '../prompts/style-dna.ts'
import { STAGES, gatesOf, type GateMode } from './stages.ts'
import { reviewShot, shouldRetry, type Reviewer } from '../quality/review.ts'
import { optimizePrompt } from '../prompts/optimizer.ts'
import type { BoosterScorebook } from '../prompts/boost-scorebook.ts'
import type { Provider, ProviderStatus } from '../provider.ts'

export interface ScriptShot {
  line: string
  prompt?: string
  durationSec?: number
  /** 外部配音文件（mp3/wav 等，ffmpeg 可读）：提供时跳过本地 TTS，直接进成片/口型同步 */
  voiceFile?: string
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
    /** 评分回写闭环：提供评分簿时，提示词按历史得分选增益，评审分数回写 */
    scorebook?: BoosterScorebook | null
    /** 账号池调度：提供时按健康度/额度轮换，失败退避、成功回写 */
    pool?: AccountPool | null
    /** 口型同步供应商（capabilities.lipSync）：对每个有配音的镜头跑对口型，失败自动回退原片 */
    lipSync?: Provider | null
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
  prompt: { positive: string; negative: string; boosters: string[] }
  durationSec: number
  voiceFile?: string
}

interface ShotSlot {
  b: Board
  provider: Provider
  still: string
  jobId: string | null
  voice: string | null
  accountId: string | null
  sourceUrl: string | null
  lipStill: string | null
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

  const boards = shots.map((s, i) => {
    const base = mergePromptLayers({ dna: opts.styleDna ?? '', shotTemplate: opts.shotTemplate ?? '', manual: s.prompt ?? '' })
    const opt = opts.scorebook
      ? optimizePrompt(base.positive || '通用画面', { style: opts.styleDna, scorebook: opts.scorebook })
      : { optimized: base.positive || '通用画面', appliedBoosters: [] as string[], negative: [] as string[] }
    return {
      index: i,
      line: s.line,
      prompt: { positive: opt.optimized, negative: base.negative, boosters: opt.appliedBoosters },
      durationSec: s.durationSec ?? 3,
      voiceFile: s.voiceFile,
    }
  })
  emit('storyboard', 'boards', boards.length)

  const tl = createTimeline({ width: W, height: H })
  const audit: PipelineResult['audit'] = { accounts: [], decisions: [] }
  const pollIntervalMs = opts.pollIntervalMs ?? 5000
  const maxPollMs = opts.maxPollMs ?? 10 * 60 * 1000
  const concurrency = opts.concurrency ?? 2

  const slots: ShotSlot[] = []
  for (const b of boards) {
    if (!(await ok('stills'))) { emit('stills', 'halted', b.index); break }
    const picked = opts.pool ? opts.pool.pick() : pickAccount(accounts, { preferCost: opts.preferCost ?? true })
    const { account, reason } = picked
    if (account) {
      if (opts.pool) opts.pool.charge(account.id)
      else {
        const idx = accounts.indexOf(account)
        if (idx >= 0) accounts[idx] = recordUsage(account)
      }
      audit.accounts.push({ shot: b.index, account: account.id, reason })
    }
    const provider = providers.find((p) => p.id === account?.provider) ?? providers[0]
    if (!provider) throw new Error(`镜头 ${b.index}: 无可用供应商（providers 为空且无账号路由）`)
    audit.decisions.push({ shot: b.index, provider: provider.id, account: account?.id ?? null, reason })
    slots.push({ b, provider, still: `${workDir}/shot${b.index}.mp4`, jobId: null, voice: null, accountId: account?.id ?? null, sourceUrl: null, lipStill: null })
  }

  let running = 0
  const queue = [...slots]
  const submitted: ShotSlot[] = []
  // 提交 + 账号池降级：失败账号进入退避，自动换下一个健康账号重提
  const submitWithFallback = async (s: ShotSlot): Promise<void> => {
    const tried = new Set<string>([s.accountId ?? ''])
    const spec = { positive: s.b.prompt.positive, negative: s.b.prompt.negative, width: W, height: H }
    for (let attempt = 0; attempt <= (opts.pool?.size ?? 1); attempt++) {
      try {
        if (s.provider.id === 'mock') {
          await runFfmpeg(['-y', '-f', 'lavfi', '-i', `color=c=0x1d5a9e:s=${W}x${H}:d=1`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-t', '1', s.still])
          emit('shot-assets', 'mock', s.b.index)
        } else {
          const { jobId } = await s.provider.submit('shot-assets', spec)
          s.jobId = jobId
          emit('shot-assets', 'submitted', { shot: s.b.index, jobId, provider: s.provider.id })
        }
        return
      } catch (e) {
        const msg = String(e instanceof Error ? e.message : e)
        if (opts.pool && s.accountId) opts.pool.recordFailure(s.accountId, msg)
        emit('shot-assets', 'submit-error', { shot: s.b.index, error: msg })
        if (!opts.pool) throw e
        const next = opts.pool.pick()
        const fallback = next.account
        if (fallback && next.reason === 'ok' && !tried.has(fallback.id)) {
          const p = providers.find((x) => x.id === fallback.provider)
          if (p) {
            tried.add(fallback.id)
            s.provider = p
            s.accountId = fallback.id
            opts.pool.charge(fallback.id)
            emit('shot-assets', 'fallback', { shot: s.b.index, account: fallback.id })
            continue
          }
        }
        throw e
      }
    }
    throw new Error(`镜头 ${s.b.index}: 提交失败且账号池无可用备胎`)
  }
  await new Promise<void>((resolveAll) => {
    const pump = (): void => {
      while (running < concurrency && queue.length) {
        const s = queue.shift() as ShotSlot
        running++
        void (async () => {
          try {
            if (s.b.index === 0) emit('master-asset', 'primary', s.b.index)
            await submitWithFallback(s)
            submitted.push(s)
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
    try {
      await pollInner(s)
      if (opts.pool && s.accountId) opts.pool.recordSuccess(s.accountId)
    } catch (e) {
      if (opts.pool && s.accountId) opts.pool.recordFailure(s.accountId, e instanceof Error ? e.message : String(e))
      throw e
    }
  }
  const pollInner = async (s: ShotSlot): Promise<void> => {
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
          s.sourceUrl = url // 口型同步需要原始可公网访问的视频地址
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
          // 评分回写闭环：把本镜得分与所用增益组合写回评分簿
          if (opts.scorebook && review.score !== null) {
            opts.scorebook.recordOutcome(opts.styleDna ?? '', s.b.prompt.boosters, review.score, 'pipeline-review')
          }
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
    if (b.voiceFile && existsSync(b.voiceFile)) {
      s.voice = b.voiceFile
      emit('final-cut', 'voice-file', b.index)
    } else if (opts.voice !== false && sayAvailable()) {
      {
        const vp = `${workDir}/line${b.index}.aiff`
        const vmp = `${workDir}/line${b.index}.mp3`
        await sayTts({ text: b.line, outPath: vp })
        await runFfmpeg(['-y', '-i', vp, '-ac', '1', vmp])
        s.voice = vmp
        emit('final-cut', 'voice', b.index)
      }
    }
    // 口型同步段：有配音 + 有源视频引用（公网 URL 或 jobId）才跑；失败不致命，回退原片
    if (opts.lipSync && s.voice && (s.sourceUrl ?? s.jobId)) {
      try {
        const audioB64 = Buffer.from(await readFile(s.voice)).toString('base64')
        const spec: Record<string, unknown> = { mode: 'audio2video', audioBase64: audioB64 }
        if (s.sourceUrl) spec.videoUrl = s.sourceUrl
        else spec.videoId = s.jobId
        const { jobId: lipJob } = await opts.lipSync.submit('final-cut', spec)
        emit('final-cut', 'lipsync-submitted', { shot: b.index, jobId: lipJob, provider: opts.lipSync.id })
        let lst: ProviderStatus = { state: 'running', progress: null }
        const lipDeadline = Date.now() + maxPollMs
        while (Date.now() < lipDeadline) {
          lst = await opts.lipSync.status(lipJob)
          if (lst.state === 'done' || lst.state === 'failed') break
          await new Promise((r) => setTimeout(r, pollIntervalMs))
        }
        if (lst.state === 'done') {
          const out = await opts.lipSync.fetch(lipJob)
          const url = out.outputs[0]
          if (url) {
            s.lipStill = `${workDir}/shot${b.index}-lip.mp4`
            if (/^https?:/.test(url)) {
              const res = await fetch(url)
              await writeFile(s.lipStill, Buffer.from(await res.arrayBuffer()))
            } else {
              await runFfmpeg(['-y', '-i', url, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', s.lipStill])
            }
            emit('final-cut', 'lipsync', { shot: b.index, src: url })
          }
        } else {
          emit('final-cut', 'lipsync-error', { shot: b.index, state: lst.state, error: lst.error })
        }
      } catch (e) {
        emit('final-cut', 'lipsync-error', { shot: b.index, error: String(e instanceof Error ? e.message : e) })
      }
    }
    const clipSrc = s.lipStill ?? s.still
    const vDur = s.voice ? await probeDurationSec(s.voice) : b.durationSec
    const clipDur = Math.round((vDur + 1.2) * 1e6)
    addClip(tl, { src: clipSrc, durationUs: clipDur })
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
