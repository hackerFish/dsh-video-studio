// Whale client half (P1): "鲸影" tab in Plugins settings, fed by the /dsh-video-studio/health host route.
// Registration pattern mirrors the shipped dsh-recommend plugin (settings.plugins.tab, verified shape).
// NOTE: React is provided by the DSH client runtime; this source gets bundled to lib/client.js on publish.

import React from 'react'

export const inject = ['slots']

function Panel({ loadHealth }: { loadHealth: () => Promise<any> }): any {
  const [state, setState] = React.useState({ loading: true, error: null as string | null, data: null as any })
  React.useEffect(() => {
    let alive = true
    loadHealth()
      .then((data: any) => { if (alive) setState({ loading: false, error: null, data }) })
      .catch((err: unknown) => { if (alive) setState({ loading: false, error: String((err as Error)?.message ?? err), data: null }) })
    return () => { alive = false }
  }, [loadHealth])
  if (state.loading) return React.createElement('p', { role: 'status' }, 'Reading whale status…')
  if (state.error) return React.createElement('p', { role: 'alert' }, 'Status read failed: ' + state.error)
  const d = state.data
  return React.createElement('div', null,
    React.createElement('h2', null, '鲸影 · 账号与额度 / Accounts & Quota'),
    React.createElement('p', null, 'Version ' + d.version + ' · Pipeline: ' + d.stages.join(' → ')),
    React.createElement('ul', null,
      d.providers.map((p: string) => React.createElement('li', { key: p },
        p, p === 'sessionid-http' ? '（即梦/可灵免费额度，sessionid 待配置）' : ''))),
    React.createElement('p', { style: { opacity: 0.7 } },
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
  return React.createElement('div', { style: { padding: '8px 0', display: 'flex', flexDirection: 'column', gap: 8 } },
    React.createElement('div', null,
      React.createElement('strong', null, '🎬 鲸影生成 '),
      React.createElement('span', { style: { opacity: 0.75, fontSize: 13 } }, '状态: ' + String(status))),
    args?.prompt ? React.createElement('div', { style: { fontSize: 13, opacity: 0.85 } }, '提示词: ' + String(args.prompt)) : null,
    message ? React.createElement('div', { style: { fontSize: 13 } }, message) : null,
    url ? React.createElement('video', { src: url, controls: true, style: { width: '100%', maxWidth: 420, borderRadius: 8 } }) : null,
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
  ctx.slots.inject('tool.call.toolview', () => ctx.slots.register({
    name: 'tool.call.toolview',
    key: 'whale_generate_video',
  }, VideoCard))
}
