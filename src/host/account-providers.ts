// 账号 → 供应商实例映射（host 侧运行时接线）：把保险库里的凭证按供应商构造真实 Provider。
// 凭证约定：单字段用明文串；多字段用 JSON 串（如 wanx 的 cookieStr+xsrfToken+wanUid）。
// 与 src/selfaudit/matrix.ts 的供应商 id 一一对应（测试交叉校验）。

import type { Provider } from '../provider.ts'
import type { QuotaAccount } from '../quota/scheduler.ts'
import { createMockProvider } from '../providers/mock.ts'
import { createJimengProvider } from '../providers/jimeng.ts'
import { createTongyiWanxProvider } from '../providers/tongyi-wanx.ts'
import { createKlingProvider } from '../providers/kling.ts'
import { createKlingLipsyncProvider } from '../providers/kling-lipsync.ts'
import { createKlingDashScopeProvider } from '../providers/kling-dashscope.ts'
import { createDashScopeWanProvider } from '../providers/dashscope-wan.ts'
import { createDoubaoProvider } from '../providers/doubao.ts'
import { createDoubaoWebProvider } from '../providers/doubao-web.ts'
import { createComfyUIProvider } from '../providers/comfyui.ts'
import { createSessionIdProvider } from '../providers/sessionid-http.ts'

export type ParsedCredential = string | Record<string, unknown>

/** 明文 → 字符串；JSON 串 → 对象；非法 JSON → 报错（凭据错误要在边界处失败得早）。 */
export function parseCredential(credential: string): ParsedCredential {
  const t = credential.trim()
  if (!t.startsWith('{')) return t
  try {
    const parsed = JSON.parse(t) as unknown
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw new Error('JSON 凭证必须是对象')
    return parsed as Record<string, unknown>
  } catch (e) {
    throw new Error(`凭证以 { 开头但不是合法 JSON 对象: ${e instanceof Error ? e.message : e}`)
  }
}

function str(v: unknown, what: string): string {
  if (typeof v !== 'string' || !v) throw new Error(`${what} 缺失或非字符串`)
  return v
}

function field(obj: ParsedCredential, key: string): string {
  if (typeof obj !== 'object') throw new Error(`供应商需要 JSON 凭证（含 ${key}），当前是明文串`)
  return str(obj[key], key)
}

export function providerForAccount(account: QuotaAccount): Provider {
  const c = parseCredential(account.credential ?? '')
  switch (account.provider) {
    case 'mock':
      return createMockProvider()
    case 'jimeng':
      return createJimengProvider({ sessionId: typeof c === 'string' ? str(c, 'sessionId') : field(c, 'sessionId') })
    case 'tongyi-wanx':
      return createTongyiWanxProvider({
        cookieStr: field(c, 'cookieStr'),
        xsrfToken: field(c, 'xsrfToken'),
        wanUid: field(c, 'wanUid'),
        ...(typeof c === 'object' && typeof c.bxUa === 'string' ? { bxUa: c.bxUa } : {}),
        ...(typeof c === 'object' && typeof c.bxUmidToken === 'string' ? { bxUmidToken: c.bxUmidToken } : {}),
      })
    case 'kling':
      return createKlingProvider({ apiKey: typeof c === 'string' ? str(c, 'apiKey') : field(c, 'apiKey') })
    case 'kling-dashscope':
      return createKlingDashScopeProvider({ apiKey: typeof c === 'string' ? str(c, 'apiKey') : field(c, 'apiKey') })
    case 'dashscope-wan':
      return createDashScopeWanProvider({ apiKey: typeof c === 'string' ? str(c, 'apiKey') : field(c, 'apiKey') })
    case 'kling-lipsync':
      return createKlingLipsyncProvider({ apiKey: typeof c === 'string' ? str(c, 'apiKey') : field(c, 'apiKey') })
    case 'doubao':
      return createDoubaoProvider({ apiKey: typeof c === 'string' ? str(c, 'apiKey') : field(c, 'apiKey') })
    case 'doubao-web':
      return createDoubaoWebProvider({
        cookieStr: field(c, 'cookieStr'),
        ...(typeof c === 'object' && typeof c.msToken === 'string' ? { msToken: c.msToken } : {}),
        ...(typeof c === 'object' && typeof c.deviceId === 'string' ? { deviceId: c.deviceId } : {}),
        ...(typeof c === 'object' && typeof c.fp === 'string' ? { fp: c.fp } : {}),
        ...(typeof c === 'object' && typeof c.aBogus === 'string' ? { aBogus: c.aBogus } : {}),
      })
    case 'comfyui': {
      const baseUrl = typeof c === 'string' ? c : typeof c === 'object' && typeof c.baseUrl === 'string' ? c.baseUrl : null
      if (!baseUrl) throw new Error('comfyui: 凭证需为 baseUrl 明文或 {"baseUrl":"http://127.0.0.1:8188"}')
      return createComfyUIProvider({ baseUrl })
    }
    case 'sessionid-http':
      return createSessionIdProvider({ preset: field(c, 'preset'), sessionId: field(c, 'sessionId') })
    default:
      throw new Error(`未知供应商: ${account.provider}`)
  }
}
