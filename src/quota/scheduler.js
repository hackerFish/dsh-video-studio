// 多账号免费额度调度器（纯逻辑，可单测）
// 账号: {id, provider, credential, dailyQuota, usedToday, qualityTier, lastUsedAt}
export function pickAccount(accounts, { needCapabilities = null, preferCost = false, now = Date.now() } = {}) {
  const fresh = accounts.map((a) => ({ ...a }))
  // 重置跨天配额（按 lastUsedAt 日期简化处理）
  const today = new Date(now).toISOString().slice(0, 10)
  for (const a of fresh) {
    const lastDay = a.lastUsedAt ? new Date(a.lastUsedAt).toISOString().slice(0, 10) : null
    if (lastDay && lastDay !== today) a.usedToday = 0
  }
  const candidates = fresh.filter((a) => (a.usedToday ?? 0) < (a.dailyQuota ?? Infinity))
  if (!candidates.length) return { account: null, reason: 'no-quota', accounts: fresh }
  candidates.sort((a, b) => {
    if (preferCost) return (a.qualityTier ?? 5) - (b.qualityTier ?? 5)
    return (b.qualityTier ?? 5) - (a.qualityTier ?? 5)
  })
  return { account: candidates[0], reason: 'ok', accounts: fresh }
}

export function recordUsage(account, amount = 1, now = Date.now()) {
  return { ...account, usedToday: (account.usedToday ?? 0) + amount, lastUsedAt: now }
}

export function dailyReport(accounts) {
  return accounts.map((a) => ({
    id: a.id, provider: a.provider,
    used: a.usedToday ?? 0, quota: a.dailyQuota ?? Infinity,
    remain: Math.max(0, (a.dailyQuota ?? Infinity) - (a.usedToday ?? 0)),
  }))
}
