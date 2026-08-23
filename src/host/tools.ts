// Whale model tools (DSH deep-invocation surface): registered on ctx.tools.
// Registration contract mirrors official dsh-tool-todo (name/description/parameters/output.schema/output.render/execute).
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { mergePromptLayers } from '../prompts/style-dna.ts'
import { optimizePrompt } from '../prompts/optimizer.ts'
import { applyTemplate, listTemplates } from '../prompts/templates.ts'
import { buildWorkflow, validateWorkflow } from '../director/workflow-builder.ts'
import { listStoryPresets, getStoryPreset, presetToScript } from '../content/presets.ts'
import { buildAudit } from '../selfaudit/audit.ts'
import { runtimePool, persistPool } from './runtime.ts'
import { providerForAccount } from './account-providers.ts'
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
    name: 'whale_studio',
    description: '在聊天区打开鲸影节点式工坊（React Flow 画布：流水线七段节点、可添加/导入 ComfyUI workflow、每节点单独运行）。执行后画布直接渲染在本次消息下方。',
    parameters: {},
    output: {
      schema: {
        type: 'object', additionalProperties: false,
        properties: {
          ok: { type: 'boolean', required: true },
          note: { type: 'string', required: true },
        },
      },
      render: (_args: unknown, value: { ok: boolean; note: string }) => [{ type: 'text', text: value.ok ? value.note : '打开失败' }],
    },
    execute() {
      return Promise.resolve({ ok: true, note: '鲸影工坊已打开——节点画布在下方，可直接拖拽/连线/运行。' })
    },
  })

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
    description: 'Submit a video generation task through the account pool (鲸影账号 tab 里登记的凭证自动按额度轮换/失败退避；也支持 env 兜底)。jimeng 免费档高峰 SystemBusy（0 扣费）——换时段重试。',
    parameters: {
      prompt: { type: 'string', required: true, description: 'Video prompt' },
      aspect_ratio: { type: 'string', required: false, enum: ['16:9', '9:16', '1:1'], description: 'Default 9:16' },
      duration_sec: { type: 'integer', required: false, description: '3-5 seconds (free tier max 5), default 5' },
      provider: { type: 'string', required: false, enum: ['auto', 'mock', 'jimeng', 'kling', 'kling-dashscope', 'dashscope-wan', 'kling-lipsync', 'doubao', 'doubao-web', 'comfyui', 'tongyi-wanx'], description: 'Default auto = 账号池里任一健康账号（质量档优先，已实测万相/可灵等真实通道）；指定供应商则只挑该家' },
    },
    output: {
      schema: {
        type: 'object', additionalProperties: false,
        properties: {
          ok: { type: 'boolean', required: true },
          status: { type: 'string', required: true },
          jobId: { type: 'string', required: false },
          account: { type: 'string', required: false },
          message: { type: 'string', required: true },
        },
      },
      render: (_args: unknown, value: { ok: boolean; status: string; jobId?: string; account?: string; message: string }) =>
        [{ type: 'text', text: value.ok ? `Task ${value.jobId ?? ''} ${value.status}${value.account ? ` (账号 ${value.account})` : ''}: ${value.message}` : `Generation failed: ${value.message}` }],
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

      const wantMock = args.provider === 'mock' || (args.provider === 'auto' && cfg.mock && !cfg.jimengSessionId)
      if (wantMock) {
        const p = createMockProvider()
        const { jobId } = await p.submit('video', { positive: args.prompt })
        appendEvent(run.id, 'master-asset', 'primary', 0)
        appendEvent(run.id, 'shot-assets', 'submitted', { jobId, provider: 'mock' })
        finishRun(run.id, 'done')
        return { ok: true, status: 'submitted', jobId, message: 'mock provider accepted (placeholder output; configure a real provider for actual generation)' }
      }

      // 1) 账号池路径：鲸影账号 tab 登记的凭证（auto = 池里任一健康真实账号，质量优先）
      try {
        const pool = runtimePool()
        const picked = args.provider === 'auto' ? pool.pick() : pool.pick(String(args.provider))
        if (picked.account && picked.reason === 'ok') {
          const accountId = picked.account.id
          const p = providerForAccount(picked.account)
          try {
            const { jobId } = await p.submit('video', { positive: args.prompt, width: w, height: h, durationSec })
            pool.charge(accountId)
            appendEvent(run.id, 'master-asset', 'primary', 0)
            appendEvent(run.id, 'shot-assets', 'submitted', { jobId, provider: p.id, account: accountId })
            let st: ProviderStatus = { state: 'running', progress: null }
            for (let i = 0; i < 8; i++) {
              await new Promise((r) => setTimeout(r, 10000))
              st = await p.status(jobId)
              appendEvent(run.id, 'video', 'polling', { attempt: i + 1, state: st.state })
              if (st.state === 'done' || st.state === 'failed') break
            }
            if (st.state === 'done') {
              const out = await p.fetch(jobId)
              pool.recordSuccess(accountId)
              appendEvent(run.id, 'final-cut', 'done', { url: out.outputs[0] })
              finishRun(run.id, 'done')
              persistPool()
              return { ok: true, status: 'done', jobId, account: accountId, message: `Video ready: ${out.outputs[0]}` }
            }
            if (st.state === 'failed') {
              pool.recordFailure(accountId, st.error)
              finishRun(run.id, 'failed')
              persistPool()
              return { ok: false, status: 'failed', jobId, account: accountId, message: `Server failed: ${st.error ?? 'unknown'}（该账号已进入冷却，池会自动换下一个）` }
            }
            pool.recordSuccess(accountId)
            persistPool()
            return { ok: true, status: 'processing', jobId, account: accountId, message: 'Still generating — call this tool again to check' }
          } catch (e) {
            pool.recordFailure(accountId, e instanceof Error ? e.message : String(e))
            persistPool()
            throw e
          }
        }
        if (picked.reason !== 'none') {
          finishRun(run.id, 'failed')
          const what = args.provider === 'auto' ? '' : ` ${args.provider}`
          return { ok: false, status: 'no-account', message: `账号池里没有可用的${what}账号（${picked.reason}）——到设置页「鲸影账号」添加，或等冷却结束` }
        }
      } catch (e) {
        finishRun(run.id, 'failed')
        return { ok: false, status: 'failed', message: String(e instanceof Error ? e.message : e).slice(0, 300) }
      }

      // 2) env 兜底：无账号池时的旧路径（DSH_JIMENG_SESSIONID / $DSH_HOME/whale.json）
      if (!cfg.jimengSessionId) {
        finishRun(run.id, 'failed')
        return { ok: false, status: 'no-provider', message: '没有可用供应商：到设置页「鲸影账号」添加凭证，或写 {"jimengSessionId":"..."} 到 $DSH_HOME/whale.json' }
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
    name: 'whale_comfyui_workflow',
    description: '把提示词/规格生成 ComfyUI workflow JSON（本地引擎的输入，纯离线）。默认模板是结构占位（需按你的节点包填 checkpoint 与采样节点名），校验器会指出未替换的占位。',
    parameters: {
      prompt: { type: 'string', required: true, description: '画面提示词' },
      width: { type: 'integer', required: false, description: '默认 1080' },
      height: { type: 'integer', required: false, description: '默认 1920' },
      frames: { type: 'integer', required: false, description: '帧数，默认 121' },
      fps: { type: 'integer', required: false, description: '默认 24' },
      checkpoint: { type: 'string', required: false, description: 'checkpoint 名（不填则占位待替换）' },
    },
    output: {
      schema: {
        type: 'object', additionalProperties: false,
        properties: {
          workflow: { type: 'object', required: true, additionalProperties: true },
          issues: { type: 'array', required: true, items: { type: 'string' } },
          note: { type: 'string', required: true },
        },
      },
      render: (_args: unknown, value: { workflow: Record<string, unknown>; issues: string[] }) =>
        [{ type: 'text', text: `Workflow 已生成：${Object.keys(value.workflow).length} 个节点，${value.issues.length} 个待替换占位。` }],
    },
    execute(args: { prompt: string; width?: number; height?: number; frames?: number; fps?: number; checkpoint?: string }) {
      const wf = buildWorkflow({
        positive: args.prompt, width: args.width ?? 1080, height: args.height ?? 1920,
        frames: args.frames ?? 121, fps: args.fps ?? 24, checkpoint: args.checkpoint,
      })
      const issues = validateWorkflow(wf)
      return Promise.resolve({ workflow: wf, issues, note: '默认模板为结构占位：按你安装的节点包替换 checkpoint 与视频采样节点；模板可放入 templates/comfyui/ 复用。' })
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
          negative: { type: 'array', required: true, items: { type: 'string' } },
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
      return Promise.resolve({ optimized: r.optimized, appliedBoosters: r.appliedBoosters, negative: r.negative, templates: listTemplates() })
    },
  })

  ctx.tools.register({
    name: 'whale_story_presets',
    description: '预置漫剧内容包：5 套题材（都市逆袭/仙侠/悬疑/甜宠/科幻）的完整故事卡（角色+场景+分镜）。不传 preset_id 列清单，传 preset_id 产出可直接喂给流水线的分镜脚本。纯本地。',
    parameters: {
      preset_id: { type: 'string', required: false, description: '题材 id（不传则返回清单）' },
    },
    output: {
      schema: {
        type: 'object', additionalProperties: false,
        properties: {
          presets: { type: 'array', required: true, items: { type: 'object', additionalProperties: false,
            properties: {
              id: { type: 'string', required: true },
              title: { type: 'string', required: true },
              titleEn: { type: 'string', required: true },
              genre: { type: 'string', required: true },
              hook: { type: 'string', required: true },
              shotCount: { type: 'integer', required: true },
              characterCount: { type: 'integer', required: true },
            } } },
          script: { type: 'object', required: false, additionalProperties: false,
            properties: {
              title: { type: 'string', required: true },
              shots: { type: 'array', required: true, items: { type: 'object', additionalProperties: false,
                properties: {
                  line: { type: 'string', required: true },
                  prompt: { type: 'string', required: true },
                  durationSec: { type: 'integer', required: false },
                } } },
            } },
        },
      },
      render: (_args: unknown, value: { presets: unknown[]; script?: { title: string; shots: unknown[] } | null }) =>
        [{ type: 'text', text: value.script ? `《${value.script.title}》分镜 ${value.script.shots.length} 条已生成，可直接喂 whale_storyboard / 流水线。` : `内容包共 ${value.presets.length} 套题材，传 preset_id 生成分镜脚本。` }],
    },
    execute(args: { preset_id?: string }) {
      if (!args.preset_id) return Promise.resolve({ presets: listStoryPresets(), script: null })
      const preset = getStoryPreset(String(args.preset_id))
      if (!preset) throw new Error(`未知题材: ${args.preset_id}（可选 ${listStoryPresets().map((p) => p.id).join('/')}）`)
      return Promise.resolve({ presets: listStoryPresets(), script: presetToScript(preset) })
    },
  })

  ctx.tools.register({
    name: 'whale_self_audit',
    description: '鲸影自我分析：扫描本插件源码/测试/供应商矩阵/能力清单/差距清单，返回审计报告数据。纯本地只读，用于会话内差距分析与日报。',
    parameters: {},
    output: {
      schema: {
        type: 'object', additionalProperties: false,
        properties: {
          generatedAt: { type: 'string', required: true },
          packageVersion: { type: 'string', required: true },
          tests: { type: 'object', required: true, additionalProperties: false,
            properties: { files: { type: 'integer', required: true }, cases: { type: 'integer', required: true } } },
          matrix: { type: 'object', required: true, additionalProperties: false,
            properties: {
              total: { type: 'integer', required: true },
              liveVerified: { type: 'integer', required: true },
              adapter: { type: 'integer', required: true },
              waitingKey: { type: 'integer', required: true },
            } },
          providers: { type: 'array', required: true, items: { type: 'object', additionalProperties: false,
            properties: {
              id: { type: 'string', required: true },
              status: { type: 'string', required: true },
              note: { type: 'string', required: true },
            } } },
          tools: { type: 'array', required: true, items: { type: 'string' } },
          gaps: { type: 'array', required: true, items: { type: 'object', additionalProperties: false,
            properties: {
              id: { type: 'string', required: true },
              item: { type: 'string', required: true },
              status: { type: 'string', required: true },
              note: { type: 'string', required: true },
            } } },
          summary: { type: 'string', required: true },
        },
      },
      render: (_args: unknown, value: { summary: string }) => [{ type: 'text', text: value.summary }],
    },
    execute() {
      const a = buildAudit()
      const waiting = a.gaps.filter((g) => g.status === 'waiting-key').map((g) => g.item).join('、') || '无'
      return Promise.resolve({
        generatedAt: a.generatedAt,
        packageVersion: a.package.version,
        tests: a.tests,
        matrix: a.matrix,
        providers: a.providers.map((p) => ({ id: p.id, status: p.status, note: p.note })),
        tools: a.tools,
        gaps: a.gaps,
        summary: `鲸影自审 @${a.package.version}：${a.tests.files} 测试文件/${a.tests.cases} 用例；供应商 ${a.matrix.total} 个（实测 ${a.matrix.liveVerified}）；差距 ${a.gaps.length} 条，等 key：${waiting}。`,
      })
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
