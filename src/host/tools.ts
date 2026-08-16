// Whale model tools (DSH deep-invocation surface): registered on ctx.tools.
// Registration contract mirrors official dsh-tool-todo (name/description/parameters/output.schema/output.render/execute).
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { mergePromptLayers } from '../prompts/style-dna.ts'
import { optimizePrompt } from '../prompts/optimizer.ts'
import { applyTemplate, listTemplates } from '../prompts/templates.ts'
import type { ProviderStatus } from '../provider.ts'
import { createJimengProvider } from '../providers/jimeng.ts'
import { createMockProvider } from '../providers/mock.ts'
import { probeDurationSec } from '../finalcut/render-ffmpeg.ts'
import { createRun, appendEvent, finishRun } from './runs.ts'

interface WhaleConfig {
  jimengSessionId?: string | null
  wanx?: { cookieStr: string; xsrfToken: string; wanUid: string } | null
  mock?: boolean
}

function loadConfig(): WhaleConfig {
  const dshHome = process.env.DSH_HOME ?? join(process.env.HOME ?? '', '.dsh')
  const file = join(dshHome, 'whale.json')
  if (existsSync(file)) {
    try { return JSON.parse(readFileSync(file, 'utf8')) as WhaleConfig } catch { /* fall back to env */ }
  }
  return {
    jimengSessionId: process.env.DSH_JIMENG_SESSIONID ?? null,
    wanx: process.env.DSH_WANX_COOKIE
      ? { cookieStr: process.env.DSH_WANX_COOKIE, xsrfToken: process.env.DSH_WANX_XSRF ?? '', wanUid: process.env.DSH_WANX_UID ?? '' }
      : null,
    mock: process.env.WHALE_MOCK === '1',
  }
}

function splitShots(outline: string, shots: number): { index: number; line: string; durationSec: number }[] {
  const parts = outline.split(/(?<=[。！？!?])\s*|\n+/).map((s) => s.trim()).filter(Boolean)
  const list = parts.length ? parts : [outline]
  const n = Math.max(1, Math.min(Number(shots) || 5, 12))
  const out: { index: number; line: string; durationSec: number }[] = []
  for (let i = 0; i < n; i++) out.push({ index: i, line: list[i % list.length] ?? '', durationSec: 3 })
  return out
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function registerTools(ctx: any): void {
  ctx.tools.register({
    name: 'whale_storyboard',
    description: 'Split a story outline into a shot list with per-shot prompts (pure local, no quota).',
    parameters: {
      outline: { type: 'string', required: true, description: 'Story outline/script (shots separated by 。 or newlines)' },
      style: { type: 'string', required: false, description: 'Style DNA, e.g. "cinematic, deep-sea blue"' },
      shots: { type: 'integer', required: false, description: 'Target shot count 3-12, default 5' },
    },
    output: {
      schema: {
        type: 'object', additionalProperties: false,
        properties: {
          shots: { type: 'array', required: true, items: { type: 'object', additionalProperties: false,
            properties: {
              index: { type: 'integer', required: true },
              line: { type: 'string', required: true },
              prompt: { type: 'string', required: true },
              durationSec: { type: 'integer', required: true },
            } } },
        },
      },
      render: (_args: unknown, value: { shots: unknown[] }) => [{ type: 'text', text: `Storyboard done: ${value.shots.length} shots.` }],
    },
    execute(args: { outline: string; style?: string; shots?: number }) {
      const shots = splitShots(String(args.outline ?? ''), args.shots ?? 5)
      return Promise.resolve({
        shots: shots.map((s) => {
          const base = mergePromptLayers({ dna: args.style ?? '', manual: '' }).positive
          const opt = base ? optimizePrompt(base, { style: args.style }) : optimizePrompt('通用画面', { style: args.style })
          return { ...s, prompt: opt.optimized }
        }),
      })
    },
  })

  ctx.tools.register({
    name: 'whale_generate_video',
    description: 'Submit a video generation task (jimeng free tier / mock; more providers on the way). Peak hours may return SystemBusy (0 credits consumed) — retry off-peak.',
    parameters: {
      prompt: { type: 'string', required: true, description: 'Video prompt' },
      aspect_ratio: { type: 'string', required: false, enum: ['16:9', '9:16', '1:1'], description: 'Default 9:16' },
      duration_sec: { type: 'integer', required: false, description: '3-5 seconds (free tier max 5), default 5' },
      provider: { type: 'string', required: false, enum: ['auto', 'mock', 'jimeng'], description: 'Default auto (jimeng when a sessionid is configured)' },
    },
    output: {
      schema: {
        type: 'object', additionalProperties: false,
        properties: {
          ok: { type: 'boolean', required: true },
          status: { type: 'string', required: true },
          jobId: { type: 'string', required: false },
          message: { type: 'string', required: true },
        },
      },
      render: (_args: unknown, value: { ok: boolean; status: string; jobId?: string; message: string }) =>
        [{ type: 'text', text: value.ok ? `Task ${value.jobId ?? ''} ${value.status}: ${value.message}` : `Generation failed: ${value.message}` }],
    },
    timeoutMs: 130000,
    async execute(args: { prompt: string; aspect_ratio?: string; duration_sec?: number; provider?: string }) {
      const cfg = loadConfig()
      const aspect = args.aspect_ratio ?? '9:16'
      const dims: Record<string, [number, number]> = { '16:9': [1280, 720], '9:16': [720, 1280], '1:1': [1024, 1024] }
      const [w, h] = dims[aspect] ?? [720, 1280]
      const durationSec = Math.min(Math.max(Number(args.duration_sec) || 5, 3), 5)
      const run = createRun({ prompt: args.prompt, provider: args.provider ?? 'auto' })
      appendEvent(run.id, 'story', 'prompt', args.prompt)
      appendEvent(run.id, 'script', 'prompt', args.prompt)
      appendEvent(run.id, 'storyboard', 'single-shot', { aspect, durationSec })
      if (args.provider === 'mock' || (args.provider === 'auto' && cfg.mock && !cfg.jimengSessionId)) {
        const p = createMockProvider()
        const { jobId } = await p.submit('video', { positive: args.prompt })
        appendEvent(run.id, 'master-asset', 'primary', 0)
        appendEvent(run.id, 'shot-assets', 'submitted', { jobId, provider: 'mock' })
        finishRun(run.id, 'done')
        return { ok: true, status: 'submitted', jobId, message: 'mock provider accepted (placeholder output; configure a real provider for actual generation)' }
      }
      if (!cfg.jimengSessionId) {
        finishRun(run.id, 'failed')
        return { ok: false, status: 'no-provider', message: 'No jimeng sessionid configured: write {"jimengSessionId":"..."} to $DSH_HOME/whale.json. Peak hours may SystemBusy — retry off-peak.' }
      }
      const p = createJimengProvider({ sessionId: cfg.jimengSessionId })
      try {
        const { jobId } = await p.submit('video', { positive: args.prompt, width: w, height: h, durationSec })
        appendEvent(run.id, 'master-asset', 'primary', 0)
        appendEvent(run.id, 'shot-assets', 'submitted', { jobId, provider: 'jimeng' })
        let st: ProviderStatus = { state: 'running', progress: null }
        for (let i = 0; i < 8; i++) {
          await new Promise((r) => setTimeout(r, 10000))
          st = await p.status(jobId)
          appendEvent(run.id, 'video', 'polling', { attempt: i + 1, state: st.state })
          if (st.state === 'done' || st.state === 'failed') break
        }
        if (st.state === 'done') {
          const out = await p.fetch(jobId)
          appendEvent(run.id, 'final-cut', 'done', { url: out.outputs[0] })
          finishRun(run.id, 'done')
          return { ok: true, status: 'done', jobId, message: `Video ready: ${out.outputs[0]}` }
        }
        if (st.state === 'failed') {
          finishRun(run.id, 'failed')
          return { ok: false, status: 'failed', jobId, message: `Server failed: ${st.error ?? 'unknown'} (free tier SystemBusy at peak consumes 0 credits — retry off-peak)` }
        }
        return { ok: true, status: 'processing', jobId, message: 'Still generating (free tier is slow) — call this tool again to check' }
      } catch (e) {
        finishRun(run.id, 'failed')
        return { ok: false, status: 'failed', message: String(e instanceof Error ? e.message : e).slice(0, 300) }
      }
    },
  })

  ctx.tools.register({
    name: 'whale_optimize_prompt',
    description: '把草稿提示词优化成专业级（追加 8K/无阴影/中性表情/严禁文字等质量增益，可指定风格与画幅）；也提供专业模板（角色三视图/场景主图/单镜画面）。纯本地，不消耗额度。',
    parameters: {
      prompt: { type: 'string', required: true, description: '草稿提示词' },
      style: { type: 'string', required: false, description: '风格，如"3D 国漫仙侠"' },
      aspect_ratio: { type: 'string', required: false, enum: ['9:16', '16:9', '1:1'], description: '画幅' },
      template: { type: 'string', required: false, enum: ['character-sheet', 'scene-master', 'shot-scene'], description: '可选：套用专业模板（角色三视图等）' },
    },
    output: {
      schema: {
        type: 'object', additionalProperties: false,
        properties: {
          optimized: { type: 'string', required: true },
          appliedBoosters: { type: 'array', required: true, items: { type: 'string' } },
          templates: { type: 'array', required: true, items: { type: 'object', additionalProperties: false,
            properties: { id: { type: 'string', required: true }, name: { type: 'string', required: true } } } },
        },
      },
      render: (_args: unknown, value: { optimized: string; appliedBoosters: string[] }) =>
        [{ type: 'text', text: `已优化（增益 ${value.appliedBoosters.length} 项）：${value.optimized.slice(0, 200)}` }],
    },
    execute(args: { prompt: string; style?: string; aspect_ratio?: string; template?: string }) {
      let draft = String(args.prompt ?? '')
      if (args.template) draft = applyTemplate(args.template, { description: draft, style: args.style, aspectRatio: args.aspect_ratio })
      const r = optimizePrompt(draft, { style: args.style, aspectRatio: args.aspect_ratio })
      return Promise.resolve({ optimized: r.optimized, appliedBoosters: r.appliedBoosters, templates: listTemplates() })
    },
  })

  ctx.tools.register({
    name: 'whale_quality_review',
    description: 'Rule-level QC for a finished video: existence, duration. LLM frame review is not wired up yet.',
    parameters: {
      video_path: { type: 'string', required: true, description: 'Local path of the finished video' },
    },
    output: {
      schema: {
        type: 'object', additionalProperties: false,
        properties: {
          ok: { type: 'boolean', required: true },
          checks: { type: 'array', required: true, items: { type: 'object', additionalProperties: false,
            properties: {
              item: { type: 'string', required: true },
              status: { type: 'string', required: true },
              detail: { type: 'string', required: true },
            } } },
          note: { type: 'string', required: true },
        },
      },
      render: (_args: unknown, value: { ok: boolean; checks: { item: string; status: string }[] }) =>
        [{ type: 'text', text: value.ok ? 'QC passed (rule level)' : `QC failed: ${value.checks.filter((c) => c.status !== 'pass').map((c) => c.item).join(', ')}` }],
    },
    async execute(args: { video_path: string }) {
      const p = String(args.video_path ?? '')
      if (!p) return { ok: false, checks: [{ item: '文件存在', status: 'fail', detail: '未提供路径' }], note: 'LLM 抽帧评审待接入' }
      if (!existsSync(p)) return { ok: false, checks: [{ item: '文件存在', status: 'fail', detail: p }], note: 'LLM 抽帧评审待接入' }
      const checks: { item: string; status: string; detail: string }[] = [{ item: '文件存在', status: 'pass', detail: p }]
      try {
        const dur = await probeDurationSec(p)
        checks.push({ item: '时长', status: dur >= 0.5 ? 'pass' : 'fail', detail: `${dur.toFixed(1)}s` })
      } catch (e) {
        checks.push({ item: '时长', status: 'fail', detail: String(e instanceof Error ? e.message : e).slice(0, 80) })
      }
      return { ok: checks.every((c) => c.status === 'pass'), checks, note: 'LLM 抽帧评审待接入（计划 P2 导演喊卡）' }
    },
  })
}
