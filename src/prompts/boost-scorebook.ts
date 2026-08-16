// 增益评分簿：按风格记录每项提示词增益的得分历史，推荐高分组合——评分回写闭环的核心。
// 与风格基因（模板评分）互补：这里管"哪些增益词有效"，那边管"哪个模板好"。
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DEFAULT_BOOSTERS } from './templates.ts'

interface BoosterStat {
  uses: number
  scoreSum: number
}

interface StyleStats {
  [boosterKey: string]: BoosterStat
}

interface ScorebookData {
  version: number
  styles: Record<string, StyleStats>
}

const VERSION = 1
const WARM_THRESHOLD = 3 // 每项增益至少被评 3 次才视为"有数据"

export interface BoosterScorebook {
  recordOutcome(styleKey: string, boosters: string[], score: number, source?: string): void
  recommend(styleKey: string, opts?: { maxBoosters?: number }): string[]
  stats(styleKey: string): { booster: string; uses: number; avg: number }[]
  export(): ScorebookData
}

export function createBoosterScorebook(filePath?: string): BoosterScorebook {
  let data: ScorebookData = { version: VERSION, styles: {} }
  const save = (): void => {
    if (!filePath) return
    mkdirSync(dirname(filePath), { recursive: true })
    writeFileSync(filePath, JSON.stringify(data, null, 2))
  }
  if (filePath && existsSync(filePath)) {
    try {
      const loaded = JSON.parse(readFileSync(filePath, 'utf8')) as Partial<ScorebookData>
      data = { version: VERSION, styles: loaded.styles ?? {} }
    } catch { /* 损坏从空开始 */ }
  }
  return {
    recordOutcome(styleKey, boosters, score, source = 'review') {
      const key = styleKey || 'default'
      const st = data.styles[key] ??= {}
      const v = Number(score) || 3
      for (const b of boosters) {
        const s = st[b] ??= { uses: 0, scoreSum: 0 }
        s.uses += 1
        s.scoreSum += v
      }
      save()
    },
    recommend(styleKey, opts = {}) {
      const key = styleKey || 'default'
      const st = data.styles[key]
      const max = opts.maxBoosters ?? 4
      // 冷启动：数据不足用默认组合
      if (!st || Object.values(st).every((s) => s.uses < WARM_THRESHOLD)) {
        return [...DEFAULT_BOOSTERS].slice(0, max)
      }
      // 热数据：按平均分排序，但只推荐"表现不差"的（avg >= 3），不足则补默认
      const ranked = Object.entries(st)
        .filter(([, s]) => s.uses >= WARM_THRESHOLD)
        .map(([k, s]) => ({ k, avg: s.scoreSum / s.uses }))
        .sort((a, b) => b.avg - a.avg)
      const picks = ranked.filter((r) => r.avg >= 3).map((r) => r.k).slice(0, max)
      const known = st
      for (const d of DEFAULT_BOOSTERS) {
        if (picks.length >= max) break
        // 已知低分（avg<3）的默认项不再补位——否则把淘汰的又加回来
        const s = known[d]
        if (s && s.uses >= WARM_THRESHOLD && s.scoreSum / s.uses < 3) continue
        if (!picks.includes(d)) picks.push(d)
      }
      return picks
    },
    stats(styleKey) {
      const st = data.styles[styleKey || 'default'] ?? {}
      return Object.entries(st).map(([booster, s]) => ({ booster, uses: s.uses, avg: s.scoreSum / s.uses }))
    },
    export() { return JSON.parse(JSON.stringify(data)) as ScorebookData },
  }
}
