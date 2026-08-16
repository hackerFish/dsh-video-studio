// 鲸影 host 入口（结构遵循官方 dsh-global-rules 的同一约定：
// export const name + export function apply(ctx) + webServer 路由注册）
export const name = 'dsh-video-studio'

function sendJson(response, status, payload) {
  response.writeHead(status, { 'cache-control': 'no-store', 'content-type': 'application/json; charset=utf-8' })
  response.end(JSON.stringify(payload))
}

export function apply(ctx) {
  ctx.inject(['webServer'], (host) => {
    host.effect(() => host.webServer.register({
      kind: 'exact',
      path: '/dsh-video-studio/health',
      handler: async (request, response) => {
        if (request.method !== 'GET') {
          response.writeHead(405, { allow: 'GET' })
          response.end()
          return
        }
        // 各供应商健康/额度状态将在这里汇总（P1 UI 的账号面板数据源）
        sendJson(response, 200, {
          ok: true,
          version: '0.1.0',
          stages: ['parse', 'storyboard', 'stills', 'video', 'voice', 'final-cut'],
          providers: ['mock', 'comfyui', 'sessionid-http', 'api-key'],
          quotaAccounts: 0, // 待设置面板写入
        })
      },
    }), 'dsh-video-studio: http route')
  })
}
