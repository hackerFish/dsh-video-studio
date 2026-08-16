// 提示词优化器（v1 确定性规则版）：草稿 → 追加质量增益与风格/画幅约束 → 专业级提示词。
// 自优化闭环入口：A/B 生成 → scorePrompt 评分 → 高分 boosters 组合沉淀（后续接 LLM 优化器时保持同接口）。
import { QUALITY_BOOSTERS, DEFAULT_BOOSTERS, GENERIC_NEGATIVE, templateNegative } from './templates.ts'

export interface OptimizeOptions {
  style?: string
  aspectRatio?: string
  boosters?: string[]
}

export interface OptimizeResult {
  optimized: string
  appliedBoosters: string[]
  negative: string[]
}

export function optimizePrompt(draft: string, opts: OptimizeOptions & { template?: string } = {}): OptimizeResult {
  const parts: string[] = [String(draft ?? '').trim()]
  const boosters = opts.boosters ?? [...DEFAULT_BOOSTERS]
  const applied: string[] = []
  for (const key of boosters) {
    const b = QUALITY_BOOSTERS[key]
    if (b) { parts.push(b); applied.push(key) }
  }
  if (opts.style && !parts[0].includes(opts.style)) parts.push(`风格：${opts.style}`)
  if (opts.aspectRatio) parts.push(opts.aspectRatio)
  const negative = opts.template ? templateNegative(opts.template) : [...GENERIC_NEGATIVE]
  return { optimized: parts.filter(Boolean).join('，'), appliedBoosters: applied, negative }
}
