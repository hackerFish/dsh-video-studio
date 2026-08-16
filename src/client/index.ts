// Whale client half (P1): "鲸影" tab in Plugins settings, fed by the /dsh-video-studio/health host route.
// Registration pattern mirrors the shipped dsh-recommend plugin (settings.plugins.tab, verified shape).
// NOTE: React is provided by the DSH client runtime; this source gets bundled to lib/client.js on publish.

import { useState, useEffect, createElement } from 'react'

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

// 鲸影工作台：六段流水线可视化（轮询 /dsh-video-studio/runs，展示每次生成的阶段进度与事件流）
const WHALE_STAGE_LABELS: Record<string, string> = {
  story: '故事', script: '剧本', storyboard: '分镜', 'master-asset': '主图', 'shot-assets': '资产图', video: '视频', 'final-cut': '成片',
}

function WorkbenchPanel(_props: any): any {
  const [doc, setDoc] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    const load = () => {
      fetch('/dsh-video-studio/runs', { cache: 'no-store' })
        .then((r: any) => r.json())
        .then((d: any) => { if (alive) setDoc(d) })
        .catch((e: unknown) => { if (alive) setError(String((e as Error)?.message ?? e)) })
    }
    load()
    const timer = setInterval(load, 3000)
    return () => { alive = false; clearInterval(timer) }
  }, [])
  if (error) return createElement('p', { role: 'alert' }, '工作台读取失败: ' + error)
  if (!doc) return createElement('p', { role: 'status' }, '正在读取运行记录…')
  const runs = doc.runs ?? []
  return createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 16 } },
    createElement('h2', null, '鲸影工作台 / Pipeline Workbench'),
    runs.length === 0
      ? createElement('p', null, '暂无运行记录——在会话里调用 whale_generate_video 后，这里会显示六段流水线进度。')
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
  ctx.slots.inject('tool.call.toolview', () => ctx.slots.register({
    name: 'tool.call.toolview',
    key: 'whale_generate_video',
  }, VideoCard))
}
