import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, statSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { CredentialStore, maskCredential, makeAccountId } from '../src/accounts/store.ts'

const tmp = () => mkdtempSync(join(tmpdir(), 'whale-vault-'))

test('添加账号 → 列表脱敏 → get 取明文', () => {
  const dir = tmp()
  try {
    const store = CredentialStore.open(dir)
    const a = store.add({ provider: 'jimeng', credential: 'b4db1094bbd2767280d155436a339b5d', dailyQuota: 66, note: '测试号' })
    assert.match(a.id, /^acc-/)
    const list = store.list()
    assert.equal(list.length, 1)
    assert.equal(list[0]?.credentialHint, 'b4d••••b5d')
    assert.ok(!JSON.stringify(list).includes('b4db1094'))
    assert.equal(store.get(a.id)?.credential, 'b4db1094bbd2767280d155436a339b5d')
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('校验：未知供应商/空凭证/非法额度/超长凭证 全部拒绝', () => {
  const dir = tmp()
  try {
    const store = CredentialStore.open(dir)
    assert.throws(() => store.add({ provider: 'openai', credential: 'x' }), /未知供应商/)
    assert.throws(() => store.add({ provider: 'kling', credential: '' }), /不能为空/)
    assert.throws(() => store.add({ provider: 'kling', credential: 'x', dailyQuota: 0 }), /正数/)
    assert.throws(() => store.add({ provider: 'kling', credential: 'x', qualityTier: 11 }), /0-10/)
    assert.throws(() => store.add({ provider: 'kling', credential: 'x'.repeat(5000) }), /4096/)
    assert.throws(() => store.add({ provider: 'kling', credential: 'x', id: 'bad id!' }), /不合法/)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('自定义 id + 重名拒绝 + 移除', () => {
  const dir = tmp()
  try {
    const store = CredentialStore.open(dir)
    store.add({ provider: 'mock', credential: 'c1', id: 'main' })
    assert.throws(() => store.add({ provider: 'mock', credential: 'c2', id: 'main' }), /已存在/)
    store.add({ provider: 'mock', credential: 'c2', id: 'spare' })
    assert.equal(store.remove('main'), true)
    assert.equal(store.remove('main'), false)
    assert.equal(store.list().length, 1)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('持久化往返：新实例读到同一份数据，文件权限 0600', () => {
  const dir = tmp()
  try {
    const a = CredentialStore.open(dir)
    a.add({ provider: 'doubao', credential: 'cookie-value', dailyQuota: 10, id: 'db' })
    a.setQuota('db', 20)
    const b = CredentialStore.open(dir)
    assert.equal(b.get('db')?.credential, 'cookie-value')
    assert.equal(b.get('db')?.dailyQuota, 20)
    // 0 = 暂停调度（付费供应商的安全阀），负数拒绝
    a.setQuota('db', 0)
    assert.equal(a.get('db')?.dailyQuota, 0)
    assert.throws(() => a.setQuota('db', -1), />= 0/)
    if (process.platform !== 'win32') {
      // POSIX: 0600；Windows 的 chmod 无此语义，只断言文件存在
      const mode = statSync(join(dir, 'whale.json')).mode & 0o777
      assert.equal(mode, 0o600)
    } else {
      assert.equal(statSync(join(dir, 'whale.json')).isFile(), true)
    }
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('池状态存取：凭据按 id 回填，不重复落盘明文', () => {
  const dir = tmp()
  try {
    const store = CredentialStore.open(dir)
    store.add({ provider: 'jimeng', credential: 'secret-session', id: 'j1' })
    store.savePool([
      { id: 'j1', provider: 'jimeng', usedToday: 3, lastUsedAt: Date.now(), health: { consecutiveFailures: 1, cooldownUntil: Date.now() + 5000 } },
      { id: 'ghost', provider: 'jimeng', usedToday: 9 }, // 无对应账号 → 丢弃
    ])
    const pool = store.loadPool()
    assert.equal(pool.length, 1)
    assert.equal(pool[0]?.credential, 'secret-session')
    assert.equal(pool[0]?.usedToday, 3)
    assert.equal(pool[0]?.health?.consecutiveFailures, 1)
    // vault 文件里 poolState 段不得含明文凭据
    const onDisk = JSON.parse(readFileSync(join(dir, 'whale.json'), 'utf8'))
    assert.ok(!JSON.stringify(onDisk.poolState).includes('secret-session'))
    assert.equal((onDisk.accounts as unknown[]).length, 1)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('脱敏边界：短凭据全遮，空串返回空', () => {
  assert.equal(maskCredential(''), '')
  assert.equal(maskCredential('abc'), '••••')
  assert.equal(maskCredential('abcdef'), '••••')
  assert.equal(maskCredential('abcdefg'), 'abc••••efg')
})

test('DSH_HOME 优先：未显式指定目录时落在 $DSH_HOME/.whale', () => {
  const dir = tmp()
  const prev = process.env.DSH_HOME
  process.env.DSH_HOME = dir
  try {
    const store = CredentialStore.open()
    store.add({ provider: 'mock', credential: 'x1', id: 'iso' })
    assert.ok(store.file.startsWith(join(dir, '.whale')), store.file)
    assert.equal(statSync(store.file).isFile(), true)
  } finally {
    process.env.DSH_HOME = prev
    rmSync(dir, { recursive: true, force: true })
  }
})

test('新账号无状态行时以全新状态入池（UI 添加后立即可被调度）', () => {
  const dir = tmp()
  try {
    const store = CredentialStore.open(dir)
    store.add({ provider: 'jimeng', credential: 's1', id: 'fresh' })
    const pool = store.loadPool()
    assert.equal(pool.length, 1)
    assert.equal(pool[0]?.id, 'fresh')
    assert.equal(pool[0]?.credential, 's1')
    assert.equal(pool[0]?.usedToday ?? 0, 0)
    assert.equal(pool[0]?.health ?? null, null)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('makeAccountId 唯一且合法', () => {
  const seen = new Set<string>()
  for (let i = 0; i < 500; i++) {
    const id = makeAccountId()
    assert.match(id, /^acc-[a-z0-9_-]+$/)
    seen.add(id)
  }
  assert.equal(seen.size, 500)
})
