// Multi-account free-quota scheduler (pure logic).
// One provider can own many accounts (jimeng sessionid xN, doubao cookies xN ...).
// The pool spreads usage with LRU rotation, applies daily quota budgets, and
// backstops failures with exponential cooldown so a dead account stops getting picked.

export interface AccountHealth {
  consecutiveFailures: number
  cooldownUntil: number | null
  lastError?: string
}

export interface QuotaAccount {
  id: string
  provider: string
  credential?: string
  dailyQuota?: number
  usedToday?: number
  qualityTier?: number
  lastUsedAt?: number
  health?: AccountHealth
  disabled?: boolean
}

export type PickReason = 'ok' | 'no-quota' | 'cooldown' | 'none'

export interface PickResult {
  account: QuotaAccount | null
  reason: PickReason
  accounts: QuotaAccount[]
}

export interface PickOptions {
  preferCost?: boolean
  rotate?: boolean
  now?: number
}

function dayKey(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10)
}

function rollDay(account: QuotaAccount, now: number): QuotaAccount {
  const lastDay = account.lastUsedAt ? dayKey(account.lastUsedAt) : null
  if (lastDay && lastDay !== dayKey(now)) return { ...account, usedToday: 0 }
  return account
}

function isCooling(account: QuotaAccount, now: number): boolean {
  const until = account.health?.cooldownUntil ?? null
  return until !== null && until > now
}

function fitsQuota(account: QuotaAccount): boolean {
  return (account.usedToday ?? 0) < (account.dailyQuota ?? Infinity)
}

// Legacy entry: stateless one-shot pick, quality-first by default (kept for pipeline compat).
export function pickAccount(accounts: QuotaAccount[], opts: PickOptions = {}): PickResult {
  const now = opts.now ?? Date.now()
  const fresh = accounts.map((a) => rollDay(a, now))
  const candidates = fresh.filter((a) => !a.disabled && !isCooling(a, now) && fitsQuota(a))
  if (!candidates.length) {
    return { account: null, reason: 'no-quota', accounts: fresh }
  }
  candidates.sort((a, b) => {
    const ta = a.qualityTier ?? 5
    const tb = b.qualityTier ?? 5
    return (opts.preferCost ?? false) ? ta - tb : tb - ta
  })
  return { account: candidates[0] ?? null, reason: 'ok', accounts: fresh }
}

export function recordUsage(account: QuotaAccount, amount = 1, now = Date.now()): QuotaAccount {
  return { ...account, usedToday: (account.usedToday ?? 0) + amount, lastUsedAt: now }
}

export interface DailyReportRow {
  id: string
  provider: string
  used: number
  quota: number
  remain: number
  cooling: boolean
}

export function dailyReport(accounts: QuotaAccount[], now = Date.now()): DailyReportRow[] {
  return accounts.map((a) => ({
    id: a.id,
    provider: a.provider,
    used: a.usedToday ?? 0,
    quota: a.dailyQuota ?? Infinity,
    remain: Math.max(0, (a.dailyQuota ?? Infinity) - (a.usedToday ?? 0)),
    cooling: isCooling(a, now),
  }))
}

export interface PoolOptions extends Omit<PickOptions, 'now'> {
  /** Base cooldown after the first consecutive failure. Default 60s. */
  backoffBaseMs?: number
  /** Ceiling for exponential cooldown. Default 30min. */
  maxBackoffMs?: number
  /** Clock override for deterministic tests. */
  now?: () => number
}

// Stateful pool: owns the account list, mutates health/usage in place, snapshot() for persistence.
export class AccountPool {
  readonly backoffBaseMs: number
  readonly maxBackoffMs: number
  readonly rotate: boolean
  readonly preferCost: boolean
  private readonly nowFn: () => number
  private accounts: QuotaAccount[]

  constructor(accounts: QuotaAccount[], opts: PoolOptions = {}) {
    this.accounts = accounts.map((a) => ({ ...a, health: a.health ? { ...a.health } : undefined }))
    this.backoffBaseMs = opts.backoffBaseMs ?? 60000
    this.maxBackoffMs = opts.maxBackoffMs ?? 30 * 60000
    this.rotate = opts.rotate ?? true
    this.preferCost = opts.preferCost ?? false
    this.nowFn = opts.now ?? Date.now
  }

  get size(): number {
    return this.accounts.length
  }

  pick(provider?: string): PickResult {
    const now = this.nowFn()
    this.accounts = this.accounts.map((a) => rollDay(a, now))
    const scoped = provider ? this.accounts.filter((a) => a.provider === provider) : this.accounts
    if (!scoped.length) return { account: null, reason: 'none', accounts: this.accounts }
    const active = scoped.filter((a) => !a.disabled)
    const candidates = active.filter((a) => !isCooling(a, now) && fitsQuota(a))
    if (!candidates.length) {
      if (!active.length) return { account: null, reason: 'no-quota', accounts: this.accounts }
      const cooling = active.filter((a) => isCooling(a, now)).length
      return { account: null, reason: cooling === active.length ? 'cooldown' : 'no-quota', accounts: this.accounts }
    }
    candidates.sort((a, b) => {
      if (this.rotate) {
        const lru = (a.lastUsedAt ?? -1) - (b.lastUsedAt ?? -1)
        if (lru !== 0) return lru
        return (b.qualityTier ?? 5) - (a.qualityTier ?? 5)
      }
      const ta = a.qualityTier ?? 5
      const tb = b.qualityTier ?? 5
      const tier = this.preferCost ? ta - tb : tb - ta
      if (tier !== 0) return tier
      return (a.lastUsedAt ?? -1) - (b.lastUsedAt ?? -1)
    })
    return { account: candidates[0] ?? null, reason: 'ok', accounts: this.accounts }
  }

  /** Mark amount of quota spent on one account (day boundary resets handled inside). */
  charge(id: string, amount = 1): void {
    const now = this.nowFn()
    this.accounts = this.accounts.map((a) =>
      a.id === id ? { ...rollDay(a, now), usedToday: (a.usedToday ?? 0) + amount, lastUsedAt: now } : a)
  }

  /** A successful call clears failure history and any cooldown. */
  recordSuccess(id: string): void {
    this.accounts = this.accounts.map((a) =>
      a.id === id ? { ...a, health: { consecutiveFailures: 0, cooldownUntil: null } } : a)
  }

  /** A failed call starts/extends exponential cooldown so the pool avoids the account. */
  recordFailure(id: string, error?: string): void {
    const now = this.nowFn()
    this.accounts = this.accounts.map((a) => {
      if (a.id !== id) return a
      const n = (a.health?.consecutiveFailures ?? 0) + 1
      const delay = Math.min(this.backoffBaseMs * 2 ** (n - 1), this.maxBackoffMs)
      return { ...a, health: { consecutiveFailures: n, cooldownUntil: now + delay, lastError: error } }
    })
  }

  disable(id: string, disabled = true): void {
    this.accounts = this.accounts.map((a) => (a.id === id ? { ...a, disabled } : a))
  }

  /** Reset health (and optionally usage) for one account or the whole pool. */
  reset(id?: string, opts: { usage?: boolean } = {}): void {
    this.accounts = this.accounts.map((a) => {
      if (id && a.id !== id) return a
      const next: QuotaAccount = { ...a, health: { consecutiveFailures: 0, cooldownUntil: null } }
      if (opts.usage) next.usedToday = 0
      return next
    })
  }

  report(): DailyReportRow[] {
    return dailyReport(this.accounts, this.nowFn())
  }

  /** Deep-ish copy safe to persist as whale.json state (no live references). */
  snapshot(): QuotaAccount[] {
    return this.accounts.map((a) => ({ ...a, health: a.health ? { ...a.health } : a.health }))
  }
}
