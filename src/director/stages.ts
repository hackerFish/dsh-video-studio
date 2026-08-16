// 行业公认七段工作流（2026 漫剧/AI 视频标准管线）：
// 豆包等 LLM 写故事 → 拆剧本 → 出分镜；MJ 出资产主图；图像模型出资产图；Seedance 出视频；剪映成片。
export type GateMode = 'auto' | 'ask' | 'manual'

export interface Stage {
  id: string
  name: string
  gate: GateMode
}

export const STAGES: Stage[] = [
  { id: 'story', name: '故事（LLM 写小说）', gate: 'auto' },
  { id: 'script', name: '剧本（LLM 拆剧）', gate: 'auto' },
  { id: 'storyboard', name: '分镜（LLM 出分镜）', gate: 'auto' },
  { id: 'master-asset', name: '资产主图（MJ 等出主视觉）', gate: 'auto' },
  { id: 'shot-assets', name: '资产图（图像模型出变体）', gate: 'auto' },
  { id: 'video', name: '视频（Seedance/即梦/可灵）', gate: 'auto' },
  { id: 'final-cut', name: '成片（剪映草稿/ffmpeg）', gate: 'auto' },
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
