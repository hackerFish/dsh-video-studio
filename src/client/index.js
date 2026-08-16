// 鲸影 client 半（P1）：设置页「鲸影」标签 —— 账号/额度面板数据端点。
// 注册模式逐字段对照已上线的 dsh-recommend 插件（settings.plugins.tab 的实测写法）。
// 注意：本文件为源码（React.createElement，无 JSX）；发布前需用 esbuild 打包为
// 自包含单文件（社区插件的标准构建步骤），浏览器端验证待打包后执行。

export const inject = ['slots']

function Panel({ loadHealth }) {
  const [state, setState] = React.useState({ loading: true, error: null, data: null })
  React.useEffect(() => {
    let alive = true
    loadHealth()
      .then((data) => { if (alive) setState({ loading: false, error: null, data }) })
      .catch((err) => { if (alive) setState({ loading: false, error: String(err?.message ?? err), data: null }) })
    return () => { alive = false }
  }, [loadHealth])
  if (state.loading) return React.createElement('p', { role: 'status' }, '正在读取鲸影状态…')
  if (state.error) return React.createElement('p', { role: 'alert' }, '状态读取失败：' + state.error)
  const d = state.data
  return React.createElement('div', null,
    React.createElement('h2', null, '鲸影 · 账号与额度'),
    React.createElement('p', null, '版本 ' + d.version + ' · 管线：' + d.stages.join(' → ')),
    React.createElement('ul', null,
      d.providers.map((p) => React.createElement('li', { key: p },
        p, p === 'sessionid-http' ? '（即梦/可灵免费额度，sessionid 待配置）' : ''))),
    React.createElement('p', { style: { opacity: 0.7 } },
      '已登记账号：' + d.quotaAccounts + ' 个 · 免费额度调度器已就绪（质量优先、省钱第二）'),
  )
}

export function apply(ctx) {
  const injected = () => ({
    loadHealth: async () => {
      const res = await fetch('/dsh-video-studio/health', { cache: 'no-store' })
      if (!res.ok) throw new Error('health 路由 ' + res.status)
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
}
