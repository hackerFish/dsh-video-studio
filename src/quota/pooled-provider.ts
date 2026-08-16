// Bridge between AccountPool and concrete Provider instances.
// One provider id can own many accounts; each account gets its own bound provider
// (credentials baked at construction), cached by account id. The pool decides who
// is healthy/affordable, this class binds credentials and folds outcomes back.

import type { Provider } from '../provider.ts'
import { AccountPool, type QuotaAccount } from './scheduler.ts'

export type ProviderFactory = (account: QuotaAccount) => Provider | Promise<Provider>

export interface AcquireResult {
  provider: Provider
  account: QuotaAccount
}

export interface SubmitResult {
  jobId: string
  account: QuotaAccount
}

export class PooledProviders {
  private readonly cache = new Map<string, Provider>()

  constructor(readonly pool: AccountPool, private readonly factories: Record<string, ProviderFactory>) {}

  get size(): number {
    return this.pool.size
  }

  /** Pick a healthy, in-budget account for this provider and return its bound provider. */
  async acquire(providerId: string): Promise<AcquireResult | null> {
    const picked = this.pool.pick(providerId)
    if (!picked.account || picked.reason !== 'ok') return null
    const cached = this.cache.get(picked.account.id)
    if (cached) return { provider: cached, account: picked.account }
    const factory = this.factories[providerId]
    if (!factory) throw new Error(`账号池缺工厂: ${providerId}（factories 无此键）`)
    const provider = await factory(picked.account)
    this.cache.set(picked.account.id, provider)
    return { provider, account: picked.account }
  }

  /** Submit through a pool-picked account: charge on success, backoff on submit failure. */
  async submit(providerId: string, stage: string, spec: Record<string, unknown>): Promise<SubmitResult> {
    const acquired = await this.acquire(providerId)
    if (!acquired) throw new Error(`账号池没有可用的 ${providerId} 账号`)
    try {
      const { jobId } = await acquired.provider.submit(stage, spec)
      this.pool.charge(acquired.account.id)
      return { jobId, account: acquired.account }
    } catch (e) {
      this.pool.recordFailure(acquired.account.id, e instanceof Error ? e.message : String(e))
      throw e
    }
  }

  /** Call after a polled job settles (done/failed) so the pool learns real outcomes. */
  recordSuccess(accountId: string): void {
    this.pool.recordSuccess(accountId)
  }

  recordFailure(accountId: string, error?: string): void {
    this.pool.recordFailure(accountId, error)
  }

  reset(id?: string, opts?: { usage?: boolean }): void {
    this.pool.reset(id, opts)
  }

  report() {
    return this.pool.report()
  }

  snapshot() {
    return this.pool.snapshot()
  }
}
