// Host-side credential vault: one JSON file, 0600 perms, atomic writes, never logs secrets.
// Stored under ~/.whale/whale.json. The vault owns credentials; the quota pool owns
// usage/health state (persisted alongside, credentials merged by account id on load).

import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import type { QuotaAccount } from '../quota/scheduler.ts'

export const PROVIDER_IDS = [
  'mock', 'jimeng', 'tongyi-wanx', 'kling', 'kling-dashscope', 'kling-lipsync', 'doubao', 'doubao-web', 'dashscope-wan', 'comfyui', 'sessionid-http',
] as const

export type ProviderId = (typeof PROVIDER_IDS)[number]

export interface StoredAccount {
  id: string
  provider: string
  credential: string
  dailyQuota?: number
  qualityTier?: number
  note?: string
  addedAt: string
}

export interface MaskedAccount {
  id: string
  provider: string
  credentialHint: string
  dailyQuota?: number
  qualityTier?: number
  note?: string
  addedAt: string
}

/** Pool state kept across restarts: usage/health only, credential re-attached from vault. */
export interface PoolStateRow {
  id: string
  usedToday?: number
  lastUsedAt?: number
  health?: { consecutiveFailures: number; cooldownUntil: number | null; lastError?: string }
  disabled?: boolean
}

interface VaultFile {
  version: 1
  accounts: StoredAccount[]
  poolState: PoolStateRow[]
}

export function maskCredential(credential: string): string {
  if (!credential) return ''
  if (credential.length <= 6) return '••••'
  return credential.slice(0, 3) + '••••' + credential.slice(-3)
}

const ID_RE = /^[a-z0-9_-]{1,48}$/

export function sanitizeAccountId(id: string): string | null {
  return ID_RE.test(id) ? id : null
}

export function makeAccountId(now = Date.now()): string {
  return `acc-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export interface AddAccountInput {
  provider: string
  credential: string
  dailyQuota?: number
  qualityTier?: number
  note?: string
  id?: string
}

export class CredentialStore {
  readonly file: string
  private data: VaultFile

  private constructor(file: string, data: VaultFile) {
    this.file = file
    this.data = data
  }

  /** Load an existing vault or create an empty one (dir 0700, file 0600).
   *  Default dir follows DSH_HOME (so lab profiles stay isolated) then ~/.whale. */
  static open(dir?: string, name = 'whale.json'): CredentialStore {
    const defaultDir = process.env.DSH_HOME ? join(process.env.DSH_HOME, '.whale') : join(homedir(), '.whale')
    const file = join(dir ?? defaultDir, name)
    if (existsSync(file)) {
      try {
        const parsed = JSON.parse(readFileSync(file, 'utf8')) as Partial<VaultFile>
        if (!Array.isArray(parsed.accounts)) throw new Error('whale.json 缺 accounts 数组')
        return new CredentialStore(file, {
          version: 1,
          accounts: parsed.accounts,
          poolState: Array.isArray(parsed.poolState) ? parsed.poolState : [],
        })
      } catch (e) {
        throw new Error(`whale.json 读取失败: ${e instanceof Error ? e.message : e}`)
      }
    }
    const dirPath = dirname(file)
    mkdirSync(dirPath, { recursive: true, mode: 0o700 })
    try { chmodSync(dirPath, 0o700) } catch { /* non-posix */ }
    const store = new CredentialStore(file, { version: 1, accounts: [], poolState: [] })
    store.persist()
    return store
  }

  /** Masked list for UI/logs — credentials never leave as plaintext here. */
  list(): MaskedAccount[] {
    return this.data.accounts.map((a) => ({
      id: a.id,
      provider: a.provider,
      credentialHint: maskCredential(a.credential),
      dailyQuota: a.dailyQuota,
      qualityTier: a.qualityTier,
      note: a.note,
      addedAt: a.addedAt,
    }))
  }

  /** Full record incl. plaintext credential — only for host-side provider binding. */
  get(id: string): StoredAccount | null {
    return this.data.accounts.find((a) => a.id === id) ?? null
  }

  add(input: AddAccountInput): StoredAccount {
    if (!PROVIDER_IDS.includes(input.provider as ProviderId)) {
      throw new Error(`未知供应商: ${input.provider}（可选 ${PROVIDER_IDS.join('/')}）`)
    }
    if (!input.credential || typeof input.credential !== 'string' || input.credential.length > 4096) {
      throw new Error('凭证不能为空且长度 ≤ 4096')
    }
    if (this.data.accounts.length >= 100) throw new Error('账号数量已达上限 100')
    const id = input.id ? sanitizeAccountId(input.id) : makeAccountId()
    if (!id) throw new Error(`账号 id 不合法: ${input.id}（仅 a-z0-9_-，≤48）`)
    if (this.data.accounts.some((a) => a.id === id)) throw new Error(`账号 id 已存在: ${id}`)
    if (input.dailyQuota !== undefined && (!Number.isFinite(input.dailyQuota) || input.dailyQuota <= 0)) {
      throw new Error('dailyQuota 必须是正数')
    }
    if (input.qualityTier !== undefined && (input.qualityTier < 0 || input.qualityTier > 10)) {
      throw new Error('qualityTier 必须在 0-10')
    }
    const account: StoredAccount = {
      id,
      provider: input.provider,
      credential: input.credential,
      dailyQuota: input.dailyQuota,
      qualityTier: input.qualityTier,
      note: input.note,
      addedAt: new Date().toISOString(),
    }
    this.data.accounts.push(account)
    this.persist()
    return account
  }

  remove(id: string): boolean {
    const before = this.data.accounts.length
    this.data.accounts = this.data.accounts.filter((a) => a.id !== id)
    this.data.poolState = this.data.poolState.filter((r) => r.id !== id)
    if (this.data.accounts.length === before) return false
    this.persist()
    return true
  }

  setQuota(id: string, dailyQuota: number): StoredAccount | null {
    if (!Number.isFinite(dailyQuota) || dailyQuota <= 0) throw new Error('dailyQuota 必须是正数')
    const account = this.data.accounts.find((a) => a.id === id)
    if (!account) return null
    account.dailyQuota = dailyQuota
    this.persist()
    return account
  }

  /** Pool rows with credential attached by id — ready for AccountPool construction. */
  loadPool(): QuotaAccount[] {
    const byId = new Map(this.data.accounts.map((a) => [a.id, a]))
    return this.data.poolState
      .map((r) => {
        const stored = byId.get(r.id)
        if (!stored) return null
        const account: QuotaAccount = {
          id: r.id,
          provider: stored.provider,
          credential: stored.credential,
          dailyQuota: stored.dailyQuota,
          qualityTier: stored.qualityTier,
          usedToday: r.usedToday,
          lastUsedAt: r.lastUsedAt,
          health: r.health,
          disabled: r.disabled,
        }
        return account
      })
      .filter((a): a is QuotaAccount => a !== null)
  }

  /** Persist pool snapshot (usage/health only; credentials stay in the vault section). */
  savePool(accounts: QuotaAccount[]): void {
    this.data.poolState = accounts.map((a) => ({
      id: a.id,
      usedToday: a.usedToday,
      lastUsedAt: a.lastUsedAt,
      health: a.health,
      disabled: a.disabled,
    }))
    this.persist()
  }

  private persist(): void {
    const tmp = `${this.file}.tmp-${process.pid}`
    mkdirSync(dirname(this.file), { recursive: true })
    writeFileSync(tmp, JSON.stringify(this.data, null, 2) + '\n', { mode: 0o600 })
    try { chmodSync(tmp, 0o600) } catch { /* non-posix */ }
    renameSync(tmp, this.file)
    try { chmodSync(this.file, 0o600) } catch { /* non-posix */ }
  }

  /** Emergency reset (tests/admin): wipe the vault file on disk. */
  destroy(): void {
    rmSync(this.file, { force: true })
  }
}
