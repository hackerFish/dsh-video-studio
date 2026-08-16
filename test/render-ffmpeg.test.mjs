import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, existsSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createTimeline, addClip, addSubtitle, addAudio, totalDurationUs } from '../src/finalcut/timeline.ts'
import { locateFfmpeg, runFfmpeg, probeDurationSec, renderTimeline } from '../src/finalcut/render-ffmpeg.js'

const hasFfmpeg = locateFfmpeg() !== null

test('ffmpeg 可用（本机已捆绑静态版）', () => {
  assert.ok(hasFfmpeg, '未找到 ffmpeg 二进制')
})

test('端到端：合成素材 → 时间线 → 字幕 → 混音 → 成片', { skip: !hasFfmpeg }, async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-render-'))
  try {
    // 用 ffmpeg 自己造两段合成素材（color + sine），证明"无 key 端到端"成立
    const a = join(dir, 'a.mp4'), b = join(dir, 'b.mp4'), bgm = join(dir, 'bgm.mp3')
    await runFfmpeg(['-y', '-f', 'lavfi', '-i', 'color=c=red:s=1080x1920:d=2', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=2', '-shortest', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', a])
    await runFfmpeg(['-y', '-f', 'lavfi', '-i', 'color=c=blue:s=1080x1920:d=2', '-f', 'lavfi', '-i', 'sine=frequency=880:duration=2', '-shortest', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', b])
    await runFfmpeg(['-y', '-f', 'lavfi', '-i', 'sine=frequency=220:duration=4', bgm])

    const tl = createTimeline({ width: 1080, height: 1920 })
    addClip(tl, { src: a, durationUs: 2_000_000 })
    addClip(tl, { src: b, durationUs: 2_000_000 })
    addSubtitle(tl, { text: 'Hello Cut', startUs: 300_000, durationUs: 1_500_000 })
    addAudio(tl, { src: bgm, startUs: 0, durationUs: 4_000_000, volume: 0.5 })

    const out = join(dir, 'final.mp4')
    const progress = []
    const r = await renderTimeline({ timeline: tl, outPath: out, subtitles: true, onProgress: (s, i, n) => progress.push([s, i, n]) })

    assert.ok(existsSync(out), '成片未生成')
    assert.ok(statSync(out).size > 10_000, `成片过小: ${statSync(out).size}`)  // 纯色合成素材压缩率极高，40KB 属正常
    const dur = await probeDurationSec(out)
    assert.ok(Math.abs(dur - 4) < 0.6, `时长不符: ${dur}`)
    assert.equal(progress.length, 3) // 2 次 normalize + 1 次 render
    assert.equal(r.ffmpeg, locateFfmpeg())
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
