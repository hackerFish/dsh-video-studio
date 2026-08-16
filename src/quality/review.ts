// 质检重拍循环（导演喊卡）：抽帧 → 规则检查 → 评审（可选注入）→ ≤2 分建议重拍。
// LLM 评审通过注入的 reviewer 回调接入（DSH 会话模型/未来视觉模型），无 reviewer 时如实标注。
import { existsSync, mkdirSync } from 'node:fs'
import { runFfmpeg, probeDurationSec } from '../finalcut/render-ffmpeg.ts'

export interface ReviewCheck {
  item: string
  status: 'pass' | 'fail'
  detail: string
}

export interface FrameReviewVerdict {
  /** 1-5：1-2 重拍，3 可接受，4-5 晋升模板库 */
  score: number
  issues: string[]
}

export type Reviewer = (opts: { framePaths: string[]; shotPrompt: string }) => Promise<FrameReviewVerdict>

export interface ReviewInput {
  videoPath: string
  shotPrompt: string
  reviewer?: Reviewer | null
  workDir: string
  frameCount?: number
}

export interface ReviewResult {
  ok: boolean
  score: number | null
  checks: ReviewCheck[]
  issues: string[]
  framePaths: string[]
  retry: boolean
  promote: boolean
  note: string
}

export function shouldRetry(score: number | null, attempts: number, maxRetries: number): boolean {
  if (score === null) return false // 无评审 → 不自动重拍（规则层单独判定）
  return score <= 2 && attempts < maxRetries
}

export function shouldPromote(score: number | null): boolean {
  return score !== null && score >= 4
}

/** 从视频中提取均匀分布的静帧（25%/50%/75% 时间点），供评审/抽帧检查。 */
export async function extractFrames(videoPath: string, outDir: string, frameCount = 3): Promise<string[]> {
  mkdirSync(outDir, { recursive: true })
  const dur = await probeDurationSec(videoPath)
  const paths: string[] = []
  for (let i = 0; i < frameCount; i++) {
    const t = (dur * (i + 1)) / (frameCount + 1)
    const out = `${outDir}/frame-${i}.jpg`
    await runFfmpeg(['-y', '-ss', t.toFixed(2), '-i', videoPath, '-frames:v', '1', '-q:v', '3', out])
    paths.push(out)
  }
  return paths.filter((p) => existsSync(p))
}

export async function reviewShot({ videoPath, shotPrompt, reviewer = null, workDir, frameCount = 3 }: ReviewInput): Promise<ReviewResult> {
  const checks: ReviewCheck[] = []
  if (!existsSync(videoPath)) {
    return { ok: false, score: null, checks: [{ item: '文件存在', status: 'fail', detail: videoPath }], issues: [], framePaths: [], retry: true, promote: false, note: 'LLM 评审未执行（文件缺失）' }
  }
  checks.push({ item: '文件存在', status: 'pass', detail: videoPath })
  let dur = 0
  try {
    dur = await probeDurationSec(videoPath)
    checks.push({ item: '时长', status: dur >= 0.5 ? 'pass' : 'fail', detail: `${dur.toFixed(1)}s` })
  } catch (e) {
    checks.push({ item: '时长', status: 'fail', detail: String(e instanceof Error ? e.message : e).slice(0, 80) })
  }
  let framePaths: string[] = []
  try {
    framePaths = await extractFrames(videoPath, workDir, frameCount)
    checks.push({ item: '抽帧', status: framePaths.length >= 2 ? 'pass' : 'fail', detail: `${framePaths.length}/${frameCount} 帧` })
  } catch (e) {
    checks.push({ item: '抽帧', status: 'fail', detail: String(e instanceof Error ? e.message : e).slice(0, 80) })
  }
  const rulesOk = checks.every((c) => c.status === 'pass')
  if (!reviewer) {
    return { ok: rulesOk, score: null, checks, issues: [], framePaths, retry: !rulesOk, promote: false, note: '规则层检查完成；LLM 抽帧评审未接入（注入 reviewer 后自动重拍）' }
  }
  const verdict = await reviewer({ framePaths, shotPrompt })
  const score = Math.max(1, Math.min(5, Number(verdict.score) || 3))
  const issues = (verdict.issues ?? []).map(String)
  return {
    ok: rulesOk && score >= 3,
    score,
    checks,
    issues,
    framePaths,
    retry: !rulesOk || score <= 2,
    promote: score >= 4,
    note: score <= 2 ? '评审判定重拍' : score >= 4 ? '评审判定晋升模板库' : '评审判定可接受',
  }
}
