import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseCredential, providerForAccount } from '../src/host/account-providers.ts'
import { PROVIDER_MATRIX } from '../src/selfaudit/matrix.ts'
import type { QuotaAccount } from '../src/quota/scheduler.ts'

const acc = (provider: string, credential: string): QuotaAccount => ({ id: 'a', provider, credential })

test('parseCredential：明文与 JSON 对象两种形态', () => {
  assert.equal(parseCredential('b4db1094'), 'b4db1094')
  assert.deepEqual(parseCredential('{"cookieStr":"c","xsrfToken":"x","wanUid":"u"}'), { cookieStr: 'c', xsrfToken: 'x', wanUid: 'u' })
  assert.throws(() => parseCredential('{bad json'), /不是合法 JSON/)
  // 非 { 开头一律当明文（含数组形态），解析权交给具体工厂
  assert.equal(parseCredential('[1,2]'), '[1,2]')
})

test('明文串型凭证：jimeng/kling/dashscope/doubao 各构造对应 Provider', () => {
  assert.equal(providerForAccount(acc('jimeng', 'sess-1')).id, 'jimeng')
  assert.equal(providerForAccount(acc('kling', 'ak:sk')).id, 'kling')
  assert.equal(providerForAccount(acc('kling-dashscope', 'sk-dash')).id, 'kling-dashscope')
  assert.equal(providerForAccount(acc('dashscope-wan', 'sk-dash')).id, 'dashscope-wan')
  assert.equal(providerForAccount(acc('kling-lipsync', 'ak:sk')).id, 'kling-lipsync')
  assert.equal(providerForAccount(acc('doubao', 'sk-ark')).id, 'doubao')
  assert.equal(providerForAccount(acc('mock', '')).id, 'mock')
})

test('JSON 型凭证：wanx 三件套 / doubao-web / comfyui / sessionid', () => {
  const wanx = providerForAccount(acc('tongyi-wanx', '{"cookieStr":"c","xsrfToken":"x","wanUid":"u"}'))
  assert.equal(wanx.id, 'tongyi-wanx')
  const web = providerForAccount(acc('doubao-web', '{"cookieStr":"c","msToken":"m"}'))
  assert.equal(web.id, 'doubao-web')
  const comfy = providerForAccount(acc('comfyui', '{"baseUrl":"http://127.0.0.1:8188"}'))
  assert.equal(comfy.id, 'comfyui')
  assert.equal(providerForAccount(acc('comfyui', 'http://127.0.0.1:8188')).id, 'comfyui')
  const sid = providerForAccount(acc('sessionid-http', '{"preset":"kling","sessionId":"s"}'))
  assert.equal(sid.id, 'sessionid-kling')
})

test('缺字段/缺凭证/未知供应商：在边界处尽早报错', () => {
  assert.throws(() => providerForAccount(acc('jimeng', '')), /sessionId/)
  assert.throws(() => providerForAccount(acc('tongyi-wanx', '{"cookieStr":"c"}')), /xsrfToken/)
  assert.throws(() => providerForAccount(acc('tongyi-wanx', 'plain')), /JSON 凭证/)
  assert.throws(() => providerForAccount(acc('doubao-web', '{"msToken":"m"}')), /cookieStr/)
  assert.throws(() => providerForAccount(acc('kling', '')), /apiKey 缺失/)
  assert.throws(() => providerForAccount(acc('kling', 'not-a-pair')), /可灵 key 格式/)
  assert.throws(() => providerForAccount(acc('openai', 'x')), /未知供应商/)
})

test('矩阵里每个供应商都有账号工厂路径', () => {
  const credByProvider: Record<string, string> = {
    mock: '',
    kling: 'ak:sk',
    'kling-lipsync': 'ak:sk',
    'tongyi-wanx': '{"cookieStr":"c","xsrfToken":"x","wanUid":"u"}',
    'doubao-web': '{"cookieStr":"c"}',
    comfyui: '{"baseUrl":"http://127.0.0.1:8188"}',
    'sessionid-http': '{"preset":"jimeng","sessionId":"s"}',
  }
  for (const row of PROVIDER_MATRIX) {
    assert.doesNotThrow(() => providerForAccount(acc(row.id, credByProvider[row.id] ?? 'x')), `${row.id} 无工厂`)
  }
})
