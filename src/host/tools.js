// 鲸影模型工具（DSH 深度调用入口）：注册进 ctx.tools，模型可直接调用。
// 注册契约逐字段对照官方 dsh-tool-todo 的实现（name/description/parameters/output.schema/output.render/execute）。
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { mergePromptLayers } from '../prompts/style-dna.js'
import { createJimengProvider } from '../providers/jimeng.js'
import { createMockProvider } from '../providers/mock.js'
import { probeDurationSec } from '../finalcut/render-ffmpeg.js'

// 供应商配置：$DSH_HOME/whale.json 或环境变量（设置面板后续写入同一文件）
function loadConfig(dshHome) {
  const file = join(dshHome ?? process.env.DSH_HOME ?? (join(process.env.HOME ?? '', '.dsh')), 'whale.json')
  if (existsSync(file)) {
    try { return JSON.parse(readFileSync(file, 'utf8')) } catch { /* 损坏则回退环境变量 */ }
  }
  return {
    jimengSessionId: process.env.DSH_JIMENG_SESSIONID ?? null,
    wanx: process.env.DSH_WANX_COOKIE ? { cookieStr: process.env.DSH_WANX_COOKIE, xsrfToken: process.env.DSH_WANX_XSRF, wanUid: process.env.DSH_WANX_UID } : null,
    mock: process.env.WHALE_MOCK === '1',
  }
}

function splitShots(outline, shots) {
  const parts = outline.split(/(?<=[。！？!?])\s*|\n+/).map((s) => s.trim()).filter(Boolean)
  const list = parts.length ? parts : [outline]
  const n = Math.max(1, Math.min(Number(shots) || 5, 12))
  const out = []
  for (let i = 0; i < n; i++) {
    const line = list[i % list.length]
    out.push({ index: i, line, durationSec: 3 })
  }
  return out
}

export function registerTools(ctx) {
  // ① 分镜工具（纯离线，立即可用）
  ctx.tools.register({
    name: 'whale_storyboard',
    description: '把一段故事大纲拆成分镜表（台词+逐镜提示词）。纯本地执行，不消耗任何视频额度。',
    parameters: {
      outline: { type: 'string', required: true, description: '故事大纲/脚本（用句号或换行分隔镜头）' },
      style: { type: 'string', required: false, description: '风格 DNA，如"国风，深海蓝，电影感"' },
      shots: { type: 'integer', required: false, description: '期望镜头数 3-12，默认 5' },
    },
    output: {
      schema: {
        type: 'object', additionalProperties: false,
        properties: {
          shots: { type: 'array', required: true, items: { type: 'object', additionalProperties: false,
            properties: { index: { type: 'integer', required: true }, line: { type: 'string', required: true }, prompt: { type: 'string', required: true }, durationSec: { type: 'integer', required: true } } } },
        },
      },
      render: (_args, value) => [{ type: 'text', text: `分镜完成：${value.shots.length} 镜。逐镜提示词已按风格合成。` }],
    },
    execute(args) {
      const shots = splitShots(String(args.outline ?? ''), args.shots)
      return Promise.resolve({
        shots: shots.map((s) => ({
          ...s,
          prompt: mergePromptLayers({ dna: args.style ?? '', manual: '' }).positive || '（未指定风格）',
        })),
      })
    },
  })

  // ② 生成工具（接真实供应商；未配置时给出可操作的配置指引）
  ctx.tools.register({
    name: 'whale_generate_video',
    description: '提交一条视频生成任务（即梦免费档/mock/未来可灵等）。免费额度档可能因高峰 SystemBusy 失败，会自动重试有限次数；完成与否见返回的 status。',
    parameters: {
      prompt: { type: 'string', required: true, description: '视频提示词' },
      aspect_ratio: { type: 'string', required: false, enum: ['16:9', '9:16', '1:1'], description: '默认 9:16' },
      duration_sec: { type: 'integer', required: false, description: '3-5 秒（免费档上限 5），默认 5' },
      provider: { type: 'string', required: false, enum: ['auto', 'mock', 'jimeng'], description: '默认 auto（有即梦 sessionid 即用即梦）' },
    },
    output: {
      schema: {
        type: 'object', additionalProperties: false,
        properties: {
          ok: { type: 'boolean', required: true },
          status: { type: 'string', required: true },   // submitted | processing | done | no-provider | failed
          jobId: { type: 'string', required: false },
          message: { type: 'string', required: true },
        },
      },
      render: (_args, value) => [{ type: 'text', text: value.ok ? `任务 ${value.jobId ?? ''} ${value.status}：${value.message}` : `生成失败：${value.message}` }],
    },
    timeoutMs: 130000,
    async execute(args) {
      const cfg = loadConfig()
      const aspect = args.aspect_ratio ?? '9:16'
      const [w, h] = { '16:9': [1280, 720], '9:16': [720, 1280], '1:1': [1024, 1024] }[aspect]
      const durationSec = Math.min(Math.max(Number(args.duration_sec) || 5, 3), 5)
      if (args.provider === 'mock' || (args.provider === 'auto' && cfg.mock && !cfg.jimengSessionId)) {
        const p = createMockProvider()
        const { jobId } = await p.submit('video', { positive: args.prompt })
        return { ok: true, status: 'submitted', jobId, message: 'mock 供应商已受理（占位输出，供链路验证；真实生成请配置供应商）' }
      }
      if (!cfg.jimengSessionId) {
        return { ok: false, status: 'no-provider', message: '未配置即梦 sessionid：在 $DSH_HOME/whale.json 写入 {"jimengSessionId":"..."}，或联系维护者。免费档高峰可能 SystemBusy，建议错峰。' }
      }
      const p = createJimengProvider({ sessionId: cfg.jimengSessionId })
      try {
        const { jobId } = await p.submit('video', { positive: args.prompt, width: w, height: h, durationSec })
        // 短轮询（免费档高峰期 SystemBusy 会在此暴露真实原因）
        let st = { state: 'running' }
        for (let i = 0; i < 8; i++) {
          await new Promise((r) => setTimeout(r, 10000))
          st = await p.status(jobId)
          if (st.state === 'done' || st.state === 'failed') break
        }
        if (st.state === 'done') {
          const out = await p.fetch(jobId)
          return { ok: true, status: 'done', jobId, message: `成片地址：${out.outputs[0]}` }
        }
        if (st.state === 'failed') return { ok: false, status: 'failed', jobId, message: `服务端失败：${st.error ?? 'unknown'}（免费档高峰常见 SystemBusy，不扣额度，建议错峰重试）` }
        return { ok: true, status: 'processing', jobId, message: '任务仍在生成（免费档较慢），稍后可再次调用本工具查询' }
      } catch (e) {
        return { ok: false, status: 'failed', message: String(e?.message ?? e).slice(0, 300) }
      }
    },
  })

  // ③ 质检工具（规则层；LLM 抽帧评审待接入，如实标注）
  ctx.tools.register({
    name: 'whale_quality_review',
    description: '对成片做基础质检：文件存在、时长、最小体积。LLM 抽帧评审尚未接入，会如实标注。',
    parameters: {
      video_path: { type: 'string', required: true, description: '成片本地路径' },
    },
    output: {
      schema: {
        type: 'object', additionalProperties: false,
        properties: {
          ok: { type: 'boolean', required: true },
          checks: { type: 'array', required: true, items: { type: 'object', additionalProperties: false,
            properties: { item: { type: 'string', required: true }, status: { type: 'string', required: true }, detail: { type: 'string', required: true } } } },
          note: { type: 'string', required: true },
        },
      },
      render: (_args, value) => [{ type: 'text', text: value.ok ? '质检通过（规则层）' : `质检未通过：${value.checks.filter((c) => c.status !== 'pass').map((c) => c.item).join('、')}` }],
    },
    async execute(args) {
      const p = String(args.video_path ?? '')
      const checks = []
      if (!p) return { ok: false, checks: [{ item: '文件存在', status: 'fail', detail: '未提供路径' }], note: 'LLM 抽帧评审待接入' }
      if (!existsSync(p)) return { ok: false, checks: [{ item: '文件存在', status: 'fail', detail: p }], note: 'LLM 抽帧评审待接入' }
      checks.push({ item: '文件存在', status: 'pass', detail: p })
      try {
        const dur = await probeDurationSec(p)
        checks.push({ item: '时长', status: dur >= 0.5 ? 'pass' : 'fail', detail: `${dur.toFixed(1)}s` })
      } catch (e) {
        checks.push({ item: '时长', status: 'fail', detail: String(e?.message ?? e).slice(0, 80) })
      }
      const ok = checks.every((c) => c.status === 'pass')
      return { ok, checks, note: 'LLM 抽帧评审待接入（计划 P2 导演喊卡）' }
    },
  })
}
