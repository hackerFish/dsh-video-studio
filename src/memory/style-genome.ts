// Style genome (memory layer): style DNA, shot-template scoring evolution, retry feedback. Local JSON, zero deps.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

interface ShotTemplate {
  template: string
  weight: number
  uses: number
  promote?: boolean
  retry?: boolean
}

interface FeedbackEntry {
  at: string
  shotIndex: number
  decision: string
  reason: string
}

interface GenomeData {
  version: number
  styleDna: string
  shotTemplates: Record<string, ShotTemplate>
  feedback: FeedbackEntry[]
}

export interface StyleGenome {
  readonly styleDna: string
  setStyleDna(text: string): void
  recordTemplate(key: string, template: string): ShotTemplate
  bestTemplate(key: string): string
  scoreTemplate(key: string, score: number): ShotTemplate | null
  recordFeedback(f: { shotIndex: number; decision: string; reason?: string; at?: string }): void
  export(): GenomeData
}

const VERSION = 1

export function createStyleGenome(filePath: string): StyleGenome {
  let data: GenomeData = { version: VERSION, styleDna: '', shotTemplates: {}, feedback: [] }
  if (existsSync(filePath)) {
    try {
      const loaded = JSON.parse(readFileSync(filePath, 'utf8')) as Partial<GenomeData>
      data = { ...data, ...loaded, version: VERSION }
    } catch { /* corrupted file starts empty */ }
  }
  const save = (): void => { mkdirSync(dirname(filePath), { recursive: true }); writeFileSync(filePath, JSON.stringify(data, null, 2)) }
  return {
    get styleDna() { return data.styleDna },
    setStyleDna(text: string) { data.styleDna = String(text ?? ''); save() },
    recordTemplate(key: string, template: string) {
      const t: ShotTemplate = data.shotTemplates[key] ?? { template, weight: 1, uses: 0 }
      t.template = String(template ?? ''); t.uses += 1; data.shotTemplates[key] = t; save()
      return t
    },
    bestTemplate(key: string) { return data.shotTemplates[key]?.template ?? '' },
    scoreTemplate(key: string, score: number) {
      const t = data.shotTemplates[key]
      if (!t) return null
      const v = Number(score) || 3
      t.weight = (t.weight ?? 1) * (v / 3)
      t.promote = v >= 4; t.retry = v <= 2
      save(); return t
    },
    recordFeedback({ shotIndex, decision, reason = '', at = new Date().toISOString() }) {
      data.feedback.push({ at, shotIndex, decision, reason })
      if (data.feedback.length > 500) data.feedback = data.feedback.slice(-500)
      save()
    },
    export() { return JSON.parse(JSON.stringify(data)) as GenomeData },
  }
}
