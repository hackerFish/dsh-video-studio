// Four-layer prompt merging + scoring self-optimization (pure logic).
export interface PromptLayers {
  dna?: string
  shotTemplate?: string
  manual?: string
  injections?: string
}

export interface MergedPrompt {
  positive: string
  negative: string
}

export function mergePromptLayers({ dna = '', shotTemplate = '', manual = '', injections = '' }: PromptLayers = {}): MergedPrompt {
  const parts = [dna, shotTemplate, manual].map((s) => String(s ?? '').trim()).filter(Boolean)
  return { positive: parts.join('，'), negative: String(injections ?? '').trim() }
}

export function applyVariables(template: string, vars: Record<string, string | number> = {}): string {
  return String(template ?? '').replace(/\{\{(\w+)\}\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m))
}

export interface ScoredPromptEntry {
  weight?: number
  lastScore?: number
  promote?: boolean
  retry?: boolean
  [key: string]: unknown
}

export type ScoredPromptResult<T> = T & { weight: number; lastScore: number; promote: boolean; retry: boolean }

export function scorePrompt<T extends ScoredPromptEntry>(entry: T, score: number): ScoredPromptResult<T> {
  const w = entry.weight ?? 1
  const v = Number(score) || 3
  return { ...entry, weight: w * (v / 3), lastScore: v, promote: v >= 4, retry: v <= 2 }
}
