// Whale client half (P1): "鲸影" tab in Plugins settings, fed by the /dsh-video-studio/health host route.
// Registration pattern mirrors the shipped dsh-recommend plugin (settings.plugins.tab, verified shape).
// NOTE: React is provided by the DSH client runtime; this source gets bundled to lib/client.js on publish.

import { useState, useEffect, createElement } from 'react'
import { WhaleFlow } from './flow.ts'

export const inject = ['slots']

function Panel({ loadHealth }: { loadHealth: () => Promise<any> }): any {
  const [state, setState] = useState({ loading: true, error: null as string | null, data: null as any })
  useEffect(() => {
    let alive = true
    loadHealth()
      .then((data: any) => { if (alive) setState({ loading: false, error: null, data }) })
      .catch((err: unknown) => { if (alive) setState({ loading: false, error: String((err as Error)?.message ?? err), data: null }) })
    return () => { alive = false }
  }, [loadHealth])
  if (state.loading) return createElement('p', { role: 'status' }, 'Reading whale status…')
  if (state.error) return createElement('p', { role: 'alert' }, 'Status read failed: ' + state.error)
  const d = state.data
  return createElement('div', null,
    createElement('h2', null, '鲸影 · 账号与额度 / Accounts & Quota'),
    createElement('p', null, 'Version ' + d.version + ' · Pipeline: ' + d.stages.join(' → ')),
    createElement('ul', null,
      d.providers.map((p: string) => createElement('li', { key: p },
        p, p === 'sessionid-http' ? '（即梦/可灵免费额度，sessionid 待配置）' : ''))),
    createElement('p', { style: { opacity: 0.7 } },
      'Accounts registered: ' + d.quotaAccounts + ' · Quota scheduler ready (quality first, cost second)'),
  )
}

// 会话内视频卡片：whale_generate_video 工具调用的专属渲染（状态 → 消息 → 可播放视频）
// 契约：tool.call.toolview 的 keyed 注册，ownerProps = ToolCallOwnerProps（callId/toolName/block/cwd/openFile/inspect）
function VideoCard(props: any): any {
  const block = props?.block ?? null
  // 防御式取值：running 调用或 settled 结果节点（形状以运行时为准，逐层可选链）
  const args = block?.call?.arguments ?? block?.arguments ?? {}
  const res = block?.result ?? block?.call?.result ?? null
  const value = res?.value ?? (typeof res?.content === 'string' ? (() => { try { return JSON.parse(res.content) } catch { return null } })() : null)
  const message = value?.message ?? ''
  const url = (message.match(/https?:\/\/[^\s"'<>]+/) ?? [null])[0]
  const status = value?.status ?? (res?.isError ? 'failed' : 'running')
  return createElement('div', { style: { padding: '8px 0', display: 'flex', flexDirection: 'column', gap: 8 } },
    createElement('div', null,
      createElement('strong', null, '🎬 鲸影生成 '),
      createElement('span', { style: { opacity: 0.75, fontSize: 13 } }, '状态: ' + String(status))),
    args?.prompt ? createElement('div', { style: { fontSize: 13, opacity: 0.85 } }, '提示词: ' + String(args.prompt)) : null,
    message ? createElement('div', { style: { fontSize: 13 } }, message) : null,
    url ? createElement('video', { src: url, controls: true, style: { width: '100%', maxWidth: 420, borderRadius: 8 } }) : null,
  )
}

// 构建标记：改这个值会改变客户端文件哈希 → rev 变化 → 强制浏览器换新模块（破 IndexedDB 缓存）
const WHALE_BUILD = 'r5-storyboard'
const WHALE_STAGE_LABELS: Record<string, string> = {
  story: '故事', script: '剧本', storyboard: '分镜', 'master-asset': '主图', 'shot-assets': '资产图', video: '视频', 'final-cut': '成片',
}

function WorkbenchPanel(_props: any): any {
  const [doc, setDoc] = useState<any>(null)
  const [comfy, setComfy] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [full, setFull] = useState(false)
  const [view, setView] = useState<'cards' | 'flow'>('cards')
  useEffect(() => {
    let alive = true
    const load = () => {
      fetch('/dsh-video-studio/runs', { cache: 'no-store' })
        .then((r: any) => r.json())
        .then((d: any) => { if (alive) setDoc(d) })
        .catch((e: unknown) => { if (alive) setError(String((e as Error)?.message ?? e)) })
      fetch('/dsh-video-studio/comfyui', { cache: 'no-store' })
        .then((r: any) => r.json())
        .then((d: any) => { if (alive) setComfy(d) })
        .catch(() => { if (alive) setComfy({ state: 'error', error: 'comfyui 路由不可达' }) })
    }
    load()
    const timer = setInterval(load, 3000)
    return () => { alive = false; clearInterval(timer) }
  }, [])
  if (error) return createElement('p', { role: 'alert' }, '工作台读取失败: ' + error)
  if (!doc) return createElement('p', { role: 'status' }, '正在读取运行记录…')
  const runs = doc.runs ?? []
  // ComfyUI 常驻状态卡：无任务时也展示（在线/离线/未配置/报错）
  const comfyState = comfy?.state ?? 'loading'
  const comfyColor = comfyState === 'online' ? '#2ea043' : comfyState === 'offline' || comfyState === 'error' ? '#c83c3c' : 'rgba(0,0,0,.45)'
  const comfyTitle = comfyState === 'online' ? 'ComfyUI 在线'
    : comfyState === 'offline' ? 'ComfyUI 离线'
    : comfyState === 'not-configured' ? 'ComfyUI 未配置'
    : comfyState === 'error' ? 'ComfyUI 状态读取失败'
    : 'ComfyUI 状态读取中…'
  const comfyDetail = comfyState === 'online'
    ? `GPU: ${comfy.gpu ?? 'unknown'} · 队列 运行${comfy.queue?.running ?? 0}/等待${comfy.queue?.pending ?? 0}`
    : comfyState === 'offline' ? (comfy.error ?? '无法连接')
    : comfyState === 'not-configured' ? (comfy.hint ?? '')
    : comfyState === 'error' ? (comfy.error ?? '请重启 dsh 加载新版路由')
    : ''
  // 资产流水线（脚手架）：分镜 → 主角一致性 → 场景图/道具图。先搭 UI，真实生成后续接入（省 token）
  const ASSET_STAGES = [
    { id: 'character-sheet', label: '角色三视图', tmpl: 'character-sheet', hint: '模板已就绪：whale_optimize_prompt 套用' },
    { id: 'scene-master', label: '场景主图', tmpl: 'scene-master', hint: '模板已就绪：scene-master' },
    { id: 'props', label: '道具图', tmpl: 'shot-scene', hint: '待接入生成' },
    { id: 'per-shot', label: '逐镜资产图', tmpl: 'shot-scene', hint: '与 shot-assets 阶段联动' },
  ] as const
  // 从运行事件里捞图片地址（master-asset/shot-assets 的 url 或 outputs）
  const collectImages = (run: any): string[] => {
    const out: string[] = []
    for (const e of run.events ?? []) {
      const d = e.detail
      if (typeof d === 'string' && /^https?:/.test(d)) out.push(d)
      else if (d && typeof d === 'object') {
        if (typeof d.url === 'string' && /^https?:/.test(d.url)) out.push(d.url)
        const outs = d.outputs ?? d.out
        if (Array.isArray(outs)) for (const u of outs) if (typeof u === 'string' && /^https?:/.test(u)) out.push(u)
      }
    }
    return out
  }
  const lastRun = runs[0] ?? null
  const runImages = lastRun ? collectImages(lastRun) : []
  const reviewEvents = lastRun ? (lastRun.events ?? []).filter((e: any) => e.type === 'review' || e.type === 'promote' || e.type === 'retry') : []
  const PANEL_BG = { background: '#ffffff', color: '#111111', borderRadius: 12, padding: 14 }
  const fullStyle = full
    ? { position: 'fixed' as const, inset: 0, zIndex: 9990, background: '#f3f4f6', overflow: 'auto', padding: '20px 28px 60px', color: '#111111' }
    : { ...PANEL_BG }
  const headerRow = (extra?: any) => createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, color: '#111' } },
    createElement('h2', { style: { margin: 0, color: '#111' } }, '鲸影工作台 / Pipeline Workbench · ' + WHALE_BUILD),
    createElement('div', { style: { display: 'flex', gap: 8, alignItems: 'center' } },
      extra,
      full && createElement('button', {
        onClick: () => setView(view === 'cards' ? 'flow' : 'cards'),
        style: { border: '1px solid rgba(0,0,0,.2)', borderRadius: 8, padding: '4px 14px', background: view === 'flow' ? 'rgba(124,58,237,.12)' : 'rgba(0,0,0,.04)', cursor: 'pointer', fontSize: 13, color: '#111' },
      }, view === 'flow' ? '▦ 卡片视图' : '🕸 节点视图'),
      createElement('button', {
        onClick: () => setFull(!full),
        style: { border: '1px solid rgba(0,0,0,.2)', borderRadius: 8, padding: '4px 14px', background: full ? 'rgba(200,60,60,.08)' : 'rgba(65,118,230,.08)', cursor: 'pointer', fontSize: 13, color: '#111' },
      }, full ? '✕ 退出全屏' : '⛶ 全屏工坊')),
  )
  if (full && view === 'flow') {
    return createElement('div', { style: fullStyle },
      createElement('div', { style: { maxWidth: 1500, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12, color: '#111' } },
        headerRow(createElement('span', { style: { fontSize: 12, opacity: 0.6, color: '#111' } }, '节点 = 流水线七段；连线 = 数据流；每节点可单独运行')),
        createElement('div', { style: { height: 'calc(100vh - 120px)', border: '1px solid rgba(0,0,0,.1)', borderRadius: 12, overflow: 'hidden', background: '#fff' } },
          createElement(WhaleFlow, null))),
    )
  }
  const innerStyle = full ? { maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column' as const, gap: 16 } : { display: 'flex', flexDirection: 'column' as const, gap: 16 }
  return createElement('div', { style: fullStyle },
    createElement('div', { style: innerStyle },
    headerRow(),
    // ---- ComfyUI 常驻卡 ----
    createElement('div', { style: { border: '1px solid rgba(0,0,0,.12)', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 } },
      createElement('span', { style: { width: 10, height: 10, borderRadius: '50%', background: comfyColor, flexShrink: 0 } }),
      createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 2 } },
        createElement('strong', null, comfyTitle),
        createElement('span', { style: { fontSize: 12, opacity: 0.7 } }, comfyDetail || '本地或远程 GPU 机地址皆可，填到「鲸影账号」即可')),
    ),
    // ---- 云引擎卡（不依赖 ComfyUI） ----
    createElement('div', { style: { border: '1px solid rgba(0,0,0,.12)', borderRadius: 10, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 } },
      createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
        createElement('strong', null, '云引擎 / Cloud Engines'),
        createElement('span', { style: { fontSize: 11, opacity: 0.5 } }, '无需本地 GPU，与 ComfyUI 互不依赖')),
      createElement('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
        [
          { k: 'dashscope-wan', label: '万相视频', status: 'live', note: '✅ 真机出片' },
          { k: 'tongyi-wanx', label: '万相生图', status: 'live', note: '✅ 真图' },
          { k: 'doubao', label: '豆包 Seedance', status: 'key', note: '🔑 等 ARK key' },
          { k: 'kling', label: '可灵', status: 'key', note: '🔑 等 key' },
          { k: 'jimeng', label: '即梦', status: 'warn', note: '⚠️ 队列满' },
        ].map((e) => createElement('span', {
          key: e.k,
          style: { padding: '4px 10px', borderRadius: 999, fontSize: 12, border: '1px solid rgba(0,0,0,.12)',
            background: e.status === 'live' ? 'rgba(46,160,67,.12)' : e.status === 'key' ? 'rgba(255,171,0,.12)' : 'rgba(200,60,60,.1)' },
        }, e.label + ' ' + e.note))),
      createElement('span', { style: { fontSize: 11, opacity: 0.5 } },
        '自动化（workflow 生成 / 资产板）纯本地可用，不依赖任何引擎；只有"执行出图"才需要选一个引擎。'),
    ),
    // ---- 分镜工坊：大纲 → 角色提示词卡 + 逐镜顶级提示词 → 一键开做 ----
    createElement(StoryboardStudio, null),
    // ---- 提示词精调台（引擎无关，纯本地精调 → 提交云引擎） ----
    createElement(PromptCockpit, null),
    // ---- 资产流水线看板（脚手架，占位不真生成） ----
    createElement('div', { style: { border: '1px solid rgba(0,0,0,.12)', borderRadius: 10, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 } },
      createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
        createElement('strong', null, '资产流水线 / Asset Board'),
        createElement('span', { style: { fontSize: 11, opacity: 0.5 } }, '脚手架：UI 先行，真实生成后续接入')),
      createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 } },
        ASSET_STAGES.map((a) => createElement('div', {
          key: a.id,
          style: { border: '1px dashed rgba(0,0,0,.18)', borderRadius: 8, padding: 8, display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' },
        },
          createElement('div', { style: { width: 48, height: 48, borderRadius: 6, background: 'rgba(0,0,0,.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 } },
            a.id === 'character-sheet' ? '🧑' : a.id === 'scene-master' ? '🏞️' : a.id === 'props' ? '🎒' : '🎞️'),
          createElement('span', { style: { fontSize: 12 } }, a.label),
          createElement('span', { style: { fontSize: 10, opacity: 0.6, textAlign: 'center' } }, a.hint),
        ))),
      lastRun && (
        createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
          createElement('div', { style: { fontSize: 12, opacity: 0.8 } },
            '最近一次运行「' + (lastRun.prompt ?? '').slice(0, 30) + '」产出图片: ' + runImages.length + ' 张' +
            (reviewEvents.length ? ' · 一致性评审事件 ' + reviewEvents.length + ' 条' : '')),
          runImages.length > 0 && createElement('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
            runImages.map((u: string, i: number) => createElement('img', { key: i, src: u, alt: 'asset' + i, style: { width: 64, height: 64, objectFit: 'cover', borderRadius: 6, border: '1px solid rgba(0,0,0,.1)' } }))),
          createElement('span', { style: { fontSize: 11, opacity: 0.5 } },
            '规划：分镜 → 主角三视图一致性校验 → 场景图/道具图 → 逐镜资产。真实生成待接入（有真实通道后开启，遵守成本护栏）。'),
        )
      ),
    ),
    runs.length === 0
      ? createElement('p', null, '暂无运行记录——在会话里调用 whale_generate_video 后，这里会显示七段流水线进度。')
      : runs.map((run: any) => {
          const doneStages = new Set((run.events ?? []).map((e: any) => e.stage))
          const lastStage = (run.events ?? []).slice(-1)[0]?.stage ?? null
          return createElement('div', { key: run.id, style: { border: '1px solid rgba(0,0,0,.12)', borderRadius: 10, padding: '10px 14px' } },
            createElement('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 13, opacity: 0.8 } },
              createElement('span', null, '🎬 ' + (run.prompt ?? '').slice(0, 40)),
              createElement('span', null, run.provider + ' · ' + run.status)),
            createElement('div', { style: { display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' } },
              Object.keys(WHALE_STAGE_LABELS).map((s) => {
                const done = doneStages.has(s)
                const current = run.status === 'running' && lastStage === s
                const style: Record<string, string | number> = {
                  padding: '4px 10px', borderRadius: 999, fontSize: 12,
                  background: done ? 'rgba(46,160,67,.15)' : current ? 'rgba(65,118,230,.18)' : 'rgba(0,0,0,.05)',
                  color: done ? '#2ea043' : current ? '#4176e6' : 'rgba(0,0,0,.45)',
                }
                return createElement('span', { key: s, style }, (done ? '✓ ' : current ? '◉ ' : '○ ') + WHALE_STAGE_LABELS[s])
              })),
            createElement('div', { style: { marginTop: 8, fontSize: 12, opacity: 0.7 } },
              '事件: ' + (run.events ?? []).map((e: any) => e.stage + '.' + e.type).join(' → ')),
          )
        }),
      ),
    )
}

// 分镜工坊：大纲+角色 → 顶级提示词卡与逐镜提示词 → 一键生成（纯本地拆解，成本护栏）
function StoryboardStudio(_props: any): any {
  const [outline, setOutline] = useState('三年前你们踩我出局，今天我让你们所有人求我回来。\n苏婉，这份做空报告，你确定要发？')
  const [charsText, setCharsText] = useState('林越|28岁男性，利落黑短发，冷峻眼神，藏青冲锋衣\n苏婉|26岁女性，深棕长直发，米色风衣，银框眼镜')
  const [style, setStyle] = useState('3D 国漫写实，电影级都市夜景，冷色霓虹')
  const [ratio, setRatio] = useState('9:16')
  const [plan, setPlan] = useState<any>(null)
  const [busy, setBusy] = useState(false)
  const [shotsOut, setShotsOut] = useState<Record<number, any>>({})
  const [running, setRunning] = useState<number | null>(null)
  const inputStyle = { padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(0,0,0,.2)', fontSize: 13, fontFamily: 'inherit' }
  const card = { border: '1px solid rgba(0,0,0,.1)', borderRadius: 10, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }
  const build = () => {
    setBusy(true); setPlan(null); setShotsOut({})
    fetch('/dsh-video-studio/storyboard', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ outline, charactersText: charsText, style: style || undefined, aspectRatio: ratio }),
    }).then((r: any) => r.json()).then((d: any) => { setBusy(false); setPlan(d) })
      .catch((e: unknown) => { setBusy(false); setPlan({ ok: false, error: String((e as Error)?.message ?? e) }) })
  }
  const genOne = (i: number, prompt: string) => {
    setRunning(i)
    fetch('/dsh-video-studio/generate', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt, aspectRatio: ratio, durationSec: 5 }),
    }).then((r: any) => r.json()).then((d: any) => { setShotsOut((m) => ({ ...m, [i]: d })); setRunning(null) })
      .catch((e: unknown) => { setShotsOut((m) => ({ ...m, [i]: { ok: false, error: String((e as Error)?.message ?? e) } })); setRunning(null) })
  }
  const runAll = async () => {
    for (const s of plan?.shots ?? []) {
      genOne(s.index, s.prompt)
      await new Promise((r) => setTimeout(r, 600)) // 顺序执行，尊重额度护栏
    }
  }
  const copy = (t: string) => { try { (navigator as any).clipboard?.writeText(t).catch(() => {}) } catch { /* 忽略 */ } }
  const section = (title: string, sub: string, children: any): any =>
    createElement('div', { style: { ...card, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 } },
      createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' } },
        createElement('strong', { style: { fontSize: 14 } }, title),
        createElement('span', { style: { fontSize: 11, opacity: 0.55 } }, sub)),
      children)
  return createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
    section('分镜工坊 / Storyboard Studio', '大纲 + 角色 → 顶级提示词卡与逐镜提示词（纯本地，不烧 token）',
      createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
        createElement('textarea', { value: outline, onChange: (e: any) => setOutline(e.target.value), rows: 3, placeholder: '大纲（按句子/换行自动拆分为镜头）', style: { ...inputStyle, width: '100%', boxSizing: 'border-box' } }),
        createElement('textarea', { value: charsText, onChange: (e: any) => setCharsText(e.target.value), rows: 2, placeholder: '角色清单：每行 名字|描述', style: { ...inputStyle, width: '100%', boxSizing: 'border-box' } }),
        createElement('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
          createElement('input', { value: style, onChange: (e: any) => setStyle(e.target.value), placeholder: '风格', style: { ...inputStyle, flex: 1, minWidth: 180 } }),
          createElement('select', { value: ratio, onChange: (e: any) => setRatio(e.target.value), style: inputStyle },
            ['9:16', '16:9', '1:1', '4:3', '3:4'].map((r) => createElement('option', { key: r, value: r }, r))),
          createElement('button', { onClick: build, disabled: busy, style: { ...inputStyle, background: '#4176e6', color: '#fff', border: 'none', cursor: 'pointer' } }, busy ? '拆解中…' : '📋 生成分镜'))))),
    plan && !plan.ok && createElement('div', { role: 'alert', style: { fontSize: 12, color: '#c83c3c' } }, '失败: ' + (plan.error ?? '')),
    plan && plan.ok && createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
      // 角色提示词卡
      plan.characters.length > 0 && section('角色提示词卡 · ' + plan.characters.length, '三视图模板 + 增益库，顶级可直接用',
        createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 8 } },
          plan.characters.map((c: any) => createElement('div', { key: c.name, style: { ...card, padding: 10, display: 'flex', flexDirection: 'column', gap: 6 } },
            createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
              createElement('strong', null, '🧑 ' + c.name),
              createElement('button', { onClick: () => copy(c.prompt), style: { fontSize: 11, border: '1px solid rgba(0,0,0,.2)', borderRadius: 5, background: 'none', cursor: 'pointer', padding: '2px 8px' } }, '复制')),
            createElement('div', { style: { fontSize: 11, opacity: 0.65, maxHeight: 96, overflow: 'hidden' } }, c.prompt),
          )))),
      // 逐镜提示词
      section('分镜提示词 · ' + plan.shots.length, '每镜顶级提示词，可单独生成或一键开做',
        (() => {
          const rows = plan.shots.map((s: any) => createElement('div', { key: s.index, style: { ...card, padding: 10, display: 'flex', flexDirection: 'column', gap: 6 } },
            createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
              createElement('strong', { style: { fontSize: 13 } }, '镜 ' + (s.index + 1) + ' · ' + s.line),
              createElement('div', { style: { display: 'flex', gap: 6 } },
                createElement('button', { onClick: () => copy(s.prompt), style: { fontSize: 11, border: '1px solid rgba(0,0,0,.2)', borderRadius: 5, background: 'none', cursor: 'pointer', padding: '2px 8px' } }, '复制'),
                createElement('button', { onClick: () => genOne(s.index, s.prompt), disabled: running === s.index, style: { fontSize: 11, border: 'none', borderRadius: 5, background: '#2ea043', color: '#fff', cursor: 'pointer', padding: '2px 8px' } }, running === s.index ? '生成中…' : '生成此镜'))),
            createElement('div', { style: { fontSize: 11, opacity: 0.7 } }, s.prompt),
            shotsOut[s.index] && (
              shotsOut[s.index].ok
                ? createElement('img', { src: shotsOut[s.index].url, alt: 'shot' + s.index, style: { maxWidth: 220, borderRadius: 6, border: '1px solid rgba(0,0,0,.1)' } })
                : createElement('div', { role: 'alert', style: { fontSize: 11, color: shotsOut[s.index].status === 'quota-paused' ? '#b3870e' : '#c83c3c' } },
                    (shotsOut[s.index].status ?? 'error') + ': ' + (shotsOut[s.index].error ?? shotsOut[s.index].message ?? ''))),
          ))
          const runBtn = createElement('button', { onClick: runAll, style: { alignSelf: 'flex-start', ...inputStyle, background: '#7c3aed', color: '#fff', border: 'none', cursor: 'pointer' } }, '🎬 一键开做（顺序生成）')
          return createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } }, ...rows, runBtn)
        })()))
}

// 提示词精调台：草稿 → 模板/增益精调（纯本地）→ 提交云引擎出图（成本护栏）
function PromptCockpit(_props: any): any {
  const [draft, setDraft] = useState('一只鲸鱼在深海中游动，蓝色调，电影感')
  const [style, setStyle] = useState('3D 国漫写实，电影级')
  const [template, setTemplate] = useState('')
  const [ratio, setRatio] = useState('16:9')
  const [result, setResult] = useState<any>(null)
  const [busy, setBusy] = useState(false)
  const [gen, setGen] = useState<any>(null)
  const optimize = () => {
    setBusy(true)
    fetch('/dsh-video-studio/prompt-optimize', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: draft, style: style || undefined, template: template || undefined, aspectRatio: ratio }),
    }).then((r: any) => r.json()).then((d: any) => { setBusy(false); setResult(d) })
      .catch((e: unknown) => { setBusy(false); setResult({ ok: false, error: String((e as Error)?.message ?? e) }) })
  }
  const generate = () => {
    const src = result?.ok ? result.optimized : draft
    setGen({ running: true })
    fetch('/dsh-video-studio/generate', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: src, aspectRatio: ratio, durationSec: 5 }),
    }).then((r: any) => r.json()).then((d: any) => setGen(d))
      .catch((e: unknown) => setGen({ ok: false, status: 'error', error: String((e as Error)?.message ?? e) }))
  }
  const inputStyle = { padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(0,0,0,.2)', fontSize: 13, fontFamily: 'inherit' }
  return createElement('div', { style: { border: '1px solid rgba(0,0,0,.12)', borderRadius: 10, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 } },
    createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
      createElement('strong', null, '提示词精调台 / Prompt Cockpit'),
      createElement('span', { style: { fontSize: 11, opacity: 0.5 } }, '纯本地精调（模板+增益库），无 GPU 也能用')),
    createElement('textarea', {
      value: draft, onChange: (e: any) => setDraft(e.target.value), rows: 3,
      style: { ...inputStyle, width: '100%', boxSizing: 'border-box' },
    }),
    createElement('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
      createElement('input', { value: style, onChange: (e: any) => setStyle(e.target.value), placeholder: '风格', style: { ...inputStyle, flex: 1, minWidth: 160 } }),
      createElement('select', { value: template, onChange: (e: any) => setTemplate(e.target.value), style: inputStyle },
        createElement('option', { value: '' }, '不套模板'),
        createElement('option', { value: 'character-sheet' }, '角色三视图'),
        createElement('option', { value: 'scene-master' }, '场景主图'),
        createElement('option', { value: 'shot-scene' }, '单镜画面')),
      createElement('select', { value: ratio, onChange: (e: any) => setRatio(e.target.value), style: inputStyle },
        ['16:9', '9:16', '1:1', '4:3', '3:4'].map((r) => createElement('option', { key: r, value: r }, r))),
      createElement('button', { onClick: optimize, disabled: busy, style: { ...inputStyle, background: '#4176e6', color: '#fff', border: 'none', cursor: 'pointer' } }, busy ? '精调中…' : '⚡ 精调到顶级'),
      createElement('button', { onClick: generate, style: { ...inputStyle, background: '#2ea043', color: '#fff', border: 'none', cursor: 'pointer' } }, '🎬 提交生成'),
    ),
    result && (result.ok
      ? createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 } },
          createElement('div', null, '优化后（增益 ' + result.appliedBoosters.length + ' 项）：' + result.optimized),
          createElement('div', { style: { opacity: 0.7 } }, '负面: ' + (result.negative ?? []).join('，')))
      : createElement('div', { role: 'alert', style: { fontSize: 12, color: '#c83c3c' } }, '精调失败: ' + (result.error ?? ''))),
    gen && gen.running && createElement('div', { style: { fontSize: 12, opacity: 0.7 } }, '生成中（额度护栏生效，默认走池内健康引擎）…'),
    gen && !gen.running && (
      gen.ok
        ? createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            createElement('span', { style: { fontSize: 12, opacity: 0.8 } }, '✅ 已生成（' + (gen.engine ?? '') + '）'),
            createElement('img', { src: gen.url, alt: 'generated', style: { width: '100%', maxWidth: 320, borderRadius: 8, border: '1px solid rgba(0,0,0,.1)' } }))
        : createElement('div', { role: 'alert', style: { fontSize: 12, color: gen.status === 'quota-paused' ? '#b3870e' : '#c83c3c' } },
            '生成未完成（' + (gen.status ?? 'error') + '）: ' + (gen.error ?? gen.message ?? ''))),
  )
}

// 鲸影账号面板：多账号凭证管理（GET/POST/DELETE /dsh-video-studio/accounts）
const PROVIDER_LABELS: Record<string, string> = {
  mock: 'mock（链路自测）',
  jimeng: '即梦 sessionid',
  'tongyi-wanx': '通义万相',
  kling: '可灵官方',
  'kling-dashscope': 'DashScope 视频',
  'kling-lipsync': '可灵对口型',
  doubao: '豆包 Seedance/Seedream',
  comfyui: 'ComfyUI 本地',
  'sessionid-http': 'sessionid 通用',
}

function AccountPanel(_props: any): any {
  const [doc, setDoc] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ provider: 'jimeng', credential: '', dailyQuota: '66', note: '' })

  const reload = () => {
    fetch('/dsh-video-studio/accounts', { cache: 'no-store' })
      .then((r: any) => r.json())
      .then((d: any) => { setDoc(d); setError(null) })
      .catch((e: unknown) => setError(String((e as Error)?.message ?? e)))
  }
  useEffect(() => { reload(); return () => {} }, [])

  const submit = () => {
    if (!form.credential.trim()) { setError('先填凭证'); return }
    setBusy(true)
    fetch('/dsh-video-studio/accounts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        provider: form.provider,
        credential: form.credential.trim(),
        dailyQuota: Number(form.dailyQuota) || undefined,
        note: form.note.trim() || undefined,
      }),
    })
      .then((r: any) => r.json())
      .then((d: any) => {
        setBusy(false)
        if (!d.ok) { setError(d.error ?? '添加失败'); return }
        setForm({ ...form, credential: '', note: '' })
        reload()
      })
      .catch((e: unknown) => { setBusy(false); setError(String((e as Error)?.message ?? e)) })
  }

  const remove = (id: string) => {
    setBusy(true)
    fetch('/dsh-video-studio/accounts?id=' + encodeURIComponent(id), { method: 'DELETE' })
      .then((r: any) => r.json())
      .then(() => { setBusy(false); reload() })
      .catch((e: unknown) => { setBusy(false); setError(String((e as Error)?.message ?? e)) })
  }

  const inputStyle = { padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(0,0,0,.2)', fontSize: 14 }
  const accounts = (doc?.accounts ?? []) as any[]
  return createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },
    createElement('h2', null, '鲸影账号 / Account Vault'),
    createElement('p', { style: { opacity: 0.7, fontSize: 13 } },
      '凭证只保存在本机 ~/.whale/whale.json（0600 权限），接口只返回脱敏提示。多账号按日额度轮换，失败自动冷却。'),
    error ? createElement('p', { role: 'alert' }, '操作失败: ' + error) : null,
    createElement('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
      createElement('select', {
        value: form.provider,
        onChange: (e: any) => setForm({ ...form, provider: e.target.value }),
        style: inputStyle,
      }, Object.keys(PROVIDER_LABELS).map((p) => createElement('option', { key: p, value: p }, PROVIDER_LABELS[p]))),
      createElement('input', {
        type: 'password',
        placeholder: '凭证（sessionid / cookie / key）',
        value: form.credential,
        onChange: (e: any) => setForm({ ...form, credential: e.target.value }),
        style: { ...inputStyle, flex: 1, minWidth: 220 },
      }),
      createElement('input', {
        type: 'number',
        placeholder: '日额度',
        value: form.dailyQuota,
        onChange: (e: any) => setForm({ ...form, dailyQuota: e.target.value }),
        style: { ...inputStyle, width: 90 },
      }),
      createElement('input', {
        type: 'text',
        placeholder: '备注（可选）',
        value: form.note,
        onChange: (e: any) => setForm({ ...form, note: e.target.value }),
        style: { ...inputStyle, width: 140 },
      }),
      createElement('button', {
        onClick: submit,
        disabled: busy,
        style: { ...inputStyle, background: '#4176e6', color: '#fff', border: 'none', cursor: 'pointer' },
      }, busy ? '保存中…' : '添加账号'),
    ),
    accounts.length === 0
      ? createElement('p', { style: { opacity: 0.6 } }, '暂无账号——把免费的即梦/通义/豆包凭证挂进来，调度器会自动轮换。')
      : accounts.map((a: any) => createElement('div', {
          key: a.id,
          style: { border: '1px solid rgba(0,0,0,.12)', borderRadius: 10, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10 },
        },
          createElement('strong', null, PROVIDER_LABELS[a.provider] ?? a.provider),
          createElement('code', { style: { fontSize: 12 } }, a.credentialHint),
          createElement('span', { style: { fontSize: 12, opacity: 0.7 } }, '日额度 ' + (a.dailyQuota ?? '∞')),
          a.note ? createElement('span', { style: { fontSize: 12, opacity: 0.7 } }, a.note) : null,
          createElement('button', {
            onClick: () => remove(a.id),
            disabled: busy,
            style: { marginLeft: 'auto', background: 'none', border: '1px solid rgba(200,60,60,.5)', color: '#c83c3c', borderRadius: 6, padding: '2px 10px', cursor: 'pointer' },
          }, '删除'),
        )),
  )
}

export function apply(ctx: any): void {
  const injected = () => ({
    loadHealth: async () => {
      const res = await fetch('/dsh-video-studio/health', { cache: 'no-store' })
      if (!res.ok) throw new Error('health route ' + res.status)
      return res.json()
    },
  })
  ctx.slots.inject('settings.plugins.tab', () => ctx.slots.register({
    name: 'settings.plugins.tab',
    id: 'whale',
    order: 30,
    label: () => '鲸影',
    inject: injected,
  }, Panel))
  // 注意：工作台注册在 settings.plugins.tab（与 dsh-recommend 同一先例），
  // settings.section 契约只接受 {id,order,label}，多传 inject 会被严格插槽拒绝。
  ctx.slots.inject('settings.plugins.tab', () => ctx.slots.register({
    name: 'settings.plugins.tab',
    id: 'whale-workbench',
    order: 31,
    label: () => '鲸影工作台',
    inject: () => ({}),
  }, WorkbenchPanel))
  ctx.slots.inject('settings.plugins.tab', () => ctx.slots.register({
    name: 'settings.plugins.tab',
    id: 'whale-accounts',
    order: 32,
    label: () => '鲸影账号',
    inject: () => ({}),
  }, AccountPanel))
  ctx.slots.inject('tool.call.toolview', () => ctx.slots.register({
    name: 'tool.call.toolview',
    key: 'whale_generate_video',
  }, VideoCard))
  // 聊天区工坊：whale_studio 工具调用后，节点画布直接渲染在会话消息里
  ctx.slots.inject('tool.call.toolview', () => ctx.slots.register({
    name: 'tool.call.toolview',
    key: 'whale_studio',
  }, StudioToolView))
}

// 聊天区渲染的鲸影工坊（浅色自包含卡片，任何主题下清晰）
function StudioToolView(_props: any): any {
  return createElement('div', { style: { background: '#fff', color: '#111', borderRadius: 12, border: '1px solid rgba(0,0,0,.1)', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 } },
    createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
      createElement('strong', { style: { fontSize: 14, color: '#111' } }, '🎬 鲸影工坊 · 节点式工作区'),
      createElement('span', { style: { fontSize: 11, color: 'rgba(0,0,0,.5)' } }, '可拖拽/连线/右键添加节点 · 兼容 ComfyUI workflow JSON')),
    createElement('div', { style: { height: 460, border: '1px solid rgba(0,0,0,.1)', borderRadius: 10, overflow: 'hidden', background: '#fafafa' } },
      createElement(WhaleFlow, null)),
  )
}
