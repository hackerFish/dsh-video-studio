// Provider interface & capability routing (thin abstraction: a new vendor = one adapter file).
export interface ProviderCapabilities {
  textToVideo?: boolean
  imageToVideo?: boolean
  firstLastFrame?: boolean
  lipSync?: boolean
  tts?: boolean
  image?: boolean
  maxDurationSec?: number
  resolutions?: string[]
  qualityTier?: number
  freeQuota?: boolean
  dailyQuota?: number
}

export interface ProviderQuote {
  qualityTier: number
  costEstimate: number
  currency: string
}

export interface ProviderStatus {
  state: 'running' | 'done' | 'failed' | 'unknown'
  progress: number | null
  error?: string
}

export interface ProviderSubmitResult {
  jobId: string
}

export interface ProviderFetchResult {
  outputs: string[]
  meta?: Record<string, unknown>
}

export interface ProviderHealth {
  ok: boolean
  quotaRemaining?: number | null
  [key: string]: unknown
}

export interface CreditEnsureResult {
  received: boolean
  remaining?: number | null
  note?: string
}

export interface Provider {
  id: string
  capabilities: ProviderCapabilities
  quote(stage: string, spec: Record<string, unknown>): Promise<ProviderQuote>
  submit(stage: string, spec: Record<string, unknown>): Promise<ProviderSubmitResult>
  status(jobId: string): Promise<ProviderStatus>
  fetch(jobId: string): Promise<ProviderFetchResult>
  health(): Promise<ProviderHealth>
  /** Best-effort free-credit top-up (optional; only free-quota providers implement it). */
  ensureCredits?(): Promise<CreditEnsureResult>
}

export function assertProvider<T extends Provider>(p: T): T {
  for (const m of ['id', 'capabilities', 'quote', 'submit', 'status', 'fetch', 'health'] as const) {
    if (typeof (p as unknown as Record<string, unknown>)[m] === 'undefined') {
      throw new Error(`provider ${p?.id ?? '?'} 缺少方法/字段: ${m}`)
    }
  }
  return p
}

export function route(providers: Provider[], need: ProviderCapabilities, preferCost = false): Provider | null {
  const ok = providers.filter((p) => Object.entries(need).every(([k, v]) => !v || p.capabilities[k as keyof ProviderCapabilities]))
  if (!ok.length) return null
  ok.sort((a, b) => {
    const ta = a.capabilities.qualityTier ?? 5
    const tb = b.capabilities.qualityTier ?? 5
    return preferCost ? ta - tb : tb - ta
  })
  return ok[0] ?? null
}
