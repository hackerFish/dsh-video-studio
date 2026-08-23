// Whale host entry. Same convention as official dsh-global-rules:
// export const name + export function apply(ctx) + webServer route + model tool registration.
// NOTE: ctx is typed loosely on purpose — DSH runtime types are provided by the profile at load time.
import { registerTools } from './tools.ts'
import { listRuns, getRun, createRun, appendEvent, finishRun } from './runs.ts'
import { maskCredential } from '../accounts/store.ts'
import { providerIds } from '../selfaudit/matrix.ts'
import { runtimeVault, runtimePool, invalidatePool, persistPool } from './runtime.ts'
import { optimizePrompt } from '../prompts/optimizer.ts'
import { applyTemplate, listTemplates } from '../prompts/templates.ts'
import { providerForAccount } from './account-providers.ts'
import type { ProviderStatus } from '../provider.ts'
import { buildStoryboard } from './storyboard.ts'
import { buildImageWorkflow } from '../director/workflow-builder.ts'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

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
      path: '/dsh-video-studio/prompt-optimize',
      handler: async (request: any, response: any) => {
        if (request.method !== 'POST') { response.writeHead(405, { allow: 'POST' }); response.end(); return }
        try {
          const body = tryJson(await readBody(request)) ?? {}
          let draft = String(body.prompt ?? '')
          if (!draft.trim()) { sendJson(response, 400, { ok: false, error: '缺少 prompt' }); return }
          if (body.template) draft = applyTemplate(String(body.template), {
            description: draft, style: body.style ? String(body.style) : undefined, aspectRatio: body.aspectRatio ? String(body.aspectRatio) : undefined,
          })
          const r = optimizePrompt(draft, { style: body.style ? String(body.style) : undefined, aspectRatio: body.aspectRatio ? String(body.aspectRatio) : undefined })
          sendJson(response, 200, { ok: true, optimized: r.optimized, appliedBoosters: r.appliedBoosters, negative: r.negative, templates: listTemplates() })
        } catch (e) {
          sendJson(response, 400, { ok: false, error: e instanceof Error ? e.message : String(e) })
        }
      },
    }), 'dsh-video-studio: prompt-optimize route')
    host.effect(() => host.webServer.register({
      kind: 'exact',
      path: '/dsh-video-studio/storyboard',
      handler: async (request: any, response: any) => {
        if (request.method !== 'POST') { response.writeHead(405, { allow: 'POST' }); response.end(); return }
        try {
          const body = tryJson(await readBody(request)) ?? {}
          if (!String(body.outline ?? '').trim() && !String(body.charactersText ?? '').trim()) {
            sendJson(response, 400, { ok: false, error: '大纲或角色至少填一项' })
            return
          }
          const plan = buildStoryboard({
            outline: String(body.outline ?? ''),
            charactersText: String(body.charactersText ?? ''),
            style: body.style ? String(body.style) : undefined,
            aspectRatio: body.aspectRatio ? String(body.aspectRatio) : undefined,
            durationSec: body.durationSec ? Number(body.durationSec) : undefined,
          })
          sendJson(response, 200, { ok: true, ...plan })
        } catch (e) {
          sendJson(response, 400, { ok: false, error: e instanceof Error ? e.message : String(e) })
        }
      },
    }), 'dsh-video-studio: storyboard route')
    host.effect(() => host.webServer.register({
      kind: 'exact',
      path: '/dsh-video-studio/generate',
      handler: async (request: any, response: any) => {
        if (request.method !== 'POST') { response.writeHead(405, { allow: 'POST' }); response.end(); return }
        try {
          const body = tryJson(await readBody(request)) ?? {}
          const prompt = String(body.prompt ?? '').trim()
          if (!prompt) { sendJson(response, 400, { ok: false, error: '缺少 prompt' }); return }
          const pool = runtimePool()
          const picked = body.engine ? pool.pick(String(body.engine)) : pool.pick()
          const account = picked.account
          if (!account || picked.reason !== 'ok') {
            sendJson(response, 200, { ok: false, status: 'no-account', message: `引擎不可用（${picked.reason}）：到「鲸影账号」确认额度 > 0 且未冷却` })
            return
          }
          if ((account.dailyQuota ?? Infinity) <= 0) {
            sendJson(response, 200, { ok: false, status: 'quota-paused', message: `${account.provider} 额度为 0（暂停调度）——到「鲸影账号」开启额度并确认预算` })
            return
          }
          const p = providerForAccount(account)
          const run = createRun({ prompt, provider: account.provider })
          appendEvent(run.id, 'story', 'prompt', prompt)
          appendEvent(run.id, 'storyboard', 'single-shot', { aspectRatio: body.aspectRatio ?? '16:9' })
          const spec: Record<string, unknown> = { positive: prompt, aspectRatio: body.aspectRatio ?? '16:9' }
          if (body.durationSec) spec.durationSec = Number(body.durationSec)
          try {
            const { jobId } = await p.submit('video', spec)
            pool.charge(account.id)
            appendEvent(run.id, 'shot-assets', 'submitted', { jobId, provider: p.id })
            let st: ProviderStatus = { state: 'running', progress: null }
            const deadline = Date.now() + 120000
            while (Date.now() < deadline) {
              await new Promise((r) => setTimeout(r, 5000))
              st = await p.status(jobId)
              appendEvent(run.id, 'video', 'polling', { state: st.state })
              if (st.state === 'done' || st.state === 'failed') break
            }
            if (st.state === 'done') {
              const out = await p.fetch(jobId)
              const url = out.outputs[0]
              pool.recordSuccess(account.id)
              appendEvent(run.id, 'final-cut', 'done', { url })
              finishRun(run.id, 'done')
              persistPool()
              sendJson(response, 200, { ok: true, status: 'done', url, engine: p.id, account: account.id })
              return
            }
            if (st.state === 'failed') {
              pool.recordFailure(account.id, st.error)
              finishRun(run.id, 'failed')
              persistPool()
              sendJson(response, 200, { ok: false, status: 'failed', error: st.error ?? '生成失败', engine: p.id })
              return
            }
            finishRun(run.id, 'failed')
            sendJson(response, 200, { ok: false, status: 'timeout', error: '生成超时（120s）' })
          } catch (e) {
            pool.recordFailure(account.id, e instanceof Error ? e.message : String(e))
            finishRun(run.id, 'failed')
            persistPool()
            sendJson(response, 200, { ok: false, status: 'error', error: String(e instanceof Error ? e.message : e).slice(0, 300) })
          }
        } catch (e) {
          sendJson(response, 400, { ok: false, error: e instanceof Error ? e.message : String(e) })
        }
      },
    }), 'dsh-video-studio: generate route')
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
    host.effect(() => host.webServer.register({
      kind: 'exact',
      path: '/dsh-video-studio/comfyui/nodes',
      handler: async (_request: any, response: any) => {
        // 代理 ComfyUI /object_info：节点类型库 + checkpoint 列表（供画布侧栏渲染，绕开跨域）
        try {
          const accounts = vault().list()
          const cfg = accounts.find((a) => a.provider === 'comfyui')
          const full = cfg ? vault().get(cfg.id) : null
          const raw = full?.credential ?? 'http://127.0.0.1:8188'
          const base = raw.startsWith('{') ? (JSON.parse(raw) as { baseUrl?: string }).baseUrl ?? 'http://127.0.0.1:8188' : raw
          const oi = await (await fetch(`${base}/object_info`, { signal: AbortSignal.timeout(30000) })).json() as Record<string, any>
          const pick = (node: any, key: string): string[] => {
            const v = node?.input?.required?.[key]
            return Array.isArray(v) && Array.isArray(v[0]) ? v[0].filter((x: unknown) => typeof x === 'string') : []
          }
          const ckpt = oi.CheckpointLoaderSimple ? pick(oi.CheckpointLoaderSimple, 'ckpt_name') : []
          const types = Object.keys(oi)
            .filter((k) => oi[k]?.input?.required)
            .slice(0, 200)
          sendJson(response, 200, { ok: true, base, checkpoints: ckpt, nodeTypes: types })
        } catch (e) {
          sendJson(response, 200, { ok: false, error: String(e instanceof Error ? e.message : e) })
        }
      },
    }), 'dsh-video-studio: comfyui nodes route')
    host.effect(() => host.webServer.register({
      kind: 'exact',
      path: '/dsh-video-studio/comfyui/queue',
      handler: async (_request: any, response: any) => {
        // 代理 /queue：运行中/等待队列（画布侧栏实时面板）
        try {
          const accounts = vault().list()
          const cfg = accounts.find((a) => a.provider === 'comfyui')
          const full = cfg ? vault().get(cfg.id) : null
          const raw = full?.credential ?? 'http://127.0.0.1:8188'
          const base = raw.startsWith('{') ? (JSON.parse(raw) as { baseUrl?: string }).baseUrl ?? 'http://127.0.0.1:8188' : raw
          const q = await (await fetch(`${base}/queue`, { signal: AbortSignal.timeout(10000) })).json() as { queue_running?: unknown[][]; queue_pending?: unknown[][] }
          sendJson(response, 200, {
            ok: true, running: (q.queue_running ?? []).map((x) => String(x[1] ?? '').slice(0, 8)),
            pending: (q.queue_pending ?? []).map((x) => String(x[1] ?? '').slice(0, 8)),
          })
        } catch (e) {
          sendJson(response, 200, { ok: false, error: String(e instanceof Error ? e.message : e) })
        }
      },
    }), 'dsh-video-studio: comfyui queue route')
    host.effect(() => host.webServer.register({
      kind: 'exact',
      path: '/dsh-video-studio/comfyui/import',
      handler: async (request: any, response: any) => {
        // 把工作流 JSON 写入 ComfyUI 的 workflows 目录 → ComfyUI 界面「工作流」里实时可见可加载
        try {
          const body = tryJson(await readBody(request)) ?? {}
          const wf = body.workflow ?? body
          const name = String(body.name ?? 'whale-' + Date.now())
          if (!wf || typeof wf !== 'object') { sendJson(response, 400, { ok: false, error: '缺少 workflow' }); return }
          const dirs = [process.env.DSH_COMFYUI_WORKFLOWS_DIR, 'D:/CY/comfyUI/opc/workflows', 'D:/CY/ComfyUI/opc/workflows'].filter(Boolean) as string[]
          let dir = dirs.find((d) => existsSync(d))
          if (!dir) { sendJson(response, 200, { ok: false, error: '未找到 ComfyUI workflows 目录（可设 DSH_COMFYUI_WORKFLOWS_DIR）' }); return }
          const { mkdirSync, writeFileSync } = await import('node:fs')
          mkdirSync(dir, { recursive: true })
          const file = join(dir, `${name}.json`)
          writeFileSync(file, JSON.stringify(wf, null, 2))
          sendJson(response, 200, { ok: true, path: file, hint: '已写入 ComfyUI 工作流目录，打开 ComfyUI 界面 → 工作流 即可看到并可加载编辑' })
        } catch (e) {
          sendJson(response, 400, { ok: false, error: e instanceof Error ? e.message : String(e) })
        }
      },
    }), 'dsh-video-studio: comfyui import route')
    host.effect(() => host.webServer.register({
      kind: 'exact',
      path: '/dsh-video-studio/comfyui/run',
      handler: async (request: any, response: any) => {
        // 提交工作流到 ComfyUI /prompt → 轮询 /history → 回结果图（ComfyUI 界面会实时显示队列与预览）
        try {
          const body = tryJson(await readBody(request)) ?? {}
          // 两种入参：{workflow} 直接提交；{prompt, checkpoint} 由宿主用 buildImageWorkflow 组装后提交
          let wf = body.workflow ?? null
          if (!wf && body.prompt) {
            wf = buildImageWorkflow({
              positive: String(body.prompt), checkpoint: body.checkpoint ? String(body.checkpoint) : undefined,
              width: body.width ? Number(body.width) : 768, height: body.height ? Number(body.height) : 768,
              steps: body.steps ? Number(body.steps) : 25, shotId: 'whale-' + Date.now(),
            })
          }
          if (!wf || typeof wf !== 'object') { sendJson(response, 400, { ok: false, error: '缺少 workflow 或 prompt' }); return }
          const accounts = vault().list()
          const cfg = accounts.find((a) => a.provider === 'comfyui')
          const full = cfg ? vault().get(cfg.id) : null
          const raw = full?.credential ?? 'http://127.0.0.1:8188'
          const base = raw.startsWith('{') ? (JSON.parse(raw) as { baseUrl?: string }).baseUrl ?? 'http://127.0.0.1:8188' : raw
          const r = await fetch(`${base}/prompt`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: wf, client_id: 'whale-' + Date.now() }),
            signal: AbortSignal.timeout(30000),
          })
          const j = await r.json().catch(() => ({})) as { prompt_id?: string; error?: unknown }
          if (!r.ok || !j.prompt_id) {
            sendJson(response, 200, { ok: false, status: 'submit-error', error: JSON.stringify(j.error ?? (await r.text()).slice(0, 200)) })
            return
          }
          const pid = j.prompt_id
          const deadline = Date.now() + 180000
          let url: string | null = null
          while (Date.now() < deadline) {
            await new Promise((res) => setTimeout(res, 3000))
            try {
              const h = await (await fetch(`${base}/history/${pid}`, { signal: AbortSignal.timeout(10000) })).json() as Record<string, any>
              const entry = h[pid]
              if (entry?.status?.status_str === 'error') {
                sendJson(response, 200, { ok: false, status: 'failed', error: JSON.stringify(entry.status?.messages ?? '生成错误') })
                return
              }
              for (const outputs of Object.values(entry?.outputs ?? {})) {
                const list = Array.isArray(outputs) ? outputs : Object.values(outputs ?? {})
                for (const o of list.flat()) {
                  const item = o as { filename?: string; subfolder?: string; type?: string } | null
                  if (item?.filename) { url = `${base}/view?filename=${encodeURIComponent(item.filename)}&subfolder=${item.subfolder ?? ''}&type=${item.type ?? 'output'}` }
                }
              }
              if (url) break
            } catch { /* 继续轮询 */ }
          }
          sendJson(response, 200, url ? { ok: true, url, promptId: pid, hint: 'ComfyUI 界面队列/历史中可见本任务' } : { ok: false, status: 'timeout', error: '3 分钟未完成（无模型时会卡在此，请先装 checkpoint）' })
        } catch (e) {
          sendJson(response, 400, { ok: false, error: e instanceof Error ? e.message : String(e) })
        }
      },
    }), 'dsh-video-studio: comfyui run route')
  })
}
