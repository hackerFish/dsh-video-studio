// Whale host entry. Same convention as official dsh-global-rules:
// export const name + export function apply(ctx) + webServer route + model tool registration.
// NOTE: ctx is typed loosely on purpose — DSH runtime types are provided by the profile at load time.
import { registerTools } from './tools.ts'
import { listRuns, getRun } from './runs.ts'
import { CredentialStore, maskCredential } from '../accounts/store.ts'
import { providerIds } from '../selfaudit/matrix.ts'

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
    // Lazy vault: first account API hit opens ~/.whale/whale.json (boot stays failure-free).
    let store: CredentialStore | null = null
    const vault = (): CredentialStore => {
      if (!store) store = CredentialStore.open()
      return store
    }
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
          stages: ['story', 'script', 'storyboard', 'master-asset', 'shot-assets', 'video', 'final-cut'],
          providers: providerIds(),
          quotaAccounts: store ? store.list().length : 0,
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
            const { credential: _secret, ...masked } = account
            void _secret
            sendJson(response, 200, { ok: true, account: { ...masked, credentialHint: maskCredential(account.credential) } })
            return
          }
          if (request.method === 'DELETE') {
            const id = url.searchParams.get('id') ?? ''
            sendJson(response, 200, { ok: vault().remove(id), id })
            return
          }
          response.writeHead(405, { allow: 'GET, POST, DELETE' })
          response.end()
        } catch (e) {
          sendJson(response, 400, { ok: false, error: e instanceof Error ? e.message : String(e) })
        }
      },
    }), 'dsh-video-studio: accounts route')
  })
}
