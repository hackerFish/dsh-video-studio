// Multi-account free-quota scheduler (pure logic).
export interface QuotaAccount {
  id: string
  provider: string
  credential?: string
  dailyQuota?: number
  usedToday?: number
  qualityTier?: number
  lastUsedAt?: number
}

export interface PickResult {
  account: QuotaAccount | null
  reason: 'ok' | 'no-quota'
  accounts: QuotaAccount[]
}

export function pickAccount(accounts: QuotaAccount[], opts: { preferCost?: boolean; now?: number } = {}): PickResult {
  const now = opts.now ?? Date.now()
  const fresh = accounts.map((a) => ({ ...a }))
  const today = new Date(now).toISOString().slice(0, 10)
  for (const a of fresh) {
    const lastDay = a.lastUsedAt ? new Date(a.lastUsedAt).toISOString().slice(0, 10) : null
    if (lastDay && lastDay !== today) a.usedToday = 0
  }
  const candidates = fresh.filter((a) => (a.usedToday ?? 0) < (a.dailyQuota ?? Infinity))
  if (!candidates.length) return { account: null, reason: 'no-quota', accounts: fresh }
  candidates.sort((a, b) =>
    (opts.preferCost ?? false)
      ? (a.qualityTier ?? 5) - (b.qualityTier ?? 5)
      : (b.qualityTier ?? 5) - (a.qualityTier ?? 5))
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
}

export function dailyReport(accounts: QuotaAccount[]): DailyReportRow[] {
  return accounts.map((a) => ({
    id: a.id,
    provider: a.provider,
    used: a.usedToday ?? 0,
    quota: a.dailyQuota ?? Infinity,
    remain: Math.max(0, (a.dailyQuota ?? Infinity) - (a.usedToday ?? 0)),
  }))
}
