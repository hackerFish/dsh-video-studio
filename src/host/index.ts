// Whale host entry. Same convention as official dsh-global-rules:
// export const name + export function apply(ctx) + webServer route + model tool registration.
// NOTE: ctx is typed loosely on purpose — DSH runtime types are provided by the profile at load time.
import { registerTools } from './tools.ts'
import { listRuns, getRun } from './runs.ts'
import { maskCredential } from '../accounts/store.ts'
import { providerIds } from '../selfaudit/matrix.ts'
import { runtimeVault, invalidatePool } from './runtime.ts'

export const name = 'dsh-video-studio'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sendJson(response: any, status: number, payload: unknown): void {
  response.writeHead(status, { 'cache-control': 'no-store', 'content-type': 'application/json; charset=utf-8' })
  response.end(JSON.stringify(payload))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readBody(request: any): Promise<string> {
  return new Promise((resolve, reject) => {
    let raw = ''
    if (typeof request.setEncoding === 'function') request.setEncoding('utf8')
    request.on('data', (chunk: any) => { raw += String(chunk) })
    request.on('end', () => resolve(raw))
    request.on('error', reject)
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function tryJson(raw: string): any | null {
  if (!raw.trim()) return null
  try { return JSON.parse(raw) } catch { return null }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function apply(ctx: any): void {
  ctx.inject(['tools'], (toolsCtx: any) => {
    registerTools(toolsCtx)
  }, 'dsh-video-studio: tools')
  ctx.inject(['webServer'], (host: any) => {
    // 保险库与账号池走 runtime 单例：路由和工具共用一个实例。
    const vault = runtimeVault
    host.effect(() => host.webServer.register({
      kind: 'exact',
      path: '/dsh-video-studio/health',
      handler: async (request: any, response: any) => {
        if (request.method !== 'GET') {
          response.writeHead(405, { allow: 'GET' })
          response.end()
          return
        }
        let quotaAccounts = 0
        try { quotaAccounts = vault().list().length } catch { /* vault 不可读时保持 health 存活 */ }
        sendJson(response, 200, {
          ok: true,
          version: '0.2.0',
          stages: ['story', 'script', 'storyboard', 'master-asset', 'shot-assets', 'video', 'final-cut'],
          providers: providerIds(),
          quotaAccounts,
        })
      },
    }), 'dsh-video-studio: http route')
    host.effect(() => host.webServer.register({
      kind: 'exact',
      path: '/dsh-video-studio/runs',
      handler: async (request: any, response: any) => {
        if (request.method !== 'GET') {
          response.writeHead(405, { allow: 'GET' })
          response.end()
          return
        }
        const url = new URL(request.url ?? '/', 'http://localhost')
        const id = url.searchParams.get('id')
        sendJson(response, 200, id ? (getRun(id) ?? { ok: false, error: 'run not found' }) : { ok: true, runs: listRuns() })
      },
    }), 'dsh-video-studio: runs route')
    host.effect(() => host.webServer.register({
      kind: 'exact',
      path: '/dsh-video-studio/accounts',
      handler: async (request: any, response: any) => {
        const url = new URL(request.url ?? '/', 'http://localhost')
        try {
          if (request.method === 'GET') {
            sendJson(response, 200, { ok: true, accounts: vault().list() })
            return
          }
          if (request.method === 'POST') {
            const body = tryJson(await readBody(request)) ?? {}
            const q = url.searchParams
            const input = {
              provider: String(body.provider ?? q.get('provider') ?? ''),
              credential: String(body.credential ?? q.get('credential') ?? ''),
              dailyQuota: body.dailyQuota !== undefined ? Number(body.dailyQuota) : (q.has('dailyQuota') ? Number(q.get('dailyQuota')) : undefined),
              qualityTier: body.qualityTier !== undefined ? Number(body.qualityTier) : (q.has('qualityTier') ? Number(q.get('qualityTier')) : undefined),
              note: typeof body.note === 'string' ? body.note : undefined,
              id: typeof body.id === 'string' && body.id ? body.id : undefined,
            }
            const account = vault().add(input)
            invalidatePool()
            const { credential: _secret, ...masked } = account
            void _secret
            sendJson(response, 200, { ok: true, account: { ...masked, credentialHint: maskCredential(account.credential) } })
            return
          }
          if (request.method === 'DELETE') {
            const id = url.searchParams.get('id') ?? ''
            const removed = vault().remove(id)
            if (removed) invalidatePool()
            sendJson(response, 200, { ok: removed, id })
            return
          }
          response.writeHead(405, { allow: 'GET, POST, DELETE' })
          response.end()
        } catch (e) {
          sendJson(response, 400, { ok: false, error: e instanceof Error ? e.message : String(e) })
        }
      },
    }), 'dsh-video-studio: accounts route')
    host.effect(() => host.webServer.register({
      kind: 'exact',
      path: '/dsh-video-studio/comfyui',
      handler: async (_request: any, response: any) => {
        // ComfyUI 常驻状态：未配置 / 在线（GPU+队列）/ 离线（错误）——工作台无任务时也展示
        try {
          const accounts = vault().list()
          const cfg = accounts.find((a) => a.provider === 'comfyui')
          if (!cfg) {
            sendJson(response, 200, { ok: false, state: 'not-configured', hint: '在「鲸影账号」添加 comfyui，凭证填 http://127.0.0.1:8188' })
            return
          }
          const full = vault().get(cfg.id)
          if (!full) throw new Error('comfyui 账号读取失败')
          const { providerForAccount } = await import('./account-providers.ts')
          const p = providerForAccount({ id: full.id, provider: full.provider, credential: full.credential })
          const h = await p.health()
          if (!h.ok) {
            sendJson(response, 200, { ok: false, state: 'offline', baseUrl: full.credential, error: h.error ?? '无法连接' })
            return
          }
          // 队列深度（running/pending）
          let queue = { running: 0, pending: 0 }
          try {
            const base = typeof full.credential === 'string' && !full.credential.startsWith('{') ? full.credential : (() => { try { return (JSON.parse(full.credential) as { baseUrl?: string }).baseUrl ?? 'http://127.0.0.1:8188' } catch { return 'http://127.0.0.1:8188' } })()
            const q = await (await fetch(`${base}/queue`, { signal: AbortSignal.timeout(8000) })).json() as { queue_running?: unknown[]; queue_pending?: unknown[] }
            queue = { running: q.queue_running?.length ?? 0, pending: q.queue_pending?.length ?? 0 }
          } catch { /* 队列读取失败不影响在线状态 */ }
          sendJson(response, 200, { ok: true, state: 'online', baseUrl: full.credential, gpu: h.gpu ?? 'unknown', queue })
        } catch (e) {
          sendJson(response, 200, { ok: false, state: 'error', error: String(e instanceof Error ? e.message : e) })
        }
      },
    }), 'dsh-video-studio: comfyui route')
  })
}
