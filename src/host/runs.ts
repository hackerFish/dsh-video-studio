// 运行注册表（内存）：记录每次生成任务的六段事件流，供工作台 UI 轮询展示。
export interface RunEvent {
  stage: string
  type: string
  detail: unknown
  at: string
}

export type RunStatus = 'running' | 'done' | 'failed'

export interface RunRecord {
  id: string
  prompt: string
  provider: string
  createdAt: string
  status: RunStatus
  events: RunEvent[]
}

export const WHALE_STAGES = ['story', 'script', 'storyboard', 'master-asset', 'shot-assets', 'video', 'final-cut'] as const

const runs = new Map<string, RunRecord>()
const MAX_RUNS = 20

export function createRun(opts: { prompt: string; provider: string }): RunRecord {
  const rec: RunRecord = {
    id: `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    prompt: opts.prompt,
    provider: opts.provider,
    createdAt: new Date().toISOString(),
    status: 'running',
    events: [],
  }
  runs.set(rec.id, rec)
  if (runs.size > MAX_RUNS) {
    const oldest = runs.keys().next().value
    if (oldest) runs.delete(oldest)
  }
  return rec
}

export function appendEvent(runId: string, stage: string, type: string, detail: unknown = null): void {
  const rec = runs.get(runId)
  if (!rec) return
  rec.events.push({ stage, type, detail, at: new Date().toISOString() })
}

export function finishRun(runId: string, status: RunStatus): void {
  const rec = runs.get(runId)
  if (rec) rec.status = status
}

export function listRuns(): RunRecord[] {
  return [...runs.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function getRun(id: string): RunRecord | undefined {
  return runs.get(id)
}
