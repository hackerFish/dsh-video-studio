// Whale host entry. Same convention as official dsh-global-rules:
// export const name + export function apply(ctx) + webServer route + model tool registration.
// NOTE: ctx is typed loosely on purpose — DSH runtime types are provided by the profile at load time.
import { registerTools } from './tools.ts'

export const name = 'dsh-video-studio'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sendJson(response: any, status: number, payload: unknown): void {
  response.writeHead(status, { 'cache-control': 'no-store', 'content-type': 'application/json; charset=utf-8' })
  response.end(JSON.stringify(payload))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function apply(ctx: any): void {
  ctx.inject(['tools'], (toolsCtx: any) => {
    registerTools(toolsCtx)
  }, 'dsh-video-studio: tools')
  ctx.inject(['webServer'], (host: any) => {
    host.effect(() => host.webServer.register({
      kind: 'exact',
      path: '/dsh-video-studio/health',
      handler: async (request: any, response: any) => {
        if (request.method !== 'GET') {
          response.writeHead(405, { allow: 'GET' })
          response.end()
          return
        }
        sendJson(response, 200, {
          ok: true,
          version: '0.2.0',
          stages: ['parse', 'storyboard', 'stills', 'video', 'voice', 'final-cut'],
          providers: ['mock', 'jimeng', 'tongyi-wanx', 'kling', 'kling-dashscope', 'doubao', 'comfyui', 'sessionid-http'],
          quotaAccounts: 0,
        })
      },
    }), 'dsh-video-studio: http route')
  })
}
