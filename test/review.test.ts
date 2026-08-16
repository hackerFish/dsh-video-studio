import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { reviewShot, extractFrames, shouldRetry, shouldPromote, type Reviewer } from '../src/quality/review.ts'
import { runFfmpeg, locateFfmpeg } from '../src/finalcut/render-ffmpeg.ts'

const hasFfmpeg = locateFfmpeg() !== null

test('纯决策逻辑：≤2 重拍 / ≥4 晋升 / 无评审不自动重拍', () => {
  assert.equal(shouldRetry(2, 0, 2), true)
  assert.equal(shouldRetry(3, 0, 2), false)
  assert.equal(shouldRetry(2, 2, 2), false) // 重试次数用尽
  assert.equal(shouldRetry(null, 0, 2), false)
  assert.equal(shouldPromote(4), true)
  assert.equal(shouldPromote(3), false)
})

test('抽帧与规则检查（真实 ffmpeg）', { skip: !hasFfmpeg }, async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-review-'))
  try {
    const v = join(dir, 'v.mp4')
    await runFfmpeg(['-y', '-f', 'lavfi', '-i', 'color=c=0x1d5a9e:s=720x1280:d=3', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', v])
    const frames = await extractFrames(v, join(dir, 'frames'), 3)
    assert.equal(frames.length, 3)
    const r = await reviewShot({ videoPath: v, shotPrompt: '深海鲸鱼', workDir: join(dir, 'review') })
    assert.equal(r.score, null)
    assert.equal(r.ok, true)
    assert.match(r.note, /未接入/)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('评审驱动：2 分重拍、4 分晋升', { skip: !hasFfmpeg }, async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-review2-'))
  try {
    const v = join(dir, 'v.mp4')
    await runFfmpeg(['-y', '-f', 'lavfi', '-i', 'color=c=0x1d5a9e:s=720x1280:d=3', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', v])
    const reviewer: Reviewer = async ({ framePaths }) => ({ score: 2, issues: ['构图失衡', '光线过暗'] })
    const r = await reviewShot({ videoPath: v, shotPrompt: '深海鲸鱼', reviewer, workDir: join(dir, 'r1') })
    assert.equal(r.score, 2)
    assert.equal(r.retry, true)
    assert.ok(r.issues.length === 2)
    const reviewerGood: Reviewer = async () => ({ score: 4, issues: [] })
    const g = await reviewShot({ videoPath: v, shotPrompt: '深海鲸鱼', reviewer: reviewerGood, workDir: join(dir, 'r2') })
    assert.equal(g.promote, true)
    assert.equal(g.retry, false)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('文件缺失直接失败', async () => {
  const r = await reviewShot({ videoPath: '/nonexistent/x.mp4', shotPrompt: 'x', workDir: '/tmp/x' })
  assert.equal(r.ok, false)
  assert.equal(r.retry, true)
})
