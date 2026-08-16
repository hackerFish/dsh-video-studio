// Six-stage director pipeline registry. Each stage has a gate: auto / ask / manual (runtime-switchable).
export type GateMode = 'auto' | 'ask' | 'manual'

export interface Stage {
  id: string
  name: string
  gate: GateMode
}

export const STAGES: Stage[] = [
  { id: 'parse', name: '解析（角色/场景/剧情）', gate: 'auto' },
  { id: 'storyboard', name: '剧本与分镜', gate: 'auto' },
  { id: 'stills', name: '一致性静帧', gate: 'auto' },
  { id: 'video', name: '视频生成', gate: 'auto' },
  { id: 'voice', name: '配音与口型', gate: 'auto' },
  { id: 'final-cut', name: '终剪（字幕/BGM/成片）', gate: 'auto' },
]

export function setGate(stages: Stage[], id: string, mode: GateMode): Stage[] {
  if (!['auto', 'ask', 'manual'].includes(mode)) throw new Error(`非法 gate: ${mode}`)
  const st = stages.find((s) => s.id === id)
  if (!st) throw new Error(`未知阶段: ${id}`)
  return stages.map((s) => (s.id === id ? { ...s, gate: mode } : s))
}

export function gatesOf(stages: Stage[]): Record<string, GateMode> {
  return Object.fromEntries(stages.map((s) => [s.id, s.gate])) as Record<string, GateMode>
}
