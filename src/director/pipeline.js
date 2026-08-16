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
  opts = {},                  // { width,height,styleDna,shotTemplate,preferCost,subtitles,voice }
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

  // ③ 逐镜：供应商路由 + 额度调度 + 静帧/视频 + 配音
  const tl = createTimeline({ width: W, height: H })
  const audit = { accounts: [], decisions: [] }
  let t = 0
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

    const still = `${workDir}/shot${b.index}.mp4`
    if (provider.id === 'mock') {
      // mock：本地占位静帧，保证无 key 链路可完整跑通
      await runFfmpeg(['-y', '-f', 'lavfi', '-i', `color=c=0x1d5a9e:s=${W}x${H}:d=1`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-t', '1', still])
      emit('stills', 'mock', b.index)
    } else {
      const { jobId } = await provider.submit('stills', { positive: b.prompt.positive, negative: b.prompt.negative, width: W, height: H })
      emit('stills', 'submitted', { shot: b.index, jobId, provider: provider.id })
      let done = false
      for (let p = 0; p < 60 && !done; p++) {
        await new Promise((r) => setTimeout(r, 2000))
        const st = await provider.status(jobId)
        if (st.state === 'failed') throw new Error(`镜头 ${b.index} 生成失败: ${st.error ?? ''}`)
        if (st.state === 'done') done = true
      }
      if (!done) throw new Error(`镜头 ${b.index} 生成超时`)
      const out = await provider.fetch(jobId)
      const url = out.outputs[0]
      if (!url) throw new Error(`镜头 ${b.index} 无输出`)
      if (/^https?:/.test(url)) {
        const res = await fetch(url)
        await writeFile(still, Buffer.from(await res.arrayBuffer()))
      } else {
        // 本地路径直接引用
        await runFfmpeg(['-y', '-i', url, '-t', String(b.durationSec), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', still])
      }
      emit('video', 'done', { shot: b.index, src: url })
    }

    // ④ voice
    let voice = null
    if (opts.voice !== false && sayAvailable()) {
      if (await ok('voice')) {
        const vp = `${workDir}/line${b.index}.aiff`
        const vmp = `${workDir}/line${b.index}.mp3`
        await sayTts({ text: b.line, outPath: vp })
        await runFfmpeg(['-y', '-i', vp, '-ac', '1', vmp])
        voice = vmp
        emit('voice', 'done', b.index)
      }
    }
    const vDur = voice ? await probeDurationSec(voice) : b.durationSec
    const clipDur = Math.round((vDur + 1.2) * 1e6)
    addClip(tl, { src: still, durationUs: clipDur })
    if (voice) addAudio(tl, { src: voice, startUs: t + 400_000, durationUs: Math.round(vDur * 1e6), volume: 1 })
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
