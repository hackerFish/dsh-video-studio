// 豆包网页版扫码登录自动化：Edge 无头打开登录页 → 截取登录二维码 → 轮询登录态 → Cookie 入保险库。
// 用法: node scripts/doubao-qrlogin.mjs   （运行后把 D:\CY\豆包登录二维码.png 打开，用豆包 APP 扫码确认）
import { spawn } from 'node:child_process'
import { writeFileSync, rmSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const PORT = 9223
const QR_PATH = 'D:/CY/豆包登录二维码.png'
const PROFILE = 'D:/CY/_tools/edge-qr-profile'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function httpJson(url, opts = {}) {
  const res = await fetch(url, { ...opts, signal: AbortSignal.timeout(8000) })
  return { status: res.status, body: await res.json().catch(() => null) }
}

// ---- 启动 Edge ----
rmSync(PROFILE, { recursive: true, force: true })
mkdirSync(PROFILE, { recursive: true })
const edge = spawn(EDGE, [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`,
  '--no-first-run', '--disable-gpu', '--disable-sync', '--window-size=1400,1000', '--lang=zh-CN', 'about:blank',
], { stdio: 'ignore' })
console.log('Edge 启动中…')

// ---- 等调试端口 ----
let target = null
for (let i = 0; i < 30; i++) {
  await sleep(1000)
  const list = await httpJson(`http://127.0.0.1:${PORT}/json/list`).catch(() => null)
  if (list && Array.isArray(list.body) && list.body.length) { target = list.body.find((t) => t.type === 'page') ?? list.body[0]; break }
  if (i % 5 === 4) console.log(`  等调试端口 ${i + 1}/30`)
}
if (!target) { console.error('❌ Edge 调试端口未就绪'); edge.kill(); process.exit(1) }

// 新建一个干净页面目标直开豆包（避开 sync-confirmation 页）
const created = await httpJson(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent('https://www.doubao.com/chat/')}`, { method: 'PUT' }).catch(async () => {
  return httpJson(`http://127.0.0.1:${PORT}/json/new?url=${encodeURIComponent('https://www.doubao.com/chat/')}`).catch(() => null)
})
if (created && created.body && created.body.webSocketDebuggerUrl) target = created.body
console.log('已连接 target:', target.url)

// ---- CDP ----
const ws = new WebSocket(target.webSocketDebuggerUrl)
const wsReady = new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = () => reject(new Error('ws error')) })
await Promise.race([wsReady, sleep(15000).then(() => { throw new Error('ws 连接超时') })])
console.log('CDP 已连接')
let seq = 0
const pending = new Map()
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data)
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id) }
}
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++seq
  pending.set(id, (msg) => (msg.error ? reject(new Error(method + ': ' + JSON.stringify(msg.error))) : resolve(msg)))
  ws.send(JSON.stringify({ id, method, params }))
  setTimeout(() => { if (pending.has(id)) { pending.delete(id); reject(new Error(method + ' 超时')) } }, 20000)
})
const evalJs = async (expr) => {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
      if (r?.result?.exceptionDetails) return 'ERR:' + (r.result.exceptionDetails.text ?? 'exception')
      return r?.result?.result?.value
    } catch (e) {
      console.log(`  eval 重试 ${attempt + 1}: ${String(e).slice(0, 60)}`)
      await sleep(2000)
    }
  }
  return null
}

await send('Page.enable')
await send('Network.enable')
await send('Runtime.enable')

// ---- 打开豆包并点出扫码登录 ----
console.log('导航到 doubao.com/chat …')
await send('Page.navigate', { url: 'https://www.doubao.com/chat/' })
await sleep(10000)
const nav = await send('Page.getNavigationHistory').catch(() => null)
console.log('当前 URL:', nav?.result?.entries?.slice(-1)[0]?.url ?? '未知')
const clickByText = (src, flags, maxLen = 20) => `(() => {
  const re = new RegExp(${JSON.stringify(src)}, '${flags}')
  const nodes = [...document.querySelectorAll('div,span,button,a')]
  const hit = nodes.find((n) => re.test(n.textContent ?? '') && (n.textContent ?? '').trim().length > 0 && (n.textContent ?? '').trim().length <= ${maxLen} && n.offsetParent !== null)
  if (hit) { hit.click(); return 'clicked:' + hit.textContent.trim().slice(0, 20) }
  return 'not-found'
})()`
const clickQr = clickByText('扫码登录|扫一扫登录|扫码登錄', 'i', 12)
const clickLogin = clickByText('^登录$|立即登录|登录/注册', '', 8)

// 1) 若页面未弹登录框，先点右上角「登录」
const step1 = await evalJs(clickLogin)
console.log('登录入口:', step1)
if (step1 === 'not-found') {
  const bodyText = await evalJs('document.body.innerText.slice(0, 300)')
  console.log('页面文本预览:', JSON.stringify(bodyText?.slice(0, 200)))
}
await sleep(3000)
// 2) 登录框若在 iframe 里（sso.doubao.com），把该地址整页打开再切扫码 tab
let pageUrl = await evalJs('location.href')
const iframeSrc = await evalJs('document.querySelector("iframe[src*=\\"sso\\"], iframe[src*=\\"passport\\"]")?.src ?? ""')
console.log('登录 iframe:', iframeSrc ? iframeSrc.slice(0, 80) : '(无)')
if (iframeSrc) {
  await send('Page.navigate', { url: iframeSrc })
  await sleep(6000)
  pageUrl = await evalJs('location.href')
  console.log('已进入 sso 页:', pageUrl)
}
const tab = await evalJs(clickQr)
console.log('扫码 tab:', tab)
await sleep(3000)

// ---- 截图二维码 ----
const shot = await send('Page.captureScreenshot', { format: 'png' })
writeFileSync(QR_PATH, Buffer.from(shot.result.data, 'base64'))
console.log('✅ 二维码已保存:', QR_PATH)
console.log('   请打开该图片，用手机豆包 APP 扫码并确认登录…')

// ---- 轮询登录态（最长 10 分钟，每 2 分钟重截一次新二维码） ----
let cookies = null
const T0 = Date.now()
while (Date.now() - T0 < 10 * 60 * 1000) {
  await sleep(3000)
  const c = await send('Network.getCookies', { urls: ['https://www.doubao.com', 'https://doubao.com'] })
  const all = c?.result?.cookies ?? []
  // 真正的登录态：必须出现 sessionid / sessionid_ss 类会话 cookie（s_v_web_id/ttwid/passport_csrf 是游客态）
  const session = all.filter((x) => /^sessionid/i.test(x.name) || /sessionid_ss|sid_tt|passport_auth/i.test(x.name))
  if (session.length >= 1 && all.length >= 8) { cookies = all; break }
  if (Math.floor((Date.now() - T0) / 120000) !== Math.floor((Date.now() - 3000 - T0) / 120000)) {
    // 每 2 分钟刷新页面拿新二维码
    await send('Page.navigate', { url: 'https://www.doubao.com/chat/' })
    await sleep(6000)
    await evalJs(clickLogin)
    await sleep(2000)
    const src2 = await evalJs('document.querySelector("iframe[src*=\\"sso\\"], iframe[src*=\\"passport\\"]")?.src ?? ""')
    if (src2) await send('Page.navigate', { url: src2 })
    await sleep(5000)
    await evalJs(clickQr)
    await sleep(3000)
    const s2 = await send('Page.captureScreenshot', { format: 'png' })
    writeFileSync(QR_PATH, Buffer.from(s2.result.data, 'base64'))
    console.log('🔄 二维码已刷新，请重新扫码')
  }
}

if (!cookies) { console.error('❌ 10 分钟未登录，请稍后再试'); edge.kill(); process.exit(1) }

const cookieStr = cookies.map((x) => `${x.name}=${x.value}`).join('; ')
console.log('✅ 登录成功（含 sessionid），cookie 长度:', cookieStr.length)

// ---- 写入保险库（额度 0 = 暂停调度，仅存证） ----
process.env.DSH_HOME ??= 'D:/CY/dsh/.dsh'
const { CredentialStore } = await import('./src/accounts/store.ts')
const store = CredentialStore.open()
try { store.remove('doubao-web-main') } catch { /* 无则跳过 */ }
const acct = store.add({ provider: 'doubao-web', credential: cookieStr, dailyQuota: 0, qualityTier: 4, note: '扫码登录采集（额度 0 暂停调度）', id: 'doubao-web-main' })
console.log('vault 已登记:', acct.id, '|', acct.credentialHint)

edge.kill()
process.exit(0)
